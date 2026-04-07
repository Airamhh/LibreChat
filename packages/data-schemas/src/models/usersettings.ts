import userSettingsSchema from '~/schema/usersettings';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import type * as t from '~/types';

export function createUserSettingsModel(mongoose: typeof import('mongoose')) {
  applyTenantIsolation(userSettingsSchema);
  return (
    mongoose.models.UserSettings ||
    mongoose.model<t.IUserSettingsDocument>('UserSettings', userSettingsSchema)
  );
}
