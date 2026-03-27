/**
 * Canonical event and metric names for Application Insights telemetry.
 *
 * Naming convention: `<domain>.<action>` or `<domain>.<entity>.<action>`,
 * all lowercase with dots as separators.
 */
export const TelemetryEvents = {
  /** Successful interactive login (local, LDAP, or social). */
  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  /** Login blocked because the account requires 2-FA completion. */
  AUTH_LOGIN_2FA_PENDING: 'auth.login.2fa_pending',
  /** Successful user logout. */
  AUTH_LOGOUT: 'auth.logout',
  /** New user registration completed successfully. */
  AUTH_REGISTER_SUCCESS: 'auth.register.success',
  /** User registration attempt failed. */
  AUTH_REGISTER_FAILURE: 'auth.register.failure',
  /** A rate-limit was hit on an auth endpoint (possible brute-force). */
  SECURITY_RATE_LIMIT: 'security.rate_limit',
  /** Express global error handler caught an unexpected server error. */
  ERROR_SERVER: 'error.server',
  /** MongoDB duplicate-key error surfaced by the error handler. */
  ERROR_DUPLICATE_KEY: 'error.duplicate_key',
  /** Mongoose validation error surfaced by the error handler. */
  ERROR_VALIDATION: 'error.validation',
  /** OAuth / OpenID callback authentication failure. */
  ERROR_AUTH_FAILED: 'error.auth_failed',
} as const;

export type TelemetryEvent = (typeof TelemetryEvents)[keyof typeof TelemetryEvents];
