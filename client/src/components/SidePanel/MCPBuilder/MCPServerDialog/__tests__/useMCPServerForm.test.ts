/**
 * Unit tests for useMCPServerForm — focused on the chatMenu / serverInstructions
 * defaultValues derivation and config-building logic introduced in the Advanced section.
 *
 * These tests exercise pure TypeScript logic directly without mounting React, keeping
 * them fast and dependency-free.
 */
import type { MCPOptions } from 'librechat-data-provider';
import type { MCPServerDefinition } from '~/hooks';

// ---------------------------------------------------------------------------
// Helpers extracted from useMCPServerForm (mirrored here for unit testing)
// ---------------------------------------------------------------------------
import {
  AuthTypeEnum,
  AuthorizationTypeEnum,
} from '../hooks/useMCPServerForm';
import type { MCPServerFormData, ServerInstructionsMode } from '../hooks/useMCPServerForm';

/**
 * Mirrors the defaultValues derivation for an existing server so we can test it
 * without mounting the full hook (which requires React context).
 */
function deriveDefaultValues(server: MCPServerDefinition): MCPServerFormData {
  let authType = AuthTypeEnum.None;
  if (server.config.oauth) {
    authType = AuthTypeEnum.OAuth;
  } else if ('apiKey' in server.config && server.config.apiKey) {
    authType = AuthTypeEnum.ServiceHttp;
  }

  const apiKeyConfig = 'apiKey' in server.config ? server.config.apiKey : undefined;
  const headersConfig =
    'headers' in server.config && server.config.headers
      ? (server.config.headers as Record<string, string>)
      : {};
  const customUserVarsConfig = server.config.customUserVars ?? {};
  const rawSecretHeaderKeys =
    'secretHeaderKeys' in server.config
      ? (server.config.secretHeaderKeys as string[] | undefined)
      : undefined;
  const secretHeaderKeysSet = new Set(rawSecretHeaderKeys ?? []);

  const si = server.config.serverInstructions;
  const serverInstructionsMode: ServerInstructionsMode =
    typeof si === 'string' ? 'custom' : si === true ? 'server' : 'none';

  return {
    title: server.config.title || '',
    description: server.config.description || '',
    url: 'url' in server.config ? (server.config as { url: string }).url : '',
    type: (server.config.type as 'streamable-http' | 'sse') || 'streamable-http',
    icon: server.config.iconPath || '',
    auth: {
      auth_type: authType,
      api_key: '',
      api_key_source: (apiKeyConfig?.source as 'admin' | 'user') || 'admin',
      api_key_authorization_type:
        (apiKeyConfig?.authorization_type as AuthorizationTypeEnum) ||
        AuthorizationTypeEnum.Bearer,
      api_key_custom_header: apiKeyConfig?.custom_header || '',
      oauth_client_id: server.config.oauth?.client_id || '',
      oauth_client_secret: '',
      oauth_authorization_url: server.config.oauth?.authorization_url || '',
      oauth_token_url: server.config.oauth?.token_url || '',
      oauth_scope: server.config.oauth?.scope || '',
      server_id: server.serverName,
    },
    trust: true,
    headers: Object.entries(headersConfig).map(([key, value]) => ({
      key,
      value,
      isSecret: secretHeaderKeysSet.has(key),
    })),
    customUserVars: Object.entries(customUserVarsConfig).map(([key, cfg]) => ({
      key,
      title: cfg.title,
      description: cfg.description,
    })),
    chatMenu: server.config.chatMenu !== false,
    serverInstructionsMode,
    serverInstructionsCustom: typeof si === 'string' ? si : '',
  };
}

/**
 * Mirrors the config-building snippet from onSubmit so we can test the output
 * payload without the full React + react-hook-form stack.
 */
function buildConfig(formData: MCPServerFormData): Record<string, unknown> {
  return {
    type: formData.type,
    url: formData.url,
    title: formData.title,
    ...(formData.description && { description: formData.description }),
    ...(formData.icon && { iconPath: formData.icon }),
    ...(!formData.chatMenu && { chatMenu: false }),
    ...(formData.serverInstructionsMode === 'server' && { serverInstructions: true }),
    ...(formData.serverInstructionsMode === 'custom' &&
      formData.serverInstructionsCustom.trim() && {
        serverInstructions: formData.serverInstructionsCustom.trim(),
      }),
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeServer(overrides: Partial<MCPOptions> = {}): MCPServerDefinition {
  const base: MCPOptions = {
    type: 'sse',
    url: 'https://mcp.example.com/sse',
    title: 'Test Server',
    ...overrides,
  } as MCPOptions;
  return {
    serverName: 'test-server',
    config: base,
    effectivePermissions: 7,
  };
}

// ---------------------------------------------------------------------------
// Tests: deriving defaultValues from an existing server
// ---------------------------------------------------------------------------

describe('deriveDefaultValues – chatMenu', () => {
  it('defaults chatMenu to true when the field is absent', () => {
    const server = makeServer();
    const defaults = deriveDefaultValues(server);
    expect(defaults.chatMenu).toBe(true);
  });

  it('keeps chatMenu true when config has chatMenu: true', () => {
    const server = makeServer({ chatMenu: true });
    const defaults = deriveDefaultValues(server);
    expect(defaults.chatMenu).toBe(true);
  });

  it('sets chatMenu to false when config has chatMenu: false', () => {
    const server = makeServer({ chatMenu: false });
    const defaults = deriveDefaultValues(server);
    expect(defaults.chatMenu).toBe(false);
  });
});

describe('deriveDefaultValues – serverInstructions', () => {
  it('sets serverInstructionsMode to "none" when serverInstructions is absent', () => {
    const server = makeServer();
    const defaults = deriveDefaultValues(server);
    expect(defaults.serverInstructionsMode).toBe('none');
    expect(defaults.serverInstructionsCustom).toBe('');
  });

  it('sets serverInstructionsMode to "server" when serverInstructions is true', () => {
    const server = makeServer({ serverInstructions: true });
    const defaults = deriveDefaultValues(server);
    expect(defaults.serverInstructionsMode).toBe('server');
    expect(defaults.serverInstructionsCustom).toBe('');
  });

  it('sets serverInstructionsMode to "none" when serverInstructions is false', () => {
    const server = makeServer({ serverInstructions: false });
    const defaults = deriveDefaultValues(server);
    expect(defaults.serverInstructionsMode).toBe('none');
    expect(defaults.serverInstructionsCustom).toBe('');
  });

  it('sets serverInstructionsMode to "custom" and populates custom text', () => {
    const server = makeServer({ serverInstructions: 'Use English only.' });
    const defaults = deriveDefaultValues(server);
    expect(defaults.serverInstructionsMode).toBe('custom');
    expect(defaults.serverInstructionsCustom).toBe('Use English only.');
  });

  it('treats a non-empty string serverInstructions as custom mode', () => {
    const server = makeServer({ serverInstructions: 'Multi\nline\ninstructions.' });
    const defaults = deriveDefaultValues(server);
    expect(defaults.serverInstructionsMode).toBe('custom');
    expect(defaults.serverInstructionsCustom).toBe('Multi\nline\ninstructions.');
  });
});

// ---------------------------------------------------------------------------
// Tests: buildConfig – chatMenu payload
// ---------------------------------------------------------------------------

describe('buildConfig – chatMenu', () => {
  const baseFormData: MCPServerFormData = {
    title: 'My Server',
    url: 'https://mcp.example.com/sse',
    type: 'sse',
    auth: {
      auth_type: AuthTypeEnum.None,
      api_key: '',
      api_key_source: 'admin',
      api_key_authorization_type: AuthorizationTypeEnum.Bearer,
      api_key_custom_header: '',
      oauth_client_id: '',
      oauth_client_secret: '',
      oauth_authorization_url: '',
      oauth_token_url: '',
      oauth_scope: '',
    },
    trust: true,
    headers: [],
    customUserVars: [],
    chatMenu: true,
    serverInstructionsMode: 'none',
    serverInstructionsCustom: '',
  };

  it('omits chatMenu from payload when checked (default/true)', () => {
    const config = buildConfig({ ...baseFormData, chatMenu: true });
    expect(config.chatMenu).toBeUndefined();
  });

  it('includes chatMenu: false in payload when unchecked', () => {
    const config = buildConfig({ ...baseFormData, chatMenu: false });
    expect(config.chatMenu).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: buildConfig – serverInstructions payload
// ---------------------------------------------------------------------------

describe('buildConfig – serverInstructions', () => {
  const baseFormData: MCPServerFormData = {
    title: 'My Server',
    url: 'https://mcp.example.com/sse',
    type: 'sse',
    auth: {
      auth_type: AuthTypeEnum.None,
      api_key: '',
      api_key_source: 'admin',
      api_key_authorization_type: AuthorizationTypeEnum.Bearer,
      api_key_custom_header: '',
      oauth_client_id: '',
      oauth_client_secret: '',
      oauth_authorization_url: '',
      oauth_token_url: '',
      oauth_scope: '',
    },
    trust: true,
    headers: [],
    customUserVars: [],
    chatMenu: true,
    serverInstructionsMode: 'none',
    serverInstructionsCustom: '',
  };

  it('omits serverInstructions from payload when mode is "none"', () => {
    const config = buildConfig({ ...baseFormData, serverInstructionsMode: 'none' });
    expect(config.serverInstructions).toBeUndefined();
  });

  it('sends serverInstructions: true when mode is "server"', () => {
    const config = buildConfig({ ...baseFormData, serverInstructionsMode: 'server' });
    expect(config.serverInstructions).toBe(true);
  });

  it('sends custom string when mode is "custom" and text is non-empty', () => {
    const config = buildConfig({
      ...baseFormData,
      serverInstructionsMode: 'custom',
      serverInstructionsCustom: 'Respond briefly.',
    });
    expect(config.serverInstructions).toBe('Respond briefly.');
  });

  it('trims whitespace from custom instructions before sending', () => {
    const config = buildConfig({
      ...baseFormData,
      serverInstructionsMode: 'custom',
      serverInstructionsCustom: '  Trimmed text.  ',
    });
    expect(config.serverInstructions).toBe('Trimmed text.');
  });

  it('omits serverInstructions when mode is "custom" but text is blank', () => {
    const config = buildConfig({
      ...baseFormData,
      serverInstructionsMode: 'custom',
      serverInstructionsCustom: '   ',
    });
    expect(config.serverInstructions).toBeUndefined();
  });

  it('omits serverInstructions when mode is "custom" but text is empty string', () => {
    const config = buildConfig({
      ...baseFormData,
      serverInstructionsMode: 'custom',
      serverInstructionsCustom: '',
    });
    expect(config.serverInstructions).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests: combined chatMenu + serverInstructions scenarios
// ---------------------------------------------------------------------------

describe('buildConfig – combined chatMenu and serverInstructions', () => {
  it('sends both chatMenu: false and serverInstructions: true together', () => {
    const formData: MCPServerFormData = {
      title: 'Server',
      url: 'https://mcp.example.com/sse',
      type: 'sse',
      auth: {
        auth_type: AuthTypeEnum.None,
        api_key: '',
        api_key_source: 'admin',
        api_key_authorization_type: AuthorizationTypeEnum.Bearer,
        api_key_custom_header: '',
        oauth_client_id: '',
        oauth_client_secret: '',
        oauth_authorization_url: '',
        oauth_token_url: '',
        oauth_scope: '',
      },
      trust: true,
      headers: [],
      customUserVars: [],
      chatMenu: false,
      serverInstructionsMode: 'server',
      serverInstructionsCustom: '',
    };
    const config = buildConfig(formData);
    expect(config.chatMenu).toBe(false);
    expect(config.serverInstructions).toBe(true);
  });

  it('sends chatMenu: false and custom serverInstructions string', () => {
    const formData: MCPServerFormData = {
      title: 'Hidden Server',
      url: 'https://mcp.example.com/sse',
      type: 'sse',
      auth: {
        auth_type: AuthTypeEnum.None,
        api_key: '',
        api_key_source: 'admin',
        api_key_authorization_type: AuthorizationTypeEnum.Bearer,
        api_key_custom_header: '',
        oauth_client_id: '',
        oauth_client_secret: '',
        oauth_authorization_url: '',
        oauth_token_url: '',
        oauth_scope: '',
      },
      trust: true,
      headers: [],
      customUserVars: [],
      chatMenu: false,
      serverInstructionsMode: 'custom',
      serverInstructionsCustom: 'Custom instructions here.',
    };
    const config = buildConfig(formData);
    expect(config.chatMenu).toBe(false);
    expect(config.serverInstructions).toBe('Custom instructions here.');
  });

  it('omits both chatMenu and serverInstructions when defaults are used', () => {
    const formData: MCPServerFormData = {
      title: 'Default Server',
      url: 'https://mcp.example.com/sse',
      type: 'sse',
      auth: {
        auth_type: AuthTypeEnum.None,
        api_key: '',
        api_key_source: 'admin',
        api_key_authorization_type: AuthorizationTypeEnum.Bearer,
        api_key_custom_header: '',
        oauth_client_id: '',
        oauth_client_secret: '',
        oauth_authorization_url: '',
        oauth_token_url: '',
        oauth_scope: '',
      },
      trust: true,
      headers: [],
      customUserVars: [],
      chatMenu: true,
      serverInstructionsMode: 'none',
      serverInstructionsCustom: '',
    };
    const config = buildConfig(formData);
    expect(config.chatMenu).toBeUndefined();
    expect(config.serverInstructions).toBeUndefined();
  });
});
