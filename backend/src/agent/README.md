# Ardab Market — Central Backend Agent Module (Phase 2 Blueprint)

This directory hosts the dedicated backend module for the **Ardab Market Agent Mobile Application**.

## Architecture & Integration Boundaries

1. **Central Server Integration**:
   - Integrates directly into `backend/src/app.js` under the prefix `/api/agent`.
   - Uses the existing Node.js, Express, PostgreSQL database, and Prisma ORM schemas (`Agent`, `AgentCustomerIntegration`, `AgentCustomerIntegrationRequest`, `AgentCommission`, `Order`, `Customer`).
   - Uses the existing email notification service (`backend/src/shared/services/emailService.js` or `notificationService.js`).

2. **No Self-Registration**:
   - Agents are pre-created exclusively by the Super Admin in the Super Admin Portal.
   - First-time activation verifies the registered email with an OTP and sets their initial password.

3. **Strict Authorization**:
   - Every request is guarded by `authenticateAgentToken` middleware.
   - All queries filter strictly by `agentId = req.agent.id`. No agent can inspect other agents' data or customers.

4. **Endpoint Reference**:
   - See `contracts.js` for the agreed route catalog.

