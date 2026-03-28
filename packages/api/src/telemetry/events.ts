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
  /** A security or rate-limit violation was recorded for a user. */
  SECURITY_VIOLATION: 'security.violation',
  /** A user was banned after exceeding the violation threshold. */
  SECURITY_USER_BANNED: 'security.user_banned',
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

  /* ── Image generation ───────────────────────────────────────────────── */
  /** An image generation API call (DALL-E, Gemini, Flux, Stable Diffusion) failed. */
  ERROR_IMAGE_GENERATION: 'error.image.generation',
  /** Saving a locally-processed image file failed. */
  ERROR_IMAGE_SAVE: 'error.image.save',

  /* ── Files ──────────────────────────────────────────────────────────── */
  /** Listing / fetching file records failed. */
  ERROR_FILE_LIST: 'error.file.list',
  /** Uploading or processing an uploaded file failed. */
  ERROR_FILE_UPLOAD: 'error.file.upload',
  /** Downloading a file failed (code interpreter or user download). */
  ERROR_FILE_DOWNLOAD: 'error.file.download',
  /** Deleting a file record or the physical file failed. */
  ERROR_FILE_DELETE: 'error.file.delete',
  /** Streaming TTS audio to the client failed. */
  ERROR_FILE_TTS: 'error.file.tts',
  /** Uploading or processing an avatar image failed. */
  ERROR_FILE_AVATAR: 'error.file.avatar',

  /* ── Search tools ────────────────────────────────────────────────────── */
  /** An external search tool API call failed (Wolfram, Azure AI Search, Traversaal, etc.). */
  ERROR_SEARCH_TOOL: 'error.search_tool',

  /* ── Tool classification ─────────────────────────────────────────────── */
  /** Building the PTC / tool classification registry failed. */
  ERROR_TOOL_CLASSIFICATION: 'error.tool.classification',

  /* ── Data management ─────────────────────────────────────────────────── */
  /** A prompt or prompt-group operation failed. */
  ERROR_PROMPT: 'error.prompt',
  /** A preset save or delete operation failed. */
  ERROR_PRESET: 'error.preset',
  /** A conversation-tag operation failed. */
  ERROR_TAG: 'error.tag',
  /** A shared-link operation failed. */
  ERROR_SHARE: 'error.share',

  /* ── Auth ────────────────────────────────────────────────────────────── */
  /** A user deleted their own account. */
  AUTH_DELETE_ACCOUNT: 'auth.delete_account',
  /** A password-reset request or confirmation failed. */
  ERROR_AUTH_RESET: 'error.auth.reset',
  /** A token-refresh operation (JWT or OpenID) failed. */
  ERROR_AUTH_REFRESH: 'error.auth.refresh',

  /* ── Microsoft Graph API ─────────────────────────────────────────────── */
  /** A Microsoft Graph API call failed. */
  ERROR_GRAPH_API: 'error.graph_api',

  /* ── Streaming / generation ──────────────────────────────────────────── */
  /** An error occurred while reading or writing a text stream. */
  ERROR_STREAM: 'error.stream',
  /** BaseClient failed to save a message or map attachments during generation. */
  ERROR_BASE_CLIENT: 'error.base_client',

  /* ── RAG API ─────────────────────────────────────────────────────────── */
  /** The RAG API was unreachable, returned an error, or failed to delete an embedding. */
  ERROR_RAG_API: 'error.rag_api',

  /* ── Code interpreter ────────────────────────────────────────────────── */
  /** Processing or re-uploading a code execution output file failed. */
  ERROR_CODE_OUTPUT: 'error.code_output',
} as const;

export type TelemetryEvent = (typeof TelemetryEvents)[keyof typeof TelemetryEvents];
