// ==============================================================================
// Ardab Market - Agent Authorization Middleware
// ==============================================================================

import { AgentAuthService } from './agent.auth.service.js';
import { prisma } from '../shared/config/database.js';
import { ApiError } from '../shared/utils/apiResponse.js';

export async function requireAgentAuth(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next(ApiError.unauthorized('Agent authentication token required.', 'TOKEN_MISSING'));
  }

  try {
    const decoded = AgentAuthService.verifyAccessToken(token);

    // Verify against database that agent exists and is active
    const agent = await prisma.agent.findUnique({
      where: { id: decoded.id },
      include: { credentials: true },
    });

    if (!agent) {
      return next(ApiError.unauthorized('Agent account no longer exists.', 'AGENT_NOT_FOUND'));
    }

    if (agent.status !== 'ACTIVE') {
      return next(ApiError.forbidden('Your agent account is currently suspended or inactive.', 'ACCOUNT_SUSPENDED'));
    }

    if (!agent.credentials?.isActivated) {
      return next(ApiError.forbidden('Agent account has not been activated.', 'ACCOUNT_NOT_ACTIVATED'));
    }

    req.agent = {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      status: agent.status,
      commissionRate: Number(agent.commissionRate),
      commissionType: agent.commissionType,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

