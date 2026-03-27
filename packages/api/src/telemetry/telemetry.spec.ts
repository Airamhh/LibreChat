import { logger } from '@librechat/data-schemas';

jest.mock('@librechat/data-schemas', () => ({
  logger: { info: jest.fn(), warn: jest.fn() },
}));

const makeAppInsightsMock = () => {
  const mockClient = {
    context: {
      tags: {} as Record<string, string>,
      keys: { cloudRole: 'ai.cloud.role' },
    },
    trackEvent: jest.fn(),
    trackException: jest.fn(),
    trackMetric: jest.fn(),
  };
  return {
    setup: jest.fn().mockReturnValue({
      setAutoCollectRequests: jest.fn().mockReturnThis(),
      setAutoCollectDependencies: jest.fn().mockReturnThis(),
      setAutoCollectExceptions: jest.fn().mockReturnThis(),
      setAutoCollectPerformance: jest.fn().mockReturnThis(),
      setAutoCollectConsole: jest.fn().mockReturnThis(),
      setSendLiveMetrics: jest.fn().mockReturnThis(),
      start: jest.fn().mockReturnThis(),
    }),
    defaultClient: mockClient,
  };
};

jest.mock('applicationinsights', () => makeAppInsightsMock());

describe('telemetry', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('setupTelemetry / no-op conditions', () => {
    it('does nothing when connection string is absent', () => {
      jest.isolateModules(() => {
        delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { setupTelemetry, getTelemetryClient } = require('./index') as typeof import('./index');
        setupTelemetry();
        expect(getTelemetryClient()).toBeNull();
      });
    });

    it('does nothing when connection string is blank', () => {
      jest.isolateModules(() => {
        process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = '   ';
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { setupTelemetry, getTelemetryClient } = require('./index') as typeof import('./index');
        setupTelemetry();
        expect(getTelemetryClient()).toBeNull();
      });
    });

    it('logs a warning and leaves client null when applicationinsights setup throws', () => {
      jest.isolateModules(() => {
        process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'InstrumentationKey=bad';
        jest.doMock('applicationinsights', () => ({
          setup: jest.fn().mockImplementation(() => {
            throw new Error('setup failure');
          }),
          defaultClient: null,
        }));
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { setupTelemetry, getTelemetryClient } = require('./index') as typeof import('./index');
        setupTelemetry();
        expect(logger.warn as jest.Mock).toHaveBeenCalled();
        expect(getTelemetryClient()).toBeNull();
      });
    });
  });

  describe('track helpers are no-ops when client is null', () => {
    it('trackEvent does not throw', () => {
      jest.isolateModules(() => {
        delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { setupTelemetry, trackEvent } = require('./index') as typeof import('./index');
        setupTelemetry();
        expect(() => trackEvent('auth.login.success', { userId: '123' })).not.toThrow();
      });
    });

    it('trackException does not throw', () => {
      jest.isolateModules(() => {
        delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { setupTelemetry, trackException } = require('./index') as typeof import('./index');
        setupTelemetry();
        expect(() => trackException(new Error('boom'))).not.toThrow();
      });
    });

    it('trackMetric does not throw', () => {
      jest.isolateModules(() => {
        delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { setupTelemetry, trackMetric } = require('./index') as typeof import('./index');
        setupTelemetry();
        expect(() => trackMetric('some.metric', 42)).not.toThrow();
      });
    });
  });
});
