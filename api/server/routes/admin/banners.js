const express = require('express');
const { logger } = require('@librechat/data-schemas');
const { SystemCapabilities } = require('@librechat/data-schemas');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const { requireJwtAuth } = require('~/server/middleware');
const db = require('~/models');

const router = express.Router();

const requireAdminAccess = requireCapability(SystemCapabilities.ACCESS_ADMIN);

// All routes require authentication and admin access
router.use(requireJwtAuth, requireAdminAccess);

/**
 * POST /api/admin/banners
 * Create a new banner
 */
router.post('/', async (req, res) => {
    try {
        const bannerData = {
            ...req.body,
            tenantId: req.user.tenantId,
        };

        const banner = await db.createBanner(bannerData);

        res.status(201).json(banner);
    } catch (error) {
        logger.error('[POST /admin/banners] Error:', error);

        if (error.message.includes('required') ||
            error.message.includes('not found') ||
            error.message.includes('after')) {
            return res.status(400).json({
                message: error.message
            });
        }

        res.status(500).json({
            message: 'Error creating banner'
        });
    }
});

/**
 * GET /api/admin/banners
 * List all banners (paginated)
 */
router.get('/', async (req, res) => {
    try {
        const {
            page = '1',
            limit = '20',
            audienceMode,
            isActive,
        } = req.query;

        const filter = {};

        if (audienceMode) {
            filter.audienceMode = audienceMode;
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const result = await db.listBanners({
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            filter,
            tenantId: req.user.tenantId,
        });

        res.json(result);
    } catch (error) {
        logger.error('[GET /admin/banners] Error:', error);
        res.status(500).json({
            message: 'Error listing banners'
        });
    }
});

/**
 * GET /api/admin/banners/:id
 * Get a specific banner
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await db.getBannerById(id);

        if (!banner) {
            return res.status(404).json({
                message: 'Banner not found'
            });
        }

        // Check tenantId
        if (banner.tenantId && banner.tenantId !== req.user.tenantId) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        res.json(banner);
    } catch (error) {
        logger.error('[GET /admin/banners/:id] Error:', error);
        res.status(500).json({
            message: 'Error getting banner'
        });
    }
});

/**
 * PUT /api/admin/banners/:id
 * Update a banner
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent changing tenantId
        delete req.body.tenantId;

        const banner = await db.updateBanner(id, req.body);

        if (!banner) {
            return res.status(404).json({
                message: 'Banner not found'
            });
        }

        res.json(banner);
    } catch (error) {
        logger.error('[PUT /admin/banners/:id] Error:', error);

        if (error.message.includes('required') ||
            error.message.includes('not found') ||
            error.message.includes('after')) {
            return res.status(400).json({
                message: error.message
            });
        }

        res.status(500).json({
            message: 'Error updating banner'
        });
    }
});

/**
 * DELETE /api/admin/banners/:id
 * Delete a banner
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await db.deleteBanner(id);

        if (!deleted) {
            return res.status(404).json({
                message: 'Banner not found'
            });
        }

        res.json({ message: 'Banner deleted successfully' });
    } catch (error) {
        logger.error('[DELETE /admin/banners/:id] Error:', error);
        res.status(500).json({
            message: 'Error deleting banner'
        });
    }
});

/**
 * PATCH /api/admin/banners/:id/toggle
 * Toggle banner active status
 */
router.patch('/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await db.toggleBanner(id);

        if (!banner) {
            return res.status(404).json({
                message: 'Banner not found'
            });
        }

        res.json(banner);
    } catch (error) {
        logger.error('[PATCH /admin/banners/:id/toggle] Error:', error);
        res.status(500).json({
            message: 'Error toggling banner'
        });
    }
});

module.exports = router;
