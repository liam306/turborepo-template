export type SupportedLocale = 'en' | 'vi';

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'vi'];

export type SortOrder = 'asc' | 'desc';

export interface IDateRange {
  startDate: string; // ISO 'YYYY-MM-DD'
  endDate: string; // ISO 'YYYY-MM-DD'
}

export interface ISelectOption<T = string> {
  label: string;
  value: T;
  icon?: string;
  description?: string;
}

export interface IPagination {
  page: number;
  pageSize: number;
  total: number;
}

// ==========================================
// Standard Unified API Request Query Types
// ==========================================

export interface IPaginationQuery {
  page?: number;
  limit?: number;
}

export interface ISortQuery {
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface IDateRangeQuery {
  startDate?: string;
  endDate?: string;
}

export interface IBaseListingQuery
  extends IPaginationQuery, ISortQuery, IDateRangeQuery {
  search?: string;
}

// ==========================================
// Standard Unified API Response Envelope Types
// ==========================================

export interface IApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
}

export interface IPaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export type IPaginationMeta = IPaginatedMeta;

export interface IPaginatedResult<T = unknown> {
  data: T[];
  meta: IPaginationMeta;
}

export interface IMessageResponse {
  message: string;
}

export interface ISuccessResponse {
  success: boolean;
}

export interface IActionSuccessResponse {
  success: boolean;
  message: string;
}

export interface IActionCountResponse {
  success: boolean;
  count: number;
  message: string;
}

export interface ICleanupResult {
  scanned?: number;
  deleted: number;
  message?: string;
}

export interface IPaginatedResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T[];
  pagination: IPaginatedMeta;
}

export interface IApiErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  errors?: Record<string, string[]> | string[];
  timestamp: string;
  path?: string;
  code?: string;
  limit?: number | null;
  remaining?: number | null;
  resetAt?: string | null;
}
