// src/services/studioResources.service.ts
// D12: kho tài nguyên của Producer (dung lượng + token AI mua một lần), chia cho từng Studio mình sở hữu.
import axiosClient from '../api/axiosClient';
import { translate } from '@/lib/i18n';
import { WalletApiError } from './wallet.service';

export interface ResourceBudgetDto {
  total: number;
  allocated: number;
  remaining: number;
}

/** Phần một Studio được chia và đang dùng. Quota 0 = không giới hạn (Studio tạo trước khi có kho). */
export interface StudioAllocationDto {
  workspaceId: string;
  name: string;
  storageQuotaBytes: number;
  usedStorageBytes: number;
  tokenQuota: number;
  usedTokens: number;
}

/** GET /api/workspaces/resources. `hasPool` false: Producer cũ, Studio mới nhận hạn mức mặc định như trước. */
export interface StudioResourcesDto {
  hasPool: boolean;
  storage: ResourceBudgetDto | null;
  tokens: ResourceBudgetDto | null;
  studios: StudioAllocationDto[];
  suggestedStorageBytes: number;
  suggestedTokens: number;
  /** null = Admin chưa mở bán tài nguyên. */
  pricePerGbVnd: number | null;
  pricePerMillionTokensVnd: number | null;
}

export interface PurchaseStudioResourcesResponseDto {
  totalVnd: number;
  remainingBalanceVnd: number;
  orderCode: string;
  resources: StudioResourcesDto;
}

export const BYTES_PER_GB = 1024 ** 3;
export const TOKENS_PER_UNIT = 1_000_000;
export const STUDIO_RESOURCES_QUERY_KEY = ['studioResources'];
export const INSUFFICIENT_STUDIO_RESOURCES = 'INSUFFICIENT_STUDIO_RESOURCES';

function toError(error: any, fallbackKey: string): WalletApiError {
  const data = error?.response?.data;
  return new WalletApiError(
    data?.message || data?.error || translate(fallbackKey),
    error?.response?.status,
    data?.code,
  );
}

const normalize = (data: any): StudioResourcesDto => ({
  hasPool: !!data?.hasPool,
  storage: data?.storage ?? null,
  tokens: data?.tokens ?? null,
  studios: data?.studios ?? [],
  suggestedStorageBytes: data?.suggestedStorageBytes ?? 0,
  suggestedTokens: data?.suggestedTokens ?? 0,
  pricePerGbVnd: data?.pricePerGbVnd ?? null,
  pricePerMillionTokensVnd: data?.pricePerMillionTokensVnd ?? null,
});

export const studioResourcesService = {
  /** GET /api/workspaces/resources */
  getMine: async (): Promise<StudioResourcesDto> => {
    try {
      const { data } = await axiosClient.get('/workspaces/resources');
      return normalize(data);
    } catch (error) {
      throw toError(error, 'errors.services.studioResources.loadFailed');
    }
  },

  /** PUT /api/workspaces/{id}/resources — chỉ chủ Studio; 409 INSUFFICIENT_STUDIO_RESOURCES khi kho không đủ. */
  allocate: async (
    workspaceId: string,
    storageQuotaBytes: number,
    tokenQuota: number,
  ): Promise<StudioResourcesDto> => {
    try {
      const { data } = await axiosClient.put(
        `/workspaces/${encodeURIComponent(workspaceId)}/resources`,
        { storageQuotaBytes, tokenQuota },
      );
      return normalize(data);
    } catch (error) {
      throw toError(error, 'errors.services.studioResources.allocateFailed');
    }
  },

  /** POST /api/wallet/studio-resources — mua thêm bằng Ví; 409 PRICE_CHANGED khi Admin vừa đổi đơn giá. */
  purchase: async (params: {
    storageGb: number;
    tokenMillions: number;
    expectedTotalVnd: number;
  }): Promise<PurchaseStudioResourcesResponseDto> => {
    try {
      const { data } = await axiosClient.post('/wallet/studio-resources', params);
      return { ...data, resources: normalize(data?.resources) };
    } catch (error) {
      throw toError(error, 'errors.services.studioResources.purchaseFailed');
    }
  },
};
