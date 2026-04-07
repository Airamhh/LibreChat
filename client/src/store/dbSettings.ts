import { atom } from 'recoil';
import type { RecoilState } from 'recoil';

/**
 * Helper to create atoms that sync with database user settings
 * These atoms will be initialized from the DB and updated through mutations
 */
export function atomWithDbSettings<T>(key: string, defaultValue: T): RecoilState<T> {
  return atom<T>({
    key,
    default: defaultValue,
    effects_UNSTABLE: [
      ({ setSelf, onSet, trigger }) => {
        if (trigger === 'get') {
          return;
        }

        onSet((newValue: T) => {
          try {
            localStorage.setItem(key, JSON.stringify(newValue));
          } catch (e) {
            console.error(`Error writing to localStorage key "${key}":`, e);
          }
        });
      },
    ],
  });
}
