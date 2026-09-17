// ==============================================================================
// Ardab Market - Global Search Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { searchService } from '../services/search.service.js';

/**
 * GET /api/admin/search?q=<query>&types=orders,customers&limit=5
 * Federated global search across multiple entity types.
 */
export async function globalSearchHandler(req, res) {
  const query = (req.query.q || req.query.query || '').trim();
  const limit = req.query.limit;
  const types = req.query.types ? String(req.query.types).split(',').map((t) => t.trim()) : undefined;

  const results = await searchService.globalSearch(query, { limit, types });
  return ApiResponse.success(res, results, 'Search completed');
}
