/**
 * Body of every API error response. `code` is stable and machine-readable; `message` is a
 * sentence meant for people and is shown in the UI as-is.
 */
export interface ApiErrorBody {
  error: {
    /** Such as "not_found", "validation_failed" or "internal_error". */
    code: string;
    message: string;
    /** Extra context for troubleshooting, such as which field was invalid. */
    detail?: string;
  };
}
