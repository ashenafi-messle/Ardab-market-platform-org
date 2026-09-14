// ==============================================================================
// Ardab Market - Standard Pagination Utility
// ==============================================================================

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/**
 * Parses and sanitizes pagination options from request query.
 * Prevents clients from requesting unbounded result sets.
 *
 * @param {Object} query - Express req.query
 * @param {Object} options - Override defaults
 * @returns {{ page: number, pageSize: number, skip: number, take: number, formatMeta: Function }}
 */
export function getPaginationParams(query = {}, options = {}) {
  const defaultPageSize = options.defaultPageSize || DEFAULT_PAGE_SIZE;
  const maxPageSize = options.maxPageSize || MAX_PAGE_SIZE;

  let page = parseInt(query.page, 10);
  if (isNaN(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  let pageSize = parseInt(query.pageSize, 10);
  if (isNaN(pageSize) || pageSize < 1) {
    pageSize = defaultPageSize;
  } else if (pageSize > maxPageSize) {
    pageSize = maxPageSize;
  }

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return {
    page,
    pageSize,
    skip,
    take,
    formatMeta: (total) => {
      const validTotal = Math.max(0, total || 0);
      const totalPages = Math.ceil(validTotal / pageSize) || 1;
      return {
        page,
        pageSize,
        total: validTotal,
        totalPages,
      };
    },
  };
}
