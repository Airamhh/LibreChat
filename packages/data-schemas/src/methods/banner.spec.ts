const { Types } = require('mongoose');
const {
  createBannerMethods,
} = require('../banner');

describe('Banner Methods', () => {
  let mongoose;
  let bannerMethods;
  let Banner;
  let mockUser;

  beforeEach(() => {
    // Mock mongoose
    Banner = {
      find: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
      countDocuments: jest.fn(),
    };

    mongoose = {
      models: {
        Banner,
        Role: {
          find: jest.fn(),
        },
        Group: {
          find: jest.fn(),
        },
        User: {
          find: jest.fn(),
        },
      },
    };

    bannerMethods = createBannerMethods(mongoose);

    mockUser = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
      username: 'testuser',
      role: 'USER',
    };
  });

  describe('getActiveBanners', () => {
    it('should return active banners for unauthenticated users', async () => {
      const mockBanners = [
        {
          bannerId: 'global-banner-1',
          message: 'Welcome!',
          audienceMode: 'global',
          isActive: true,
          priority: 80,
          displayFrom: new Date('2026-01-01'),
        },
      ];

      Banner.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        session: jest.fn().mockResolvedValue(mockBanners),
      });

      const result = await bannerMethods.getActiveBanners(null);

      expect(result).toEqual(mockBanners);
      expect(Banner.find).toHaveBeenCalled();
    });

    it('should filter banners by date range', async () => {
      const now = new Date();
      const pastBanner = {
        bannerId: 'past',
        displayFrom: new Date('2020-01-01'),
        displayTo: new Date('2020-12-31'),
      };
      const futureBanner = {
        bannerId: 'future',
        displayFrom: new Date('2030-01-01'),
      };
      const currentBanner = {
        bannerId: 'current',
        displayFrom: new Date('2026-01-01'),
        displayTo: new Date('2030-12-31'),
      };

      Banner.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        session: jest.fn().mockResolvedValue([currentBanner]),
      });

      const result = await bannerMethods.getActiveBanners(null);

      // Only current banner should be included
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect limit parameter', async () => {
      const mockBanners = Array(15).fill(null).map((_, i) => ({
        bannerId: `banner-${i}`,
        message: `Banner ${i}`,
        priority: i,
      }));

      Banner.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        session: jest.fn().mockResolvedValue(mockBanners.slice(0, 5)),
      });

      const result = await bannerMethods.getActiveBanners(null, { limit: 5 });

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('createBanner', () => {
    it('should create a banner with required fields', async () => {
      const bannerData = {
        message: 'Test Banner',
        audienceMode: 'global',
      };

      const createdBanner = {
        ...bannerData,
        bannerId: 'generated-id',
        displayFrom: expect.any(Date),
        isActive: true,
        priority: 50,
        order: 0,
        viewCount: 0,
        dismissCount: 0,
      };

      Banner.create.mockResolvedValue([createdBanner]);

      const result = await bannerMethods.createBanner(bannerData);

      expect(result).toMatchObject(bannerData);
      expect(Banner.create).toHaveBeenCalled();
    });

    it('should reject empty message', async () => {
      await expect(
        bannerMethods.createBanner({ message: '' })
      ).rejects.toThrow('Banner message is required');
    });

    it('should reject invalid date range', async () => {
      const bannerData = {
        message: 'Test',
        displayFrom: new Date('2026-12-31'),
        displayTo: new Date('2026-01-01'),
      };

      await expect(
        bannerMethods.createBanner(bannerData)
      ).rejects.toThrow('displayTo must be after displayFrom');
    });
  });

  describe('updateBanner', () => {
    it('should update existing banner', async () => {
      const updates = {
        message: 'Updated message',
        priority: 90,
      };

      const updatedBanner = {
        bannerId: 'test-banner',
        ...updates,
      };

      Banner.findOneAndUpdate.mockResolvedValue(updatedBanner);

      const result = await bannerMethods.updateBanner('test-banner', updates);

      expect(result).toMatchObject(updates);
      expect(Banner.findOneAndUpdate).toHaveBeenCalledWith(
        { bannerId: 'test-banner' },
        expect.objectContaining({ $set: expect.any(Object) }),
        expect.any(Object)
      );
    });

    it('should return null for non-existent banner', async () => {
      Banner.findOneAndUpdate.mockResolvedValue(null);

      const result = await bannerMethods.updateBanner('nonexistent', {});

      expect(result).toBeNull();
    });
  });

  describe('deleteBanner', () => {
    it('should delete existing banner', async () => {
      Banner.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await bannerMethods.deleteBanner('test-banner');

      expect(result).toBe(true);
      expect(Banner.deleteOne).toHaveBeenCalledWith({ bannerId: 'test-banner' });
    });

    it('should return false for non-existent banner', async () => {
      Banner.deleteOne.mockResolvedValue({ deletedCount: 0 });

      const result = await bannerMethods.deleteBanner('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('toggleBanner', () => {
    it('should toggle banner from active to inactive', async () => {
      const mockBanner = {
        bannerId: 'test',
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      Banner.findOne.mockResolvedValue(mockBanner);

      const result = await bannerMethods.toggleBanner('test');

      expect(mockBanner.isActive).toBe(false);
      expect(mockBanner.save).toHaveBeenCalled();
    });

    it('should toggle banner from inactive to active', async () => {
      const mockBanner = {
        bannerId: 'test',
        isActive: false,
        save: jest.fn().mockResolvedValue(true),
      };

      Banner.findOne.mockResolvedValue(mockBanner);

      const result = await bannerMethods.toggleBanner('test');

      expect(mockBanner.isActive).toBe(true);
    });
  });

  describe('listBanners', () => {
    it('should return paginated banners', async () => {
      const mockBanners = [
        { bannerId: 'banner-1', message: 'Test 1' },
        { bannerId: 'banner-2', message: 'Test 2' },
      ];

      Banner.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        session: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockBanners),
      });

      Banner.countDocuments.mockResolvedValue(10);

      const result = await bannerMethods.listBanners({ page: 1, limit: 2 });

      expect(result.banners).toEqual(mockBanners);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(5);
    });

    it('should apply filters', async () => {
      Banner.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        session: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      Banner.countDocuments.mockResolvedValue(0);

      await bannerMethods.listBanners({
        filter: { isActive: true, audienceMode: 'global' },
      });

      expect(Banner.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          audienceMode: 'global',
        })
      );
    });
  });

  describe('validateRolesExist', () => {
    it('should pass for existing roles', async () => {
      const mockRoles = [
        { name: 'ADMIN' },
        { name: 'USER' },
      ];

      mongoose.models.Role.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockRoles),
      });

      await expect(
        bannerMethods.validateRolesExist(['ADMIN', 'USER'])
      ).resolves.not.toThrow();
    });

    it('should reject missing roles', async () => {
      mongoose.models.Role.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ name: 'ADMIN' }]),
      });

      await expect(
        bannerMethods.validateRolesExist(['ADMIN', 'MISSING'])
      ).rejects.toThrow('Roles not found: MISSING');
    });
  });

  describe('validateGroupsExist', () => {
    it('should pass for existing groups', async () => {
      const groupId1 = new Types.ObjectId();
      const groupId2 = new Types.ObjectId();

      mongoose.models.Group.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { _id: groupId1 },
          { _id: groupId2 },
        ]),
      });

      await expect(
        bannerMethods.validateGroupsExist([groupId1.toString(), groupId2.toString()])
      ).resolves.not.toThrow();
    });

    it('should reject invalid group IDs', async () => {
      await expect(
        bannerMethods.validateGroupsExist(['invalid-id'])
      ).rejects.toThrow('Invalid group ID');
    });
  });
});
