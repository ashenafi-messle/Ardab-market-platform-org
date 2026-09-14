// ==============================================================================
// Ardab Market - Async Route Handler Wrapper
// ==============================================================================
// Eliminates boilerplate try/catch blocks in controllers.
// Unhandled errors are automatically forwarded to Express centralized error handler.

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
