import { logger } from '@librechat/data-schemas';
import type { TelemetryClient } from 'applicationinsights';

export * from './events';

let client: TelemetryClient | null = null;

/**
 * Initialises Application Insights once from the
 * `APPLICATIONINSIGHTS_CONNECTION_STRING` environment variable.
 * Safe to call multiple times — subsequent calls are no-ops.
 *
 * Must be called **before** any route or controller is loaded so that the
 * OpenTelemetry auto-instrumentation hooks are in place when those modules
 * are first `require`'d.
 */
export function setupTelemetry(): void {
  if (client) {
    return;
  }

  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING?.trim();
  if (!connectionString) {
    return;
  }

  try {
    // Dynamic require so that the module is only loaded when the feature is enabled,
    // keeping startup cost zero for deployments that don't use Application Insights.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appInsights = require('applicationinsights') as typeof import('applicationinsights');

    appInsights
      .setup(connectionString)
      /** Track all incoming HTTP requests automatically. */
      .setAutoCollectRequests(true)
      /** Track dependency calls (HTTP, SQL, Redis, …). */
      .setAutoCollectDependencies(true)
      /** Track unhandled exceptions automatically. */
      .setAutoCollectExceptions(true)
      /** Collect basic CPU/memory performance counters. */
      .setAutoCollectPerformance(true, true)
      /**
       * Do NOT forward `console.log` calls to Application Insights —
       * logs are already handled by Winston; forwarding them would create
       * duplicate noise in the portal.
       */
      .setAutoCollectConsole(false)
      /**
       * Live Metrics stream is useful for real-time debugging but adds a
       * persistent outbound connection. Disabled by default; enable via
       * AI_SEND_LIVE_METRICS=true if required.
       */
      .setSendLiveMetrics(process.env.AI_SEND_LIVE_METRICS === 'true')
      .start();

    client = appInsights.defaultClient;

    /** Identify the cloud role in the Application Map. */
    client.context.tags[client.context.keys.cloudRole] = 'librechat-api';

    logger.info('[telemetry] Application Insights telemetry initialised');
  } catch (err) {
    logger.warn('[telemetry] Failed to initialise Application Insights', err);
  }
}

/** Returns the live telemetry client, or `null` when AI is not configured. */
export function getTelemetryClient(): TelemetryClient | null {
  return client;
}

/**
 * Tracks a named custom event with optional string properties.
 *
 * @param name       - Event name; prefer constants from `TelemetryEvents`.
 * @param properties - Key/value pairs of **non-sensitive** context.
 *                     Never include passwords, tokens, message content, or PII.
 */
export function trackEvent(name: string, properties?: Record<string, string>): void {
  client?.trackEvent({ name, properties });
}

/**
 * Tracks an exception.  Only call with errors that represent unexpected,
 * actionable failures — avoid swallowing routine client errors here.
 *
 * @param err        - The `Error` instance to track.
 * @param properties - Optional **non-sensitive** context.
 */
export function trackException(err: Error, properties?: Record<string, string>): void {
  client?.trackException({ exception: err, properties });
}

/**
 * Tracks a named numeric metric.
 *
 * @param name       - Metric name.
 * @param value      - Measured value.
 * @param properties - Optional **non-sensitive** context.
 */
export function trackMetric(
  name: string,
  value: number,
  properties?: Record<string, string>,
): void {
  client?.trackMetric({ name, value, properties });
}
