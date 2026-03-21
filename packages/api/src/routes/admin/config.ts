import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Router } from 'express';
import { configSchema, CacheKeys } from 'librechat-data-provider';
import { logger } from '@librechat/data-schemas';
import { standardCache } from '~/cache';
import { requireAdmin } from '~/middleware';
import type { Response } from 'express';
import type { ServerRequest } from '~/types/http';

const router = Router();
router.use(requireAdmin);

const defaultConfigPath = path.resolve(
  process.env['PROJECT_ROOT'] || path.join(__dirname, '..', '..', '..', '..', '..', '..'),
  'librechat.yaml',
);

const isRemoteUrl = (p: string): boolean => /^https?:\/\//.test(p);

function getConfigPath(): string {
  return process.env['CONFIG_PATH'] || defaultConfigPath;
}

/**
 * GET /api/admin/config/yaml
 * Read the librechat.yaml config file and return it as a raw YAML string
 */
router.get('/yaml', async (_req: ServerRequest, res: Response) => {
  try {
    const configPath = getConfigPath();

    if (!isRemoteUrl(configPath) && !fs.existsSync(configPath)) {
      return res.status(404).json({ message: 'Config file not found' });
    }

    const yamlContent = fs.readFileSync(configPath, 'utf8');
    res.status(200).json({ yaml: yamlContent });
  } catch (error) {
    logger.error('[admin/config] GET /yaml error:', error);
    res.status(500).json({ message: 'Failed to read config file' });
  }
});

/**
 * PUT /api/admin/config/yaml
 * Validate and write the librechat.yaml config file
 */
router.put('/yaml', async (req: ServerRequest, res: Response) => {
  try {
    const { yaml: yamlContent } = req.body as { yaml: string };

    if (typeof yamlContent !== 'string' || !yamlContent.trim()) {
      return res.status(400).json({ message: 'yaml field is required and must be a string' });
    }

    let parsed: unknown;
    try {
      parsed = yaml.load(yamlContent);
    } catch (parseError) {
      return res.status(400).json({ message: `Invalid YAML: ${(parseError as Error).message}` });
    }

    const result = configSchema.strict().safeParse(parsed);
    if (!result.success) {
      return res.status(400).json({
        message: 'Config validation failed',
        errors: result.error.errors,
      });
    }

    const configPath = getConfigPath();
    if (isRemoteUrl(configPath)) {
      return res
        .status(400)
        .json({ message: 'Cannot write to a remote config URL' });
    }

    fs.writeFileSync(configPath, yamlContent, 'utf8');

    const configStoreCache = standardCache(CacheKeys.CONFIG_STORE);
    const startupConfigCache = standardCache(CacheKeys.STARTUP_CONFIG);
    await Promise.all([configStoreCache.clear(), startupConfigCache.clear()]);

    logger.info('[admin/config] Config file updated and caches invalidated');
    res.status(200).json({ message: 'Config saved successfully' });
  } catch (error) {
    logger.error('[admin/config] PUT /yaml error:', error);
    res.status(500).json({ message: 'Failed to save config file' });
  }
});

export default router;
