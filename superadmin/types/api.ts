export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  city?: string;
  status?: string;
  category?: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  code?: string;
  retryAfterSeconds?: number;
}
