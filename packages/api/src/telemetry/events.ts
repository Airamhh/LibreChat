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

  /* ── Tools ──────────────────────────────────────────────────────────── */
  /** Individual tool invocation failed inside the ON_TOOL_EXECUTE handler. */
  ERROR_TOOL_EXECUTION: 'error.tool_execution',
  /** Fatal error loading or preparing tools before execution. */
  ERROR_TOOL_LOADING: 'error.tool_loading',
  /** Tool validation (credential / config check) failed. */
  ERROR_TOOL_VALIDATION: 'error.tool_validation',

  /* ── Messages ───────────────────────────────────────────────────────── */
  /** Fetching messages from the database failed. */
  ERROR_MESSAGE_FETCH: 'error.message.fetch',
  /** Saving a message to the database failed. */
  ERROR_MESSAGE_SAVE: 'error.message.save',
  /** Updating a message record failed. */
  ERROR_MESSAGE_UPDATE: 'error.message.update',
  /** Deleting a message failed. */
  ERROR_MESSAGE_DELETE: 'error.message.delete',
  /** Editing an in-message artifact failed. */
  ERROR_MESSAGE_ARTIFACT: 'error.message.artifact',

  /* ── Conversations ──────────────────────────────────────────────────── */
  /** Fetching conversations failed. */
  ERROR_CONVO_FETCH: 'error.convo.fetch',
  /** Archiving a conversation failed. */
  ERROR_CONVO_ARCHIVE: 'error.convo.archive',
  /** Updating (e.g. renaming) a conversation failed. */
  ERROR_CONVO_UPDATE: 'error.convo.update',
  /** Deleting / clearing conversations failed. */
  ERROR_CONVO_DELETE: 'error.convo.delete',
  /** Forking a conversation failed. */
  ERROR_CONVO_FORK: 'error.convo.fork',
  /** Duplicating a conversation failed. */
  ERROR_CONVO_DUPLICATE: 'error.convo.duplicate',
  /** Importing a conversation file failed. */
  ERROR_CONVO_IMPORT: 'error.convo.import',

  /* ── Agents ─────────────────────────────────────────────────────────── */
  /** Saving a partial (aborted) agent response to the database failed. */
  ERROR_AGENT_PARTIAL_SAVE: 'error.agent.partial_save',
  /** A memory tool operation (set / delete) failed. */
  ERROR_AGENT_MEMORY: 'error.agent.memory',
  /** Processing and persisting memory at end-of-turn failed. */
  ERROR_AGENT_MEMORY_PROCESS: 'error.agent.memory_process',
  /** Recording token usage failed. */
  ERROR_AGENT_USAGE: 'error.agent.usage',

  /* ── MCP ────────────────────────────────────────────────────────────── */
  /** Initialising the MCP Servers Registry or MCPManager failed. */
  ERROR_MCP_INIT: 'error.mcp.init',
  /** An MCP tool call failed. */
  ERROR_MCP_TOOL_CALL: 'error.mcp.tool_call',
  /** An MCP connection attempt failed (initial or reconnect). */
  ERROR_MCP_CONNECTION: 'error.mcp.connection',
  /** An MCP OAuth flow failed. */
  ERROR_MCP_OAUTH: 'error.mcp.oauth',
} as const;

export type TelemetryEvent = (typeof TelemetryEvents)[keyof typeof TelemetryEvents];
