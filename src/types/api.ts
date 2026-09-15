/** Erro de validação associado a um campo (ApiError.FieldValidationError da API). */
export interface ApiFieldError {
  field: string
  message: string
}

/** Formato de erro retornado pela API (ver GlobalExceptionHandler do backend). */
export interface ApiErrorResponse {
  message: string
  status?: number
  timestamp?: string
  error?: string
  path?: string
  fieldErrors?: ApiFieldError[]
}
