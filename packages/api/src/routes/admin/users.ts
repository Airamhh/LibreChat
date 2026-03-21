import mongoose from 'mongoose';
import { Keyv } from 'keyv';
import { Router } from 'express';
import { logger, balanceSchema, userSchema } from '@librechat/data-schemas';
import { ViolationTypes } from 'librechat-data-provider';
import { keyvMongo } from '~/cache';
import { requireAdmin } from '~/middleware';
import type { Response } from 'express';
import type { ServerRequest } from '~/types/http';
import type { IBalance, IUser } from '@librechat/data-schemas';

const router = Router();
router.use(requireAdmin);

const BAN_DURATION_MS = parseInt(process.env['BAN_DURATION'] ?? '0', 10);

const SENSITIVE_FIELDS = new Set(['password', 'totpSecret', 'backupCodes', 'pendingTotpSecret', 'pendingBackupCodes']);

function getBanLogs(): Keyv {
  return new Keyv({ store: keyvMongo, namespace: ViolationTypes.BAN, ttl: 0 });
}

function getModels() {
  const User: mongoose.Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>('User', userSchema);
  const Balance: mongoose.Model<IBalance> =
    mongoose.models.Balance || mongoose.model<IBalance>('Balance', balanceSchema);
  return { User, Balance };
}

/**
 * GET /api/admin/users
 * List users with optional search and pagination
 */
router.get('/', async (req: ServerRequest, res: Response) => {
  try {
    const { User } = getModels();
    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10)));
    const search = String(req.query['search'] ?? '').trim();

    const filter: mongoose.FilterQuery<IUser> = search
      ? { $or: [{ email: new RegExp(search, 'i') }, { name: new RegExp(search, 'i') }] }
      : {};

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -totpSecret -backupCodes')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      User.countDocuments(filter).exec(),
    ]);

    res.status(200).json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error('[admin/users] GET error:', error);
    res.status(500).json({ message: 'Failed to list users' });
  }
});

/**
 * PATCH /api/admin/users/:userId
 * Update user name, email, or role
 */
router.patch('/:userId', async (req: ServerRequest, res: Response) => {
  try {
    const { User } = getModels();
    const { userId } = req.params as { userId: string };
    const body = req.body as Record<string, unknown>;

    const sensitiveAttempts = Object.keys(body).filter((k) => SENSITIVE_FIELDS.has(k));
    if (sensitiveAttempts.length > 0) {
      return res.status(400).json({ message: `Cannot update sensitive fields: ${sensitiveAttempts.join(', ')}` });
    }

    const { name, email, role } = body as { name?: string; email?: string; role?: string };
    const updates: Partial<IUser> = {};
    if (name !== undefined) {
      updates.name = name;
    }
    if (email !== undefined) {
      updates.email = email.toLowerCase().trim();
    }
    if (role !== undefined) {
      updates.role = role;
    }

    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, lean: true })
      .select('-password -totpSecret -backupCodes')
      .exec();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    logger.error('[admin/users] PATCH error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

/**
 * POST /api/admin/users/:userId/ban
 * Ban a user by writing to the BAN log store
 */
router.post('/:userId/ban', async (req: ServerRequest, res: Response) => {
  try {
    const { userId } = req.params as { userId: string };
    const { duration } = req.body as { duration?: number };

    const banDuration = duration ?? BAN_DURATION_MS;
    const banLogs = getBanLogs();
    const expiresAt = banDuration > 0 ? Date.now() + banDuration : 0;
    await banLogs.set(userId, {
      type: ViolationTypes.BAN,
      violation_count: 1,
      duration: banDuration,
      expiresAt,
    });

    logger.info(`[admin/users] Banned user ${userId}`);
    res.status(200).json({ message: 'User banned successfully' });
  } catch (error) {
    logger.error('[admin/users] POST /ban error:', error);
    res.status(500).json({ message: 'Failed to ban user' });
  }
});

/**
 * DELETE /api/admin/users/:userId/ban
 * Unban a user by removing from BAN log store
 */
router.delete('/:userId/ban', async (req: ServerRequest, res: Response) => {
  try {
    const { userId } = req.params as { userId: string };

    const banLogs = getBanLogs();
    await banLogs.delete(userId);

    logger.info(`[admin/users] Unbanned user ${userId}`);
    res.status(200).json({ message: 'User unbanned successfully' });
  } catch (error) {
    logger.error('[admin/users] DELETE /ban error:', error);
    res.status(500).json({ message: 'Failed to unban user' });
  }
});

/**
 * GET /api/admin/users/:userId/balance
 * Get user balance
 */
router.get('/:userId/balance', async (req: ServerRequest, res: Response) => {
  try {
    const { Balance } = getModels();
    const { userId } = req.params as { userId: string };

    const balance = await Balance.findOne({ user: new mongoose.Types.ObjectId(userId) })
      .lean()
      .exec();

    if (!balance) {
      return res.status(404).json({ message: 'Balance not found' });
    }

    res.status(200).json(balance);
  } catch (error) {
    logger.error('[admin/users] GET /balance error:', error);
    res.status(500).json({ message: 'Failed to get user balance' });
  }
});

/**
 * PATCH /api/admin/users/:userId/balance
 * Update user balance and auto-refill settings
 */
router.patch('/:userId/balance', async (req: ServerRequest, res: Response) => {
  try {
    const { Balance } = getModels();
    const { userId } = req.params as { userId: string };
    const { tokenCredits, autoRefillEnabled, refillIntervalValue, refillIntervalUnit, refillAmount } =
      req.body as Partial<IBalance>;

    const updates: Partial<IBalance> = {};
    if (tokenCredits !== undefined) {
      updates.tokenCredits = tokenCredits;
    }
    if (autoRefillEnabled !== undefined) {
      updates.autoRefillEnabled = autoRefillEnabled;
    }
    if (refillIntervalValue !== undefined) {
      updates.refillIntervalValue = refillIntervalValue;
    }
    if (refillIntervalUnit !== undefined) {
      updates.refillIntervalUnit = refillIntervalUnit;
    }
    if (refillAmount !== undefined) {
      updates.refillAmount = refillAmount;
    }

    const balance = await Balance.findOneAndUpdate(
      { user: new mongoose.Types.ObjectId(userId) },
      { $set: updates },
      { upsert: true, new: true, lean: true },
    ).exec();

    res.status(200).json(balance);
  } catch (error) {
    logger.error('[admin/users] PATCH /balance error:', error);
    res.status(500).json({ message: 'Failed to update user balance' });
  }
});

export default router;

