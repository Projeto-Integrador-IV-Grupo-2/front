/** Formato de erro retornado pela API (ver GlobalExceptionHandler do backend). */
export interface ApiErrorResponse {
  message: string
  status?: number
}
