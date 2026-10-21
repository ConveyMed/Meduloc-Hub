/**
 * Organization code flag
 * The code screen is asked once per device, ever. The "passed" flag lives in
 * Capacitor Preferences (UserDefaults / SharedPreferences on the phone), which
 * iOS does not evict the way it can evict WebView localStorage. localStorage is
 * kept as a mirror and as the fallback on web or when the native plugin is not
 * installed yet. Sign-out and "clear cache" must never remove it.
 */

import { Preferences } from '@capacitor/preferences';

export const ORG_CODE_KEY = 'org_code_verified';

// Keys "clear cache" must put back after localStorage.clear(). The second one
// is where Preferences stores the value on web.
export const ORG_CODE_STORAGE_KEYS = [ORG_CODE_KEY, `CapacitorStorage.${ORG_CODE_KEY}`];

const readLocal = () => {
  try {
    return localStorage.getItem(ORG_CODE_KEY) === 'true';
  } catch (e) {
    return false;
  }
};

const writeLocal = () => {
  try {
    localStorage.setItem(ORG_CODE_KEY, 'true');
  } catch (e) {
    // Storage unavailable; Preferences still holds it
  }
};

/**
 * Fast synchronous answer for the first render. Only a "true" is trusted;
 * false means "not known yet", so the caller waits for loadOrgCodeVerified.
 */
export const isOrgCodeVerifiedSync = () => readLocal();

/**
 * Read the flag from Preferences, migrating an older localStorage-only flag.
 */
export const loadOrgCodeVerified = async () => {
  const local = readLocal();
  try {
    const { value } = await Preferences.get({ key: ORG_CODE_KEY });
    if (value === 'true') {
      if (!local) writeLocal();
      return true;
    }
    if (local) {
      await Preferences.set({ key: ORG_CODE_KEY, value: 'true' });
      return true;
    }
    return false;
  } catch (e) {
    console.log('[OrgCode] Preferences unavailable, using localStorage:', e?.message || e);
    return local;
  }
};

/**
 * Record that this device has passed the code screen.
 */
export const markOrgCodeVerified = async () => {
  writeLocal();
  try {
    await Preferences.set({ key: ORG_CODE_KEY, value: 'true' });
  } catch (e) {
    console.log('[OrgCode] Preferences unavailable, saved to localStorage only:', e?.message || e);
  }
};
