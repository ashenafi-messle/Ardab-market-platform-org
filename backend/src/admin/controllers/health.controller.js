// ==============================================================================
// Ardab Market - Admin Health Controller
// ==============================================================================

import { checkSystemHealth } from '../services/health.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

export async function getHealth(req, res) {
  const result = await checkSystemHealth();

  if (!result.healthy) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'One or more platform dependencies are currently unavailable.',
      },
      data: result.data,
    });
  }

  return ApiResponse.success(res, result.data, 'Platform operational');
}

export function getLive(req, res) {
  return ApiResponse.success(res, { status: 'alive' }, 'Process is alive');
}

export async function getReady(req, res) {
  const result = await checkSystemHealth();
  if (!result.healthy) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'NOT_READY',
        message: 'Database is not yet ready to serve requests.',
      },
      data: { status: 'not_ready', database: result.data.database },
    });
  }
  return ApiResponse.success(res, { status: 'ready', database: 'connected' }, 'Platform is ready');
}
