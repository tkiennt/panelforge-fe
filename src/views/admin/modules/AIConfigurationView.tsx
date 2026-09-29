// src/views/admin/modules/AIConfigurationView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Key,
  CheckCircle2,
  Save,
  Sliders,
  Activity,
  Zap,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  Filter,
  RefreshCw,
  Search,
  Calendar,
  AlertTriangle,
  Clock,
  DollarSign,
  Layers,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import {
  adminService,
  AiUsageReportItemDto,
  AiUsageRecordDto,
  AiUsageRecordsFilterParams,
  downloadBlob,
} from '../../../services/admin.service';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái (All Statuses)' },
  { value: 'Succeeded', label: 'Succeeded (Thành công)' },
  { value: 'Failed', label: 'Failed (Thất bại)' },
  { value: 'QuotaExceeded', label: 'QuotaExceeded (Vượt hạn ngạch)' },
  { value: 'ProviderUnavailable', label: 'ProviderUnavailable (Nhà cung cấp lỗi)' },
  { value: 'Disabled', label: 'Disabled (Đã tắt)' },
];

export const AIConfigurationView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'credentials' | 'reports'>('credentials');

  // Credentials & Quota State
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('***********************************3A7b');
  const [claudeApiKey, setClaudeApiKey] = useState('***********************************8F12');
  const [openAiApiKey, setOpenAiApiKey] = useState('***********************************119C');

  const [allowedModels, setAllowedModels] = useState<string[]>([
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'claude-3-5-sonnet',
  ]);
  const [monthlyTokenQuota, setMonthlyTokenQuota] = useState('500000');

  // UC-15: Reports & Records State
  const [reports, setReports] = useState<AiUsageReportItemDto[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const [records, setRecords] = useState<AiUsageRecordDto[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Filters State
  const [filterFeature, setFilterFeature] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [dateError, setDateError] = useState<string | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const toggleModel = (model: string) => {
    if (allowedModels.includes(model)) {
      setAllowedModels(allowedModels.filter((m) => m !== model));
    } else {
      setAllowedModels([...allowedModels, model]);
    }
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    showToast('Đã lưu cấu hình AI Provider Credentials & Model Quotas!', 'success');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // UC-15: Build Filter Query
  const buildFilterParams = useCallback((): AiUsageRecordsFilterParams | null => {
    setDateError(null);
    let fromIso: string | undefined;
    let toIso: string | undefined;

    if (filterFrom) {
      fromIso = new Date(`${filterFrom}T00:00:00Z`).toISOString();
    }
    if (filterTo) {
      toIso = new Date(`${filterTo}T23:59:59Z`).toISOString();
    }

    if (fromIso && toIso && fromIso > toIso) {
      setDateError('Khoảng ngày không hợp lệ: Từ ngày phải trước hoặc bằng Đến ngày.');
      return null;
    }

    const params: AiUsageRecordsFilterParams = {
      page,
      pageSize,
    };

    if (filterFeature.trim()) params.feature = filterFeature.trim();
    if (filterStatus) params.status = filterStatus;
    if (fromIso) params.from = fromIso;
    if (toIso) params.to = toIso;

    return params;
  }, [page, pageSize, filterFeature, filterStatus, filterFrom, filterTo]);

  // Fetch Reports (UC-15)
  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      let fromIso: string | undefined;
      let toIso: string | undefined;
      if (filterFrom) fromIso = new Date(`${filterFrom}T00:00:00Z`).toISOString();
      if (filterTo) toIso = new Date(`${filterTo}T23:59:59Z`).toISOString();

      const data = await adminService.getAiUsage({ from: fromIso, to: toIso });
      setReports(data || []);
    } catch (err: any) {
      console.warn('Cannot fetch AI usage report:', err);
    } finally {
      setLoadingReports(false);
    }
  }, [filterFrom, filterTo]);

  // Fetch Records (UC-15)
  const fetchRecords = useCallback(async () => {
    const params = buildFilterParams();
    if (!params) return;

    setLoadingRecords(true);
    try {
      const res = await adminService.getAiUsageRecords(params);
      setRecords(res.items || []);
      setTotalRecords(res.totalCount || 0);
    } catch (err: any) {
      showToast(err.message || 'Không thể tải lịch sử gọi AI.', 'error');
    } finally {
      setLoadingRecords(false);
    }
  }, [buildFilterParams]);

  useEffect(() => {
    if (activeSubTab === 'reports') {
      fetchReports();
      fetchRecords();
    }
  }, [activeSubTab, fetchReports, fetchRecords]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReports();
    fetchRecords();
  };

  const handleResetFilter = () => {
    setFilterFeature('');
    setFilterStatus('');
    setFilterFrom('');
    setFilterTo('');
    setDateError(null);
    setPage(1);
  };

  const handleExportCsv = async () => {
    const params = buildFilterParams();
    if (!params) return;

    setExportingCsv(true);
    try {
      const result = await adminService.exportAiUsage(params);
      downloadBlob(result.blob, result.fileName);

      if (result.isTruncated) {
        showToast(
          `Đã tải file CSV (${result.rowCount.toLocaleString()} bản ghi). Chú ý: Dữ liệu đã bị giới hạn ở 10.000 dòng mới nhất (X-Export-Truncated).`,
          'warning',
        );
      } else {
        showToast(
          `Đã xuất thành công ${result.rowCount.toLocaleString()} bản ghi AI usage vào file ${result.fileName}!`,
          'success',
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xuất CSV AI Usage.', 'error');
    } finally {
      setExportingCsv(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  const renderStatusBadge = (st: string) => {
    switch (st) {
      case 'Succeeded':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200'>
            Succeeded
          </span>
        );
      case 'Failed':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-red-700 border border-red-200'>
            Failed
          </span>
        );
      case 'QuotaExceeded':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200'>
            QuotaExceeded
          </span>
        );
      case 'ProviderUnavailable':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200'>
            ProviderUnavailable
          </span>
        );
      case 'Disabled':
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 text-neutral-600 border border-neutral-200'>
            Disabled
          </span>
        );
      default:
        return (
          <span className='px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 text-neutral-700 border border-neutral-200'>
            {st || 'Unknown'}
          </span>
        );
    }
  };

  return (
    <div className='space-y-6 max-w-6xl'>
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-xs font-semibold animate-in slide-in-from-top-2 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className='w-4 h-4 text-emerald-600' />}
          {toast.type === 'warning' && <AlertCircle className='w-4 h-4 text-amber-600' />}
          {toast.type === 'error' && <AlertTriangle className='w-4 h-4 text-red-600' />}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className='ml-2 text-neutral-400 hover:text-neutral-700'
          >
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      )}

      {/* Header with Sub-tabs */}
      <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
                AI ENGINE // ENTERPRISE
              </span>
              <span className='text-xs text-[#888888] font-mono'>UC-02 &amp; UC-15 Management</span>
            </div>
            <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
              Quản Trị AI Engine, Quotas &amp; Báo Cáo Tiêu Thụ
            </h1>
            <p className='text-xs text-[#737373] mt-1'>
              Quản lý API Key nhà cung cấp (Gemini, Claude, OpenAI), phân bổ hạn ngạch token và báo
              cáo chi phí gọi AI chi tiết (UC-15).
            </p>
          </div>

          {/* Sub-tab Navigation */}
          <div className='flex items-center bg-[#FAF8F5] p-1 rounded-xl border border-[#E7E7E7] self-start sm:self-auto'>
            <button
              onClick={() => setActiveSubTab('credentials')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'credentials'
                  ? 'bg-white text-[#171717] shadow-xs border border-[#E7E7E7]'
                  : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              Cấu Hình &amp; Quotas
            </button>
            <button
              onClick={() => setActiveSubTab('reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'reports'
                  ? 'bg-white text-[#F97316] shadow-xs border border-[#E7E7E7]'
                  : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              <Activity className='w-3.5 h-3.5' />
              <span>Báo Cáo &amp; Lịch Sử (UC-15)</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: Credentials & Allowed Models */}
      {activeSubTab === 'credentials' && (
        <form onSubmit={handleSaveCredentials} className='space-y-6'>
          {/* API Credentials */}
          <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
            <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2'>
              <Key className='w-4 h-4 text-[#F97316]' />
              <span>AI Provider API Key Credentials</span>
            </h3>

            <div className='space-y-4 text-xs'>
              <div>
                <label className='block font-bold text-[#171717] mb-1.5 flex items-center justify-between'>
                  <span>Google Gemini API Key (Default Engine)</span>
                  <span className='text-emerald-600 font-mono text-[10px] font-bold'>
                    Connected
                  </span>
                </label>
                <Input
                  type='password'
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className='h-9 font-mono text-xs'
                />
              </div>

              <div>
                <label className='block font-bold text-[#171717] mb-1.5 flex items-center justify-between'>
                  <span>Anthropic Claude API Key (Script &amp; Dialogue Specialist)</span>
                  <span className='text-emerald-600 font-mono text-[10px] font-bold'>
                    Connected
                  </span>
                </label>
                <Input
                  type='password'
                  value={claudeApiKey}
                  onChange={(e) => setClaudeApiKey(e.target.value)}
                  className='h-9 font-mono text-xs'
                />
              </div>

              <div>
                <label className='block font-bold text-[#171717] mb-1.5 flex items-center justify-between'>
                  <span>OpenAI API Key (Secondary Fallback)</span>
                  <span className='text-emerald-600 font-mono text-[10px] font-bold'>
                    Connected
                  </span>
                </label>
                <Input
                  type='password'
                  value={openAiApiKey}
                  onChange={(e) => setOpenAiApiKey(e.target.value)}
                  className='h-9 font-mono text-xs'
                />
              </div>
            </div>
          </div>

          {/* Allowed Models & Token Quotas */}
          <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
            <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2'>
              <Sliders className='w-4 h-4 text-[#F97316]' />
              <span>Cho Phép Sử Dụng Model &amp; Hạn Ngạch Quota</span>
            </h3>

            <div className='space-y-4 text-xs'>
              <div>
                <label className='block font-bold text-[#171717] mb-2'>
                  Danh sách Model được phép kích hoạt trong Studio:
                </label>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5'>
                  {[
                    {
                      id: 'gemini-1.5-pro',
                      name: 'Gemini 1.5 Pro',
                      desc: 'Series Bible Grounding',
                    },
                    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Fast Panel OCR' },
                    {
                      id: 'claude-3-5-sonnet',
                      name: 'Claude 3.5 Sonnet',
                      desc: 'Script Dialogue Writer',
                    },
                    { id: 'gpt-4o', name: 'GPT-4o', desc: 'Multi-modal Vision' },
                  ].map((m) => {
                    const checked = allowedModels.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleModel(m.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          checked
                            ? 'border-[#F97316] bg-[#FFF7ED] text-[#171717]'
                            : 'border-[#E7E7E7] bg-[#FAF8F5] text-[#555555]'
                        }`}
                      >
                        <div className='flex items-center justify-between'>
                          <span className='font-bold text-xs'>{m.name}</span>
                          <input
                            type='checkbox'
                            checked={checked}
                            readOnly
                            className='accent-[#F97316]'
                          />
                        </div>
                        <div className='text-[10px] text-[#737373] mt-1'>{m.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className='block font-bold text-[#171717] mb-1.5'>
                  Hạn ngạch Token mặc định tháng (Monthly Workspace Token Quota):
                </label>
                <Input
                  type='number'
                  value={monthlyTokenQuota}
                  onChange={(e) => setMonthlyTokenQuota(e.target.value)}
                  className='h-9 font-mono text-xs max-w-xs'
                />
              </div>
            </div>
          </div>

          <div className='flex justify-end'>
            <Button
              type='submit'
              className='bg-[#F97316] hover:bg-[#EA580C] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md cursor-pointer'
            >
              <Save className='w-4 h-4 mr-1.5' /> Lưu Cấu Hình AI
            </Button>
          </div>
        </form>
      )}

      {/* TAB 2: UC-15 AI Usage Reports & Call Records */}
      {activeSubTab === 'reports' && (
        <div className='space-y-6'>
          {/* Summary Cards */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            <div className='bg-white p-5 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-1'>
              <div className='text-[11px] font-mono text-[#737373] uppercase'>
                Tổng Cuộc Gọi AI (Calls)
              </div>
              <div className='text-2xl font-bold font-serif text-[#171717]'>
                {reports.reduce((acc, r) => acc + (r.callCount || 0), 0).toLocaleString()}
              </div>
              <div className='text-[10px] font-mono text-emerald-600 font-semibold'>
                {reports.reduce((acc, r) => acc + (r.succeededCount || 0), 0).toLocaleString()}{' '}
                Thành công
              </div>
            </div>

            <div className='bg-white p-5 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-1'>
              <div className='text-[11px] font-mono text-[#737373] uppercase'>
                Tổng Tokens Đã Dùng
              </div>
              <div className='text-2xl font-bold font-serif text-[#171717]'>
                {reports.reduce((acc, r) => acc + (r.totalTokens || 0), 0).toLocaleString()}
              </div>
              <div className='text-[10px] font-mono text-[#737373]'>
                Hạn ngạch tháng:{' '}
                {reports.reduce((acc, r) => acc + (r.monthlyTokenQuota || 0), 0).toLocaleString()}
              </div>
            </div>

            <div className='bg-white p-5 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-1'>
              <div className='text-[11px] font-mono text-[#737373] uppercase'>
                Chi Phí Ước Tính (USD)
              </div>
              <div className='text-2xl font-bold font-serif text-[#171717] flex items-center'>
                <DollarSign className='w-5 h-5 text-[#059669]' />
                <span>{reports.reduce((acc, r) => acc + (r.totalCostUsd || 0), 0).toFixed(4)}</span>
              </div>
              <div className='text-[10px] font-mono text-[#888888]'>Theo giá nhà cung cấp</div>
            </div>

            <div className='bg-white p-5 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-1'>
              <div className='text-[11px] font-mono text-[#737373] uppercase'>
                Tỷ Lệ Bị Chặn (Blocked)
              </div>
              <div className='text-2xl font-bold font-serif text-amber-600'>
                {reports.reduce((acc, r) => acc + (r.blockedCount || 0), 0).toLocaleString()}
              </div>
              <div className='text-[10px] font-mono text-red-500'>
                {reports.reduce((acc, r) => acc + (r.failedCount || 0), 0).toLocaleString()} Lỗi
              </div>
            </div>
          </div>

          {/* UC-15 Query Filter Toolbar */}
          <form
            onSubmit={handleApplyFilter}
            className='bg-white p-5 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'
          >
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <div className='flex items-center gap-2 text-xs font-bold text-[#171717]'>
                <Filter className='w-4 h-4 text-[#F97316]' />
                <span>Bộ Lọc Lịch Sử Gọi AI (AI Usage Records Query)</span>
              </div>
              <div className='flex items-center gap-3'>
                <button
                  type='button'
                  onClick={handleResetFilter}
                  className='text-[11px] text-[#737373] hover:text-[#171717] font-medium'
                >
                  Xóa bộ lọc
                </button>
                <button
                  type='button'
                  onClick={handleExportCsv}
                  disabled={exportingCsv || loadingRecords}
                  className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171717] hover:bg-black text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50'
                  title='Xuất tối đa 10.000 dòng có Bearer Auth'
                >
                  <Download className='w-3.5 h-3.5 text-[#F97316]' />
                  <span>{exportingCsv ? 'Đang xuất...' : 'Xuất CSV (UC-15)'}</span>
                </button>
              </div>
            </div>

            {dateError && (
              <div className='p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2'>
                <AlertCircle className='w-4 h-4 text-red-600 shrink-0' />
                <span>{dateError}</span>
              </div>
            )}

            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs'>
              {/* Feature */}
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Tính năng (Feature)
                </label>
                <input
                  type='text'
                  placeholder='vd: BibleGrounding, OCR'
                  value={filterFeature}
                  onChange={(e) => setFilterFeature(e.target.value)}
                  className='w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                />
              </div>

              {/* Status */}
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Trạng thái (Status)
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className='w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* From Date */}
              <div>
                <label className='block font-semibold text-[#171717] mb-1 flex items-center gap-1'>
                  <Calendar className='w-3 h-3 text-[#888888]' />
                  <span>Từ ngày (From UTC)</span>
                </label>
                <input
                  type='date'
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  className='w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                />
              </div>

              {/* To Date */}
              <div>
                <label className='block font-semibold text-[#171717] mb-1 flex items-center gap-1'>
                  <Calendar className='w-3 h-3 text-[#888888]' />
                  <span>Đến ngày (To UTC)</span>
                </label>
                <input
                  type='date'
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  className='w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                />
              </div>

              {/* Submit Filter */}
              <div className='flex items-end'>
                <button
                  type='submit'
                  className='w-full py-1.5 px-4 bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer'
                >
                  Lọc Lịch Sử
                </button>
              </div>
            </div>
          </form>

          {/* Records Table */}
          <div className='bg-white border border-[#E7E7E7] rounded-2xl shadow-xs overflow-hidden flex flex-col'>
            <div className='overflow-x-auto'>
              <table className='w-full text-left border-collapse'>
                <thead className='bg-[#FAF8F5] border-b border-[#E7E7E7] text-[11px] font-mono font-bold text-[#737373] uppercase tracking-wider'>
                  <tr>
                    <th className='py-3 px-4'>Thời Gian (UTC)</th>
                    <th className='py-3 px-4'>Tính Năng (Feature)</th>
                    <th className='py-3 px-4'>Provider / Model</th>
                    <th className='py-3 px-4'>Tokens (Prompt / Comp / Total)</th>
                    <th className='py-3 px-4'>Chi Phí (USD)</th>
                    <th className='py-3 px-4'>Thời Gian Xử Lý</th>
                    <th className='py-3 px-4'>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-[#E7E7E7] text-xs'>
                  {loadingRecords ? (
                    <tr>
                      <td colSpan={7} className='py-12 text-center text-[#888888]'>
                        <RefreshCw className='w-6 h-6 animate-spin text-[#F97316] mx-auto mb-2' />
                        <span>Đang tải danh sách lịch sử gọi AI...</span>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className='py-12 text-center text-[#888888] space-y-1'>
                        <Activity className='w-8 h-8 text-[#888888] mx-auto' />
                        <div className='font-bold text-[#171717]'>Chưa có bản ghi gọi AI nào</div>
                        <div className='text-[11px] text-[#737373]'>
                          Các tính năng gọi AI provider (CF3) sẽ tự động tích lũy số liệu vào đây.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    records.map((rec) => (
                      <tr key={rec.id} className='hover:bg-[#FAF8F5] transition-colors'>
                        <td className='py-3 px-4 font-mono text-[11px] whitespace-nowrap text-[#555555]'>
                          <div className='flex items-center gap-1.5 text-[#171717] font-semibold'>
                            <Clock className='w-3 h-3 text-[#F97316]' />
                            <span>{new Date(rec.occurredAtUtc).toLocaleTimeString('vi-VN')}</span>
                          </div>
                          <div className='text-[10px] text-[#888888]'>
                            {new Date(rec.occurredAtUtc).toLocaleDateString('vi-VN')}
                          </div>
                        </td>

                        <td className='py-3 px-4 font-semibold text-[#171717]'>
                          <div>{rec.feature}</div>
                          {rec.workspaceId && (
                            <span className='text-[10px] font-mono text-[#888888]'>
                              WS: {rec.workspaceId.substring(0, 8)}...
                            </span>
                          )}
                        </td>

                        <td className='py-3 px-4 font-mono text-[11px]'>
                          <div className='text-[#171717] font-bold'>{rec.provider}</div>
                          <div className='text-[10px] text-[#888888]'>
                            {rec.model || 'Standard'}
                          </div>
                        </td>

                        <td className='py-3 px-4 font-mono text-[11px]'>
                          <span className='font-bold text-[#171717]'>
                            {rec.totalTokens?.toLocaleString()}
                          </span>
                          <span className='text-[10px] text-[#888888] block'>
                            ({rec.promptTokens?.toLocaleString()} in /{' '}
                            {rec.completionTokens?.toLocaleString()} out)
                          </span>
                        </td>

                        <td className='py-3 px-4 font-mono text-[11px] text-[#059669] font-bold'>
                          {rec.costUsd ? `$${rec.costUsd.toFixed(5)}` : '$0.00'}
                        </td>

                        <td className='py-3 px-4 font-mono text-[11px] text-[#737373]'>
                          {rec.durationMs ? `${rec.durationMs}ms` : '—'}
                        </td>

                        <td className='py-3 px-4 whitespace-nowrap'>
                          {renderStatusBadge(rec.status)}
                          {rec.errorMessage && (
                            <div
                              className='text-[10px] text-red-600 truncate max-w-xs'
                              title={rec.errorMessage}
                            >
                              {rec.errorMessage}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className='p-4 bg-[#FAF8F5] border-t border-[#E7E7E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs'>
              <div className='text-[#737373] font-mono'>
                Hiển thị <span className='font-bold text-[#171717]'>{records.length}</span> / Tổng{' '}
                <span className='font-bold text-[#171717]'>{totalRecords.toLocaleString()}</span>{' '}
                bản ghi (Trang {page} / {totalPages})
              </div>

              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loadingRecords}
                  className='p-1.5 rounded-lg border border-[#E7E7E7] bg-white text-[#171717] disabled:opacity-40 hover:bg-[#FAF8F5] transition-colors cursor-pointer'
                >
                  <ChevronLeft className='w-4 h-4' />
                </button>
                <span className='font-mono font-bold text-xs text-[#171717] px-2'>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loadingRecords}
                  className='p-1.5 rounded-lg border border-[#E7E7E7] bg-white text-[#171717] disabled:opacity-40 hover:bg-[#FAF8F5] transition-colors cursor-pointer'
                >
                  <ChevronRight className='w-4 h-4' />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
