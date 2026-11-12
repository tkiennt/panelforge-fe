// src/services/aiStream.service.ts
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

export interface TokenChunkEvent {
  runId: string;
  agent: string;
  stepIndex: number;
  deltaText: string;
  isFinal: boolean;
}

export interface StepRecordedEvent {
  runId: string;
  stepIndex: number;
  agent: string;
  round: number;
  succeeded: boolean;
  outputJson?: string;
  errorCode?: string;
  errorMessage?: string;
  runStatus: string;
}

export interface RunStatusChangedEvent {
  runId: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
}

class AiStreamService {
  private connection: HubConnection | null = null;
  private tokenHandlers = new Set<(event: TokenChunkEvent) => void>();
  private stepHandlers = new Set<(event: StepRecordedEvent) => void>();
  private statusHandlers = new Set<(event: RunStatusChangedEvent) => void>();
  private activeRuns = new Set<string>();
  private isConnecting = false;

  private getHubUrl(): string {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${apiBase.replace(/\/$/, '')}/hubs/ai-stream`;
  }

  public async connect(): Promise<HubConnection | null> {
    if (this.connection && this.connection.state === HubConnectionState.Connected) {
      return this.connection;
    }

    if (this.isConnecting) return null;
    this.isConnecting = true;

    try {
      const hubUrl = this.getHubUrl();
      const token = localStorage.getItem('token') || localStorage.getItem('pf_token');

      this.connection = new HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => token || '',
          withCredentials: true,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(LogLevel.Warning)
        .build();

      this.connection.on('TokenChunk', (data: TokenChunkEvent) => {
        this.tokenHandlers.forEach((handler) => handler(data));
      });

      this.connection.on('StepRecorded', (data: StepRecordedEvent) => {
        this.stepHandlers.forEach((handler) => handler(data));
      });

      this.connection.on('RunStatusChanged', (data: RunStatusChangedEvent) => {
        this.statusHandlers.forEach((handler) => handler(data));
      });

      this.connection.onreconnected(() => {
        // Re-join active runs upon reconnection
        this.activeRuns.forEach((runId) => {
          this.connection?.invoke('JoinRun', runId).catch(console.error);
        });
      });

      await this.connection.start();
      this.isConnecting = false;
      return this.connection;
    } catch (err) {
      this.isConnecting = false;
      console.warn(
        '[AiStreamService] Không thể kết nối SignalR Hub, chuyển sang cơ chế Polling an toàn:',
        err,
      );
      return null;
    }
  }

  public async joinRun(runId: string): Promise<void> {
    if (!runId) return;
    this.activeRuns.add(runId);
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      await this.connect();
    }
    if (this.connection && this.connection.state === HubConnectionState.Connected) {
      try {
        await this.connection.invoke('JoinRun', runId);
      } catch (err) {
        console.warn(`[AiStreamService] Lỗi khi JoinRun(${runId}):`, err);
      }
    }
  }

  public async leaveRun(runId: string): Promise<void> {
    if (!runId) return;
    this.activeRuns.delete(runId);
    if (this.connection && this.connection.state === HubConnectionState.Connected) {
      try {
        await this.connection.invoke('LeaveRun', runId);
      } catch {
        // ignore
      }
    }
  }

  public onTokenChunk(handler: (event: TokenChunkEvent) => void): () => void {
    this.tokenHandlers.add(handler);
    return () => this.tokenHandlers.delete(handler);
  }

  public onStepRecorded(handler: (event: StepRecordedEvent) => void): () => void {
    this.stepHandlers.add(handler);
    return () => this.stepHandlers.delete(handler);
  }

  public onRunStatusChanged(handler: (event: RunStatusChangedEvent) => void): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch {
        // ignore
      }
      this.connection = null;
    }
    this.activeRuns.clear();
  }
}

export const aiStreamService = new AiStreamService();
