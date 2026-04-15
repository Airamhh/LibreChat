# Ejemplos de Implementación: Sistema Multi-Banner

Este documento contiene pseudocódigo y ejemplos concretos para las implementaciones clave del sistema multi-banner.

---

## 1. Schema Migration

### 1.1. Actualizar Schema Banner

**Archivo:** `packages/data-schemas/src/schema/banner.ts`

```typescript
import { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
  // Campos existentes
  bannerId: string;
  message: string;
  displayFrom: Date;
  displayTo?: Date;
  type: 'banner' | 'popup';
  isPublic: boolean;
  persistable: boolean;
  tenantId?: string;
  
  // NUEVOS CAMPOS
  audienceMode?: 'global' | 'role' | 'group' | 'user';
  targetRoleIds?: string[];
  targetGroupIds?: string[];
  targetUserIds?: string[];
  priority?: number;
  isActive?: boolean;
  order?: number;
  viewCount?: number;
  dismissCount?: number;
}

const bannerSchema = new Schema<IBanner>(
  {
    bannerId: {
      type: String,
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    displayFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    displayTo: {
      type: Date,
    },
    type: {
      type: String,
      enum: ['banner', 'popup'],
      default: 'banner',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    persistable: {
      type: Boolean,
      default: false,
    },
    tenantId: {
      type: String,
      index: true,
    },
    
    // NUEVOS CAMPOS (todos opcionales para compatibilidad)
    audienceMode: {
      type: String,
      enum: ['global', 'role', 'group', 'user'],
      default: 'global',
    },
    targetRoleIds: [{
      type: String,
    }],
    targetGroupIds: [{
      type: String,
    }],
    targetUserIds: [{
      type: String,
    }],
    priority: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    dismissCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Índices para performance
bannerSchema.index({ displayFrom: 1, displayTo: 1, isActive: 1 });
bannerSchema.index({ audienceMode: 1, isActive: 1 });
bannerSchema.index({ targetRoleIds: 1 }, { sparse: true });
bannerSchema.index({ targetGroupIds: 1 }, { sparse: true });
bannerSchema.index({ targetUserIds: 1 }, { sparse: true });
bannerSchema.index({ tenantId: 1, isActive: 1 });
bannerSchema.index({ priority: -1, order: 1 });

export default bannerSchema;
```

### 1.2. Actualizar Type Definitions

**Archivo:** `packages/data-provider/src/schemas.ts`

```typescript
export const tBannerSchema = z.object({
  bannerId: z.string(),
  message: z.string(),
  displayFrom: z.string(),
  displayTo: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isPublic: z.boolean(),
  persistable: z.boolean().default(false),
  type: z.enum(['banner', 'popup']).default('banner'),
  
  // NUEVOS CAMPOS
  audienceMode: z.enum(['global', 'role', 'group', 'user']).optional(),
  targetRoleIds: z.array(z.string()).optional(),
  targetGroupIds: z.array(z.string()).optional(),
  targetUserIds: z.array(z.string()).optional(),
  priority: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  order: z.number().optional(),
  viewCount: z.number().optional(),
  dismissCount: z.number().optional(),
});

export type TBanner = z.infer<typeof tBannerSchema>;

export type TBannerResponse = TBanner | null;
export type TBannersResponse = TBanner[];
```

---

## 2. Backend Methods

### 2.1. getActiveBanners() - Core Logic

**Archivo:** `packages/data-schemas/src/methods/banner.ts`

```typescript
import type { Model, ClientSession, FilterQuery } from 'mongoose';
import { Types } from 'mongoose';
import { PrincipalType } from 'librechat-data-provider';
import logger from '~/config/winston';
import type { IBanner, IUser } from '~/types';
import { getUserPrincipals } from './userGroup';

export function createBannerMethods(mongoose: typeof import('mongoose')) {
  
  /**
   * Get all active banners for a user based on date ranges, 
   * audience targeting, and user principals (role, groups).
   */
  async function getActiveBanners(
    user?: IUser | null,
    options?: { 
      limit?: number; 
      session?: ClientSession;
    }
  ): Promise<IBanner[]> {
    const Banner = mongoose.models.Banner as Model<IBanner>;
    const now = new Date();
    const limit = options?.limit || 10;
    
    try {
      // Base query: active banners within date range
      const baseQuery: FilterQuery<IBanner> = {
        displayFrom: { $lte: now },
        $or: [
          { displayTo: { $gte: now } },
          { displayTo: null },
        ],
        type: 'banner',
        isActive: { $ne: false }, // true or undefined
      };
      
      // If no user, return only public banners
      if (!user) {
        const query = Banner.find({ 
          ...baseQuery, 
          isPublic: true 
        })
          .sort({ priority: -1, order: 1, displayFrom: -1 })
          .limit(limit);
        
        if (options?.session) {
          query.session(options.session);
        }
        
        return query.lean();
      }
      
      // Get user principals (USER, ROLE, GROUPs, PUBLIC)
      const principals = await getUserPrincipals({
        userId: user._id,
        role: user.role,
      }, options?.session);
      
      // Extract role and group IDs from principals
      const roleIds = principals
        .filter(p => p.principalType === PrincipalType.ROLE)
        .map(p => p.principalId as string);
      
      const groupIds = principals
        .filter(p => p.principalType === PrincipalType.GROUP)
        .map(p => p.principalId as Types.ObjectId);
      
      // Build audience query
      const audienceQuery: FilterQuery<IBanner> = {
        $or: [
          // Legacy banners (no audienceMode)
          { audienceMode: { $exists: false } },
          
          // Global banners
          { audienceMode: 'global' },
          
          // Public banners
          { isPublic: true },
          
          // Banners targeted to this specific user
          { 
            audienceMode: 'user',
            targetUserIds: user._id.toString(),
          },
          
          // Banners targeted to user's role
          { 
            audienceMode: 'role',
            targetRoleIds: { $in: roleIds },
          },
          
          // Banners targeted to user's groups
          { 
            audienceMode: 'group',
            targetGroupIds: { 
              $in: groupIds.map(id => id.toString()) 
            },
          },
        ],
      };
      
      // Execute query
      const query = Banner.find({ 
        ...baseQuery, 
        ...audienceQuery,
      })
        .sort({ priority: -1, order: 1, displayFrom: -1 })
        .limit(limit);
      
      if (options?.session) {
        query.session(options.session);
      }
      
      const banners = await query.lean();
      
      logger.debug(
        `[getActiveBanners] Found ${banners.length} banners for user ${user._id}`
      );
      
      return banners;
      
    } catch (error) {
      logger.error('[getActiveBanners] Error:', error);
      throw new Error('Error getting active banners');
    }
  }
  
  /**
   * Legacy method - returns first active banner
   * Maintains backward compatibility
   */
  async function getBanner(user?: IUser | null): Promise<IBanner | null> {
    const banners = await getActiveBanners(user, { limit: 1 });
    return banners[0] || null;
  }
  
  return {
    getBanner,
    getActiveBanners,
  };
}
```

### 2.2. CRUD Methods

**Archivo:** `packages/data-schemas/src/methods/banner.ts` (continuación)

```typescript
import { v5 as uuidv5 } from 'uuid';
import DOMPurify from 'isomorphic-dompurify';

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export function createBannerMethods(mongoose: typeof import('mongoose')) {
  // ... getActiveBanners, getBanner ...
  
  /**
   * Create a new banner with validation
   */
  async function createBanner(
    data: Partial<IBanner>,
    session?: ClientSession
  ): Promise<IBanner> {
    const Banner = mongoose.models.Banner as Model<IBanner>;
    
    try {
      // Validate required fields
      if (!data.message?.trim()) {
        throw new Error('Banner message is required');
      }
      
      // Sanitize HTML message
      const cleanMessage = DOMPurify.sanitize(data.message, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'span', 'div'],
        ALLOWED_ATTR: ['href', 'target', 'class'],
      });
      
      // Validate date range
      if (data.displayTo && data.displayFrom && data.displayTo < data.displayFrom) {
        throw new Error('displayTo must be after displayFrom');
      }
      
      // Validate audience
      if (data.audienceMode === 'role' && data.targetRoleIds?.length) {
        await validateRolesExist(data.targetRoleIds);
      }
      
      if (data.audienceMode === 'group' && data.targetGroupIds?.length) {
        await validateGroupsExist(data.targetGroupIds);
      }
      
      if (data.audienceMode === 'user' && data.targetUserIds?.length) {
        await validateUsersExist(data.targetUserIds);
      }
      
      // Generate unique bannerId
      const bannerId = uuidv5(cleanMessage, NAMESPACE);
      
      // Create banner
      const bannerData: Partial<IBanner> = {
        ...data,
        bannerId,
        message: cleanMessage,
        displayFrom: data.displayFrom || new Date(),
        isActive: data.isActive ?? true,
        priority: data.priority ?? 50,
        order: data.order ?? 0,
        viewCount: 0,
        dismissCount: 0,
      };
      
      const banner = await Banner.create([bannerData], { session });
      
      logger.info(`[createBanner] Created banner ${bannerId}`);
      
      return banner[0];
      
    } catch (error) {
      logger.error('[createBanner] Error:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing banner
   */
  async function updateBanner(
    bannerId: string,
    updates: Partial<IBanner>,
    session?: ClientSession
  ): Promise<IBanner | null> {
    const Banner = mongoose.models.Banner as Model<IBanner>;
    
    try {
      // Sanitize message if provided
      if (updates.message) {
        updates.message = DOMPurify.sanitize(updates.message, {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'span', 'div'],
          ALLOWED_ATTR: ['href', 'target', 'class'],
        });
      }
      
      // Validate date range
      if (updates.displayTo && updates.displayFrom && updates.displayTo < updates.displayFrom) {
        throw new Error('displayTo must be after displayFrom');
      }
      
      // Validate audience if changed
      if (updates.audienceMode === 'role' && updates.targetRoleIds?.length) {
        await validateRolesExist(updates.targetRoleIds);
      }
      
      if (updates.audienceMode === 'group' && updates.targetGroupIds?.length) {
        await validateGroupsExist(updates.targetGroupIds);
      }
      
      if (updates.audienceMode === 'user' && updates.targetUserIds?.length) {
        await validateUsersExist(updates.targetUserIds);
      }
      
      // Remove bannerId from updates (immutable)
      const { bannerId: _, ...safeUpdates } = updates as any;
      
      const query = Banner.findOneAndUpdate(
        { bannerId },
        { $set: safeUpdates },
        { new: true }
      );
      
      if (session) {
        query.session(session);
      }
      
      const banner = await query;
      
      if (banner) {
        logger.info(`[updateBanner] Updated banner ${bannerId}`);
      } else {
        logger.warn(`[updateBanner] Banner not found: ${bannerId}`);
      }
      
      return banner;
      
    } catch (error) {
      logger.error('[updateBanner] Error:', error);
      throw error;
    }
  }
  
  /**
   * Delete a banner
   */
  async function deleteBanner(
    bannerId: string,
    session?: ClientSession
  ): Promise<boolean> {
    const Banner = mongoose.models.Banner as Model<IBanner>;
    
    try {
      const query = Banner.deleteOne({ bannerId });
      
      if (session) {
        query.session(session);
      }
      
      const result = await query;
      
      if (result.deletedCount > 0) {
        logger.info(`[deleteBanner] Deleted banner ${bannerId}`);
        return true;
      }
      
      logger.warn(`[deleteBanner] Banner not found: ${bannerId}`);
      return false;
      
    } catch (error) {
      logger.error('[deleteBanner] Error:', error);
      throw error;
    }
  }
  
  /**
   * List banners with pagination and filters
   */
  async function listBanners(options: {
    page?: number;
    limit?: number;
    filter?: Partial<IBanner>;
    tenantId?: string;
    session?: ClientSession;
  }): Promise<{ banners: IBanner[]; total: number; page: number; totalPages: number }> {
    const Banner = mongoose.models.Banner as Model<IBanner>;
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;
    
    try {
      const query: FilterQuery<IBanner> = { ...options.filter };
      
      if (options.tenantId) {
        query.tenantId = options.tenantId;
      }
      
      const findQuery = Banner.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const countQuery = Banner.countDocuments(query);
      
      if (options.session) {
        findQuery.session(options.session);
        countQuery.session(options.session);
      }
      
      const [banners, total] = await Promise.all([
        findQuery.lean(),
        countQuery,
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      return { banners, total, page, totalPages };
      
    } catch (error) {
      logger.error('[listBanners] Error:', error);
      throw error;
    }
  }
  
  /**
   * Toggle banner active status
   */
  async function toggleBanner(
    bannerId: string,
    session?: ClientSession
  ): Promise<IBanner | null> {
    const Banner = mongoose.models.Banner as Model<IBanner>;
    
    try {
      const findQuery = Banner.findOne({ bannerId });
      
      if (session) {
        findQuery.session(session);
      }
      
      const banner = await findQuery;
      
      if (!banner) {
        logger.warn(`[toggleBanner] Banner not found: ${bannerId}`);
        return null;
      }
      
      banner.isActive = !banner.isActive;
      await banner.save({ session });
      
      logger.info(
        `[toggleBanner] Toggled banner ${bannerId} to ${banner.isActive ? 'active' : 'inactive'}`
      );
      
      return banner;
      
    } catch (error) {
      logger.error('[toggleBanner] Error:', error);
      throw error;
    }
  }
  
  /**
   * Get banner by ID
   */
  async function getBannerById(
    bannerId: string,
    session?: ClientSession
  ): Promise<IBanner | null> {
    const Banner = mongoose.models.Banner as Model<IBanner>;
    
    try {
      const query = Banner.findOne({ bannerId });
      
      if (session) {
        query.session(session);
      }
      
      return await query.lean();
      
    } catch (error) {
      logger.error('[getBannerById] Error:', error);
      throw error;
    }
  }
  
  // ===== Validation Helpers =====
  
  async function validateRolesExist(roleIds: string[]): Promise<void> {
    const Role = mongoose.models.Role as Model<IRole>;
    
    const existingRoles = await Role.find({ 
      name: { $in: roleIds } 
    }).select('name').lean();
    
    const existingNames = existingRoles.map(r => r.name);
    const missing = roleIds.filter(id => !existingNames.includes(id));
    
    if (missing.length > 0) {
      throw new Error(`Roles not found: ${missing.join(', ')}`);
    }
  }
  
  async function validateGroupsExist(groupIds: string[]): Promise<void> {
    const Group = mongoose.models.Group as Model<IGroup>;
    
    const objectIds = groupIds.map(id => {
      try {
        return new Types.ObjectId(id);
      } catch {
        throw new Error(`Invalid group ID: ${id}`);
      }
    });
    
    const existingGroups = await Group.find({ 
      _id: { $in: objectIds } 
    }).select('_id').lean();
    
    if (existingGroups.length !== groupIds.length) {
      throw new Error('Some groups do not exist');
    }
  }
  
  async function validateUsersExist(userIds: string[]): Promise<void> {
    const User = mongoose.models.User as Model<IUser>;
    
    const objectIds = userIds.map(id => {
      try {
        return new Types.ObjectId(id);
      } catch {
        throw new Error(`Invalid user ID: ${id}`);
      }
    });
    
    const existingUsers = await User.find({ 
      _id: { $in: objectIds } 
    }).select('_id').lean();
    
    if (existingUsers.length !== userIds.length) {
      throw new Error('Some users do not exist');
    }
  }
  
  return {
    getBanner,
    getActiveBanners,
    createBanner,
    updateBanner,
    deleteBanner,
    listBanners,
    toggleBanner,
    getBannerById,
    validateRolesExist,
    validateGroupsExist,
    validateUsersExist,
  };
}

export type BannerMethods = ReturnType<typeof createBannerMethods>;
```

---

## 3. Backend Routes

### 3.1. Admin Routes

**Archivo:** `api/server/routes/admin/banners.js`

```javascript
const express = require('express');
const { logger } = require('@librechat/data-schemas');
const { requireJwtAuth, requireRole } = require('~/server/middleware');
const { 
  createBanner, 
  updateBanner, 
  deleteBanner,
  listBanners,
  getBannerById,
  toggleBanner,
} = require('~/models');

const router = express.Router();

// All routes require authentication and ADMIN role
router.use(requireJwtAuth);
router.use(requireRole(['ADMIN']));

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
    
    const banner = await createBanner(bannerData);
    
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
    
    const result = await listBanners({
      page: parseInt(page),
      limit: parseInt(limit),
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
    const banner = await getBannerById(id);
    
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
    
    const banner = await updateBanner(id, req.body);
    
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
    const deleted = await deleteBanner(id);
    
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
    const banner = await toggleBanner(id);
    
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
```

### 3.2. Public Routes

**Archivo:** `api/server/routes/banner.js` (actualizado)

```javascript
const express = require('express');
const { logger } = require('@librechat/data-schemas');
const optionalJwtAuth = require('~/server/middleware/optionalJwtAuth');
const { getBanner, getActiveBanners } = require('~/models');

const router = express.Router();

/**
 * GET /api/banner
 * Legacy route - returns single banner (backward compatible)
 */
router.get('/', optionalJwtAuth, async (req, res) => {
  try {
    const banner = await getBanner(req.user);
    res.status(200).send(banner);
  } catch (error) {
    logger.error('[GET /api/banner] Error:', error);
    res.status(500).json({ message: 'Error getting banner' });
  }
});

/**
 * GET /api/banners
 * New route - returns array of active banners
 */
router.get('/s', optionalJwtAuth, async (req, res) => {
  try {
    const { limit = '10' } = req.query;
    const banners = await getActiveBanners(req.user, {
      limit: parseInt(limit),
    });
    res.status(200).json(banners);
  } catch (error) {
    logger.error('[GET /api/banners] Error:', error);
    res.status(500).json({ message: 'Error getting banners' });
  }
});

module.exports = router;
```

### 3.3. Register Routes

**Archivo:** `api/server/routes/index.js` (agregar línea)

```javascript
// ... existing routes ...

// Banner routes
app.use('/api/banner', require('./routes/banner'));

// Admin banner routes
app.use('/api/admin/banners', require('./routes/admin/banners'));

// ... more routes ...
```

---

## 4. Frontend Components

### 4.1. BannerCarousel Component

**Archivo:** `client/src/components/Banners/BannerCarousel.tsx`

```typescript
import { useEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react';
import { useRecoilState } from 'recoil';
import type { TBanner } from 'librechat-data-provider';
import { Button, cn } from '@librechat/client';
import { useGetActiveBannersQuery } from '~/data-provider';
import store from '~/store';

export const BannerCarousel = ({ 
  onHeightChange 
}: { 
  onHeightChange?: (height: number) => void 
}) => {
  const { data: banners = [] } = useGetActiveBannersQuery();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hiddenBannerIds, setHiddenBannerIds] = useRecoilState<string[]>(
    store.hiddenBannerIds
  );
  const bannerRef = useRef<HTMLDivElement>(null);
  
  // Filter out banners that user has dismissed
  const visibleBanners = banners.filter(banner => {
    if (banner.persistable) {
      return true; // Always show persistable banners
    }
    return !hiddenBannerIds.includes(banner.bannerId);
  });
  
  // Update height when banners change
  useEffect(() => {
    if (onHeightChange && bannerRef.current) {
      const height = visibleBanners.length > 0 
        ? bannerRef.current.offsetHeight 
        : 0;
      onHeightChange(height);
    }
  }, [visibleBanners, onHeightChange]);
  
  // Reset index if it's out of bounds
  useEffect(() => {
    if (currentIndex >= visibleBanners.length && visibleBanners.length > 0) {
      setCurrentIndex(0);
    }
  }, [visibleBanners.length, currentIndex]);
  
  if (visibleBanners.length === 0) {
    return null;
  }
  
  const currentBanner = visibleBanners[currentIndex];
  const hasMultipleBanners = visibleBanners.length > 1;
  
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % visibleBanners.length);
  };
  
  const handlePrev = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? visibleBanners.length - 1 : prev - 1
    );
  };
  
  const handleDismiss = () => {
    if (!currentBanner.persistable) {
      // Add to hidden list
      setHiddenBannerIds([...hiddenBannerIds, currentBanner.bannerId]);
      
      // If this was the last banner, notify parent
      if (visibleBanners.length === 1 && onHeightChange) {
        onHeightChange(0);
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'Escape' && !currentBanner.persistable) {
      handleDismiss();
    }
  };
  
  return (
    <div
      ref={bannerRef}
      className="
        sticky top-0 z-20 
        flex items-center justify-between 
        bg-gradient-to-r from-blue-600 to-blue-700
        px-2 py-2 
        text-white 
        dark:from-blue-800 dark:to-blue-900
      "
      role="region"
      aria-label="Announcements banner"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Previous button */}
      {hasMultipleBanners && (
        <Button
          size="icon"
          variant="ghost"
          aria-label="Previous banner"
          className="size-8 shrink-0 text-white hover:bg-white/20"
          onClick={handlePrev}
        >
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
        </Button>
      )}
      
      {/* Banner content */}
      <div 
        className={cn(
          'flex-1 text-center px-4 text-sm md:text-base',
          '[&_a]:text-blue-100 [&_a]:underline hover:[&_a]:text-white',
          'transition-all duration-300 ease-in-out'
        )}
        dangerouslySetInnerHTML={{ __html: currentBanner.message }}
      />
      
      {/* Next button */}
      {hasMultipleBanners && (
        <Button
          size="icon"
          variant="ghost"
          aria-label="Next banner"
          className="size-8 shrink-0 text-white hover:bg-white/20"
          onClick={handleNext}
        >
          <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
        </Button>
      )}
      
      {/* Indicators */}
      {hasMultipleBanners && (
        <div className="flex items-center gap-1 mx-2">
          {visibleBanners.map((_, idx) => (
            <button
              key={idx}
              className={cn(
                'h-2 w-2 rounded-full transition-all',
                idx === currentIndex 
                  ? 'bg-white w-4' 
                  : 'bg-white/50 hover:bg-white/70'
              )}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to banner ${idx + 1}`}
              aria-current={idx === currentIndex}
            />
          ))}
        </div>
      )}
      
      {/* Dismiss button */}
      {!currentBanner.persistable && (
        <Button
          size="icon"
          variant="ghost"
          aria-label="Dismiss banner"
          className="size-8 shrink-0 text-white hover:bg-white/20"
          onClick={handleDismiss}
        >
          <XIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
};
```

### 4.2. Data Provider

**Archivo:** `client/src/data-provider/Misc/queries.ts` (actualizar)

```typescript
import { useQuery } from '@tanstack/react-query';
import type * as t from 'librechat-data-provider';
import { dataService, QueryKeys } from '~/data-provider';

/**
 * Legacy hook - returns single banner
 */
export const useGetBannerQuery = (
  config?: { enabled?: boolean }
) => {
  return useQuery<t.TBannerResponse>(
    [QueryKeys.banner], 
    () => dataService.getBanner(), 
    {
      enabled: config?.enabled !== false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

/**
 * New hook - returns array of active banners
 */
export const useGetActiveBannersQuery = (
  config?: { enabled?: boolean; limit?: number }
) => {
  return useQuery<t.TBannersResponse>(
    [QueryKeys.banners, config?.limit], 
    () => dataService.getActiveBanners(config?.limit),
    {
      enabled: config?.enabled !== false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};
```

**Archivo:** `client/src/data-provider/data-service.ts` (actualizar)

```typescript
// Existing method
export function getBanner(): Promise<t.TBannerResponse> {
  return request.get('/api/banner');
}

// New method
export function getActiveBanners(limit?: number): Promise<t.TBannersResponse> {
  const params = limit ? `?limit=${limit}` : '';
  return request.get(`/api/banners${params}`);
}
```

### 4.3. Recoil State

**Archivo:** `client/src/store/banners.ts` (nuevo)

```typescript
import { atom } from 'recoil';

/**
 * Store dismissed banner IDs in localStorage
 */
export const hiddenBannerIds = atom<string[]>({
  key: 'hiddenBannerIds',
  default: [],
  effects: [
    ({ setSelf, onSet }) => {
      // Read from localStorage on init
      const savedValue = localStorage.getItem('hiddenBannerIds');
      if (savedValue != null) {
        try {
          setSelf(JSON.parse(savedValue));
        } catch {
          // Ignore parse errors
        }
      }

      // Write to localStorage on changes
      onSet((newValue, _, isReset) => {
        if (isReset) {
          localStorage.removeItem('hiddenBannerIds');
        } else {
          localStorage.setItem('hiddenBannerIds', JSON.stringify(newValue));
        }
      });
    },
  ],
});
```

**Archivo:** `client/src/store/index.ts` (actualizar)

```typescript
// ... existing exports ...
export { hiddenBannerIds } from './banners';
```

---

## 5. Admin Panel

### 5.1. Banner List Page

**Archivo:** `client/src/components/Admin/Banners/BannersListPage.tsx`

```typescript
import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Table } from '@librechat/client';
import { 
  useListBannersQuery,
  useDeleteBannerMutation,
  useToggleBannerMutation,
} from '~/data-provider';
import { BannerListRow } from './BannerListRow';

export const BannersListPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    audienceMode: '',
    isActive: '',
  });
  
  const { data, isLoading } = useListBannersQuery({ 
    page, 
    limit: 20,
    ...filters,
  });
  
  const deleteBanner = useDeleteBannerMutation();
  const toggleBanner = useToggleBannerMutation();
  
  const handleCreate = () => {
    navigate('/admin/banners/new');
  };
  
  const handleEdit = (bannerId: string) => {
    navigate(`/admin/banners/${bannerId}/edit`);
  };
  
  const handleDelete = async (bannerId: string) => {
    if (confirm('Are you sure you want to delete this banner?')) {
      try {
        await deleteBanner.mutateAsync(bannerId);
      } catch (error) {
        console.error('Error deleting banner:', error);
      }
    }
  };
  
  const handleToggle = async (bannerId: string) => {
    try {
      await toggleBanner.mutateAsync(bannerId);
    } catch (error) {
      console.error('Error toggling banner:', error);
    }
  };
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Banners</h1>
        <Button onClick={handleCreate}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Banner
        </Button>
      </div>
      
      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <select
          value={filters.audienceMode}
          onChange={(e) => setFilters({ ...filters, audienceMode: e.target.value })}
          className="rounded border px-3 py-2"
        >
          <option value="">All Audiences</option>
          <option value="global">Global</option>
          <option value="role">Role</option>
          <option value="group">Group</option>
          <option value="user">User</option>
        </select>
        
        <select
          value={filters.isActive}
          onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
          className="rounded border px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Message
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Audience
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Dates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.banners.map((banner) => (
              <BannerListRow
                key={banner.bannerId}
                banner={banner}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing {data?.banners.length || 0} of {data?.total || 0} banners
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!data?.totalPages || page >= data.totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
```

---

## 6. Migration Script

**Archivo:** `config/migrate-banners.js`

```javascript
const path = require('path');
const mongoose = require('mongoose');
const { Banner } = require('@librechat/data-schemas').createModels(mongoose);
require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });
const { silentExit } = require('./helpers');
const connect = require('./connect');

(async () => {
  await connect();

  console.purple('--------------------------');
  console.purple('Migrate Legacy Banners');
  console.purple('--------------------------');

  try {
    // Find all banners without audienceMode (legacy banners)
    const legacyBanners = await Banner.find({
      audienceMode: { $exists: false },
    });

    console.log(`Found ${legacyBanners.length} legacy banners to migrate`);

    if (legacyBanners.length === 0) {
      console.green('No legacy banners to migrate. All done!');
      silentExit(0);
      return;
    }

    // Update each legacy banner
    let updated = 0;
    for (const banner of legacyBanners) {
      await Banner.updateOne(
        { _id: banner._id },
        {
          $set: {
            audienceMode: 'global',
            isActive: true,
            priority: 50,
            order: 0,
            viewCount: 0,
            dismissCount: 0,
          },
        }
      );
      updated++;
      console.log(`Migrated banner: ${banner.bannerId}`);
    }

    console.green(`Successfully migrated ${updated} banners!`);
    silentExit(0);
  } catch (error) {
    console.red('Error during migration:');
    console.error(error);
    silentExit(1);
  }
})();

process.on('uncaughtException', (err) => {
  if (!err.message.includes('fetch failed')) {
    console.error('There was an uncaught error:');
    console.error(err);
  }

  if (!err.message.includes('fetch failed')) {
    process.exit(1);
  }
});
```

---

## 7. Tests

### 7.1. Backend Unit Test

**Archivo:** `packages/data-schemas/src/methods/banner.spec.ts`

```typescript
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SystemRoles } from 'librechat-data-provider';
import type { IUser, IBanner, IGroup, IRole } from '~/types';
import { createBannerMethods } from './banner';
import { createUserGroupMethods } from './userGroup';
import bannerSchema from '~/schema/banner';
import userSchema from '~/schema/user';
import groupSchema from '~/schema/group';
import roleSchema from '~/schema/role';

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

let mongoServer: MongoMemoryServer;
let Banner: mongoose.Model<IBanner>;
let User: mongoose.Model<IUser>;
let Group: mongoose.Model<IGroup>;
let Role: mongoose.Model<IRole>;
let methods: ReturnType<typeof createBannerMethods>;
let userGroupMethods: ReturnType<typeof createUserGroupMethods>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  Banner = mongoose.models.Banner || mongoose.model<IBanner>('Banner', bannerSchema);
  User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
  Group = mongoose.models.Group || mongoose.model<IGroup>('Group', groupSchema);
  Role = mongoose.models.Role || mongoose.model<IRole>('Role', roleSchema);

  methods = createBannerMethods(mongoose);
  userGroupMethods = createUserGroupMethods(mongoose);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Banner.deleteMany({});
  await User.deleteMany({});
  await Group.deleteMany({});
  await Role.deleteMany({});
});

describe('getActiveBanners', () => {
  test('should return public banners when no user', async () => {
    // Create public banner
    await Banner.create({
      bannerId: 'banner-1',
      message: 'Public banner',
      displayFrom: new Date(),
      isPublic: true,
      isActive: true,
    });

    // Create private banner
    await Banner.create({
      bannerId: 'banner-2',
      message: 'Private banner',
      displayFrom: new Date(),
      isPublic: false,
      isActive: true,
    });

    const banners = await methods.getActiveBanners(null);

    expect(banners).toHaveLength(1);
    expect(banners[0].bannerId).toBe('banner-1');
  });

  test('should return global banners for authenticated user', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      role: SystemRoles.USER,
    });

    await Banner.create({
      bannerId: 'banner-1',
      message: 'Global banner',
      displayFrom: new Date(),
      audienceMode: 'global',
      isActive: true,
    });

    const banners = await methods.getActiveBanners(user);

    expect(banners).toHaveLength(1);
    expect(banners[0].bannerId).toBe('banner-1');
  });

  test('should return role-specific banners', async () => {
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      role: SystemRoles.ADMIN,
    });

    const regularUser = await User.create({
      name: 'Regular User',
      email: 'user@example.com',
      role: SystemRoles.USER,
    });

    await Banner.create({
      bannerId: 'banner-admin',
      message: 'Admin only banner',
      displayFrom: new Date(),
      audienceMode: 'role',
      targetRoleIds: [SystemRoles.ADMIN],
      isActive: true,
    });

    // Admin should see it
    const adminBanners = await methods.getActiveBanners(adminUser);
    expect(adminBanners).toHaveLength(1);
    expect(adminBanners[0].bannerId).toBe('banner-admin');

    // Regular user should not
    const userBanners = await methods.getActiveBanners(regularUser);
    expect(userBanners).toHaveLength(0);
  });

  test('should return group-specific banners', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      idOnTheSource: 'user-1',
    });

    const group = await Group.create({
      name: 'Developers',
      source: 'local',
      memberIds: ['user-1'],
    });

    await Banner.create({
      bannerId: 'banner-devs',
      message: 'Developers banner',
      displayFrom: new Date(),
      audienceMode: 'group',
      targetGroupIds: [group._id.toString()],
      isActive: true,
    });

    const banners = await methods.getActiveBanners(user);

    expect(banners).toHaveLength(1);
    expect(banners[0].bannerId).toBe('banner-devs');
  });

  test('should respect date ranges', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    // Future banner (not active yet)
    await Banner.create({
      bannerId: 'banner-future',
      message: 'Future banner',
      displayFrom: new Date(Date.now() + 86400000), // tomorrow
      audienceMode: 'global',
      isActive: true,
    });

    // Past banner (expired)
    await Banner.create({
      bannerId: 'banner-past',
      message: 'Past banner',
      displayFrom: new Date(Date.now() - 172800000), // 2 days ago
      displayTo: new Date(Date.now() - 86400000), // yesterday
      audienceMode: 'global',
      isActive: true,
    });

    // Current banner
    await Banner.create({
      bannerId: 'banner-current',
      message: 'Current banner',
      displayFrom: new Date(),
      audienceMode: 'global',
      isActive: true,
    });

    const banners = await methods.getActiveBanners(user);

    expect(banners).toHaveLength(1);
    expect(banners[0].bannerId).toBe('banner-current');
  });

  test('should respect isActive flag', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    await Banner.create({
      bannerId: 'banner-inactive',
      message: 'Inactive banner',
      displayFrom: new Date(),
      audienceMode: 'global',
      isActive: false,
    });

    const banners = await methods.getActiveBanners(user);

    expect(banners).toHaveLength(0);
  });

  test('should sort by priority DESC, order ASC', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    await Banner.create({
      bannerId: 'banner-1',
      message: 'Banner 1',
      displayFrom: new Date(),
      audienceMode: 'global',
      priority: 50,
      order: 2,
      isActive: true,
    });

    await Banner.create({
      bannerId: 'banner-2',
      message: 'Banner 2',
      displayFrom: new Date(),
      audienceMode: 'global',
      priority: 100,
      order: 1,
      isActive: true,
    });

    await Banner.create({
      bannerId: 'banner-3',
      message: 'Banner 3',
      displayFrom: new Date(),
      audienceMode: 'global',
      priority: 100,
      order: 0,
      isActive: true,
    });

    const banners = await methods.getActiveBanners(user);

    expect(banners).toHaveLength(3);
    expect(banners[0].bannerId).toBe('banner-3'); // priority 100, order 0
    expect(banners[1].bannerId).toBe('banner-2'); // priority 100, order 1
    expect(banners[2].bannerId).toBe('banner-1'); // priority 50, order 2
  });
});

describe('createBanner', () => {
  test('should create a banner with valid data', async () => {
    const banner = await methods.createBanner({
      message: '<p>Test banner</p>',
      displayFrom: new Date(),
      audienceMode: 'global',
      isPublic: true,
    });

    expect(banner.bannerId).toBeDefined();
    expect(banner.message).toBe('<p>Test banner</p>');
    expect(banner.isActive).toBe(true);
    expect(banner.priority).toBe(50);
  });

  test('should throw error for empty message', async () => {
    await expect(
      methods.createBanner({
        message: '',
        displayFrom: new Date(),
      })
    ).rejects.toThrow('Banner message is required');
  });

  test('should throw error for invalid date range', async () => {
    await expect(
      methods.createBanner({
        message: 'Test',
        displayFrom: new Date('2025-01-01'),
        displayTo: new Date('2024-01-01'),
      })
    ).rejects.toThrow('must be after');
  });
});
```

---

Este documento contiene los ejemplos de implementación más importantes. ¿Necesitas algún ejemplo adicional o aclaración sobre alguna parte?
