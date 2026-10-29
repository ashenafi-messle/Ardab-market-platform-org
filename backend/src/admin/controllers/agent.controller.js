// ==============================================================================
// Ardab Market - Super Admin Agent Management Controller
// ==============================================================================

import fs from 'fs';
import { ApiResponse, ApiError } from '../../shared/utils/apiResponse.js';
import { prisma } from '../../shared/config/database.js';
import { getPrivateDocumentPath } from '../../shared/services/agentDocument.service.js';
import {
  createAgent,
  updateAgent,
  listAgents,
  getAgentById,
  getAgentCustomers,
  getAgentOrders,
  getAgentCommissions,
  getAgentDashboardStats,
} from '../services/agent.service.js';

export async function createAgentHandler(req, res) {
  const agent = await createAgent(req.body, req.file, req.user);
  return ApiResponse.success(res, agent, 'Agent registered successfully.', 201);
}

export async function updateAgentHandler(req, res) {
  const agent = await updateAgent(req.params.id, req.body, req.file, req.user);
  return ApiResponse.success(res, agent, 'Agent profile updated successfully.');
}

export async function listAgentsHandler(req, res) {
  const result = await listAgents(req.query);
  return ApiResponse.paginated(
    res,
    result.agents,
    result.pagination,
    'Agents retrieved successfully.'
  );
}

export async function getAgentByIdHandler(req, res) {
  const agent = await getAgentById(req.params.id);
  return ApiResponse.success(res, agent, 'Agent details retrieved successfully.');
}

export async function getAgentCustomersHandler(req, res) {
  const result = await getAgentCustomers(req.params.id, req.query);
  return ApiResponse.paginated(
    res,
    result.customers,
    result.pagination,
    'Agent integrated customers retrieved.'
  );
}

export async function getAgentOrdersHandler(req, res) {
  const result = await getAgentOrders(req.params.id, req.query);
  return ApiResponse.paginated(
    res,
    result.orders,
    result.pagination,
    'Agent attributed orders retrieved.'
  );
}

export async function getAgentCommissionsHandler(req, res) {
  const result = await getAgentCommissions(req.params.id, req.query);
  return ApiResponse.paginated(
    res,
    result.commissions,
    result.pagination,
    'Agent commission ledger retrieved.'
  );
}

export async function getAgentDashboardStatsHandler(req, res) {
  const stats = await getAgentDashboardStats();
  return ApiResponse.success(res, stats, 'Agent management summary statistics retrieved.');
}

/**
 * Secure document retrieval: streams national ID ONLY to authenticated Super Admins
 */
export async function getAgentNationalIdHandler(req, res) {
  const agent = await prisma.agent.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      nationalIdKey: true,
      nationalIdOriginalName: true,
      nationalIdMimeType: true,
    },
  });

  if (!agent || !agent.nationalIdKey) {
    throw ApiError.notFound('National identity document not found for this agent.');
  }

  const filePath = getPrivateDocumentPath(agent.nationalIdKey);
  const mimeType = agent.nationalIdMimeType || 'application/octet-stream';

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${agent.nationalIdOriginalName || 'national_id'}"`
  );

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}
