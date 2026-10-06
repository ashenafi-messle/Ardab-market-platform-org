// ==============================================================================
// Ardab Market - Backend Performance Tracker (Development Instrumentation)
// ==============================================================================
// Measures execution times across HTTP controllers, Prisma queries, password
// verification, and third-party API calls.
// Completely zero-overhead in production.
// NEVER logs passwords, tokens, OTPs, or payment secrets.
// ==============================================================================

import { env } from '../config/env.js';

const isDev = env.IS_DEVELOPMENT || process.env.NODE_ENV !== 'production';

export class PerfTracker {
  constructor(operationName, metadata = {}) {
    this.operationName = operationName;
    this.metadata = metadata;
    this.startTime = Date.now();
    this.lastCheckpointTime = this.startTime;
    this.checkpoints = [];
  }

  /**
   * Records an intermediate milestone with the time elapsed since the last checkpoint
   */
  checkpoint(label) {
    if (!isDev) return;
    const now = Date.now();
    const duration = now - this.lastCheckpointTime;
    this.lastCheckpointTime = now;
    this.checkpoints.push({ label, durationMs: duration });
  }

  /**
   * Completes tracking and outputs structured [PERF][BACKEND] log
   */
  end(extraMeta = {}) {
    if (!isDev) return 0;
    const totalMs = Date.now() - this.startTime;
    const checkpointsStr =
      this.checkpoints.length > 0
        ? ' | ' + this.checkpoints.map((c) => `${c.label}=${c.durationMs}ms`).join(', ')
        : '';
    const safeMeta = { ...this.metadata, ...extraMeta };
    // Filter out any accidentally passed sensitive keys
    delete safeMeta.password;
    delete safeMeta.token;
    delete safeMeta.otp;
    delete safeMeta.secret;
    delete safeMeta.chapaKey;

    const metaStr =
      Object.keys(safeMeta).length > 0 ? ` | ${JSON.stringify(safeMeta)}` : '';

    console.log(
      `[PERF][BACKEND] ⚡ ${this.operationName} total=${totalMs}ms${checkpointsStr}${metaStr}`
    );
    return totalMs;
  }
}

export function startBackendPerf(operationName, metadata = {}) {
  return new PerfTracker(operationName, metadata);
}
