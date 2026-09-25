// ==============================================================================
// Ardab Market - Mobile Performance Monitor
// ==============================================================================
// Lightweight performance profiler to measure API request latencies,
// database/network roundtrips, and cache hit ratios during development.
// Automatically disabled or zero-overhead in production builds.
// ==============================================================================

const enabled = typeof __DEV__ !== 'undefined' && __DEV__;

interface TimingMetric {
  label: string;
  durationMs: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

const recentMetrics: TimingMetric[] = [];
const MAX_METRICS = 100;

export const perfMonitor = {
  /**
   * Starts a named timer and returns a stop function
   */
  startTimer(label: string, metadata?: Record<string, any>): (extraMeta?: Record<string, any>) => number {
    if (!enabled) return (_?: any) => 0;

    const start = Date.now();
    return (extraMeta?: Record<string, any>) => {
      const durationMs = Date.now() - start;
      const metric: TimingMetric = {
        label,
        durationMs,
        timestamp: Date.now(),
        metadata: { ...metadata, ...extraMeta },
      };

      recentMetrics.push(metric);
      if (recentMetrics.length > MAX_METRICS) {
        recentMetrics.shift();
      }

      const metaStr = metric.metadata ? ` | ${JSON.stringify(metric.metadata)}` : '';
      console.log(`[PERF] ⚡ ${label}: ${durationMs}ms${metaStr}`);
      return durationMs;
    };
  },

  /**
   * Measures async function execution duration
   */
  async measure<T>(label: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const stop = this.startTimer(label, metadata);
    try {
      const result = await fn();
      stop({ success: true });
      return result;
    } catch (err: any) {
      stop({ success: false, error: err?.message });
      throw err;
    }
  },

  /**
   * Returns recent recorded metrics
   */
  getMetrics(): TimingMetric[] {
    return [...recentMetrics];
  },

  /**
   * Clear recorded metrics
   */
  clear(): void {
    recentMetrics.length = 0;
  },
};
