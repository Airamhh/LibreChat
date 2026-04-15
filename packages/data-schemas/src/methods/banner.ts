import type { Model, ClientSession, FilterQuery } from 'mongoose';
import { Types } from 'mongoose';
import { v5 as uuidv5 } from 'uuid';
import { PrincipalType } from 'librechat-data-provider';
import DOMPurify from 'isomorphic-dompurify';
import logger from '~/config/winston';
import type { IBanner, IUser, IRole, IGroup } from '~/types';

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export function createBannerMethods(mongoose: typeof import('mongoose')) {
  /**
   * Get all active banners for a specific user based on their principals (role, groups).
   * Replaces the legacy getBanner() but maintains backward compatibility.
   * 
   * @param user - The user object (null for unauthenticated users)
   * @param options - Optional configuration (limit, session)
   * @returns Array of active banners sorted by priority
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
      const { getUserPrincipals } = require('./userGroup');
      const principals = await getUserPrincipals({
        userId: user._id,
        role: user.role,
      }, options?.session);
      
      // Extract role and group IDs from principals
      const roleIds = principals
        .filter((p: any) => p.principalType === PrincipalType.ROLE)
        .map((p: any) => p.principalId as string);
      
      const groupIds = principals
        .filter((p: any) => p.principalType === PrincipalType.GROUP)
        .map((p: any) => p.principalId as Types.ObjectId);
      
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
          ...(roleIds.length > 0 ? [{ 
            audienceMode: 'role',
            targetRoleIds: { $in: roleIds },
          }] : []),
          
          // Banners targeted to user's groups
          ...(groupIds.length > 0 ? [{ 
            audienceMode: 'group',
            targetGroupIds: { 
              $in: groupIds.map(id => id.toString()) 
            },
          }] : []),
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
   * Legacy method - returns first active banner.
   * Maintains backward compatibility with existing code.
   */
  async function getBanner(user?: IUser | null): Promise<IBanner | null> {
    try {
      const banners = await getActiveBanners(user, { limit: 1 });
      return banners[0] || null;
    } catch (error) {
      logger.error('[getBanner] Error getting banner', error);
      throw new Error('Error getting banners');
    }
  }
  
  /**
   * Create a new banner with validation.
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
      
      // Sanitize HTML message to prevent XSS
      const cleanMessage = DOMPurify.sanitize(data.message, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'span', 'div', 'ul', 'ol', 'li'],
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
   * Update an existing banner.
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
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'span', 'div', 'ul', 'ol', 'li'],
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
   * Delete a banner.
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
   * List banners with pagination and filters.
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
   * Toggle banner active status.
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
   * Get banner by ID.
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
  
  /**
   * Validate that roles exist in the database.
   */
  async function validateRolesExist(roleIds: string[]): Promise<void> {
    const Role = mongoose.models.Role as Model<IRole>;
    
    const existingRoles = await Role.find({ 
      name: { $in: roleIds } 
    }).select('name').lean();
    
    const existingNames = existingRoles.map((r: any) => r.name);
    const missing = roleIds.filter(id => !existingNames.includes(id));
    
    if (missing.length > 0) {
      throw new Error(`Roles not found: ${missing.join(', ')}`);
    }
  }
  
  /**
   * Validate that groups exist in the database.
   */
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
  
  /**
   * Validate that users exist in the database.
   */
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
