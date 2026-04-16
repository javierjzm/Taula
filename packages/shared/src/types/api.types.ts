export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    nextCursor: string | null;
  };
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}
