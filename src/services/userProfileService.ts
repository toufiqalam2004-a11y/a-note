import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDbInstance } from './db';

export type ProfessionType =
  | 'Video Editor'
  | 'Content Creator'
  | 'Photographer'
  | 'Freelancer'
  | 'Graphic Designer'
  | 'Other';

export const PROFESSIONS: ProfessionType[] = [
  'Video Editor',
  'Content Creator',
  'Photographer',
  'Freelancer',
  'Graphic Designer',
  'Other',
];

export interface UserProfile {
  displayName: string;
  profession: ProfessionType | string;
  studioName?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OnboardingStatus = 'completed' | 'skipped' | 'pending';

export const PROFILE_STORAGE_KEY = '@anote_user_profile_v1';
export const ONBOARDING_STATUS_KEY = '@anote_onboarding_status_v1';

// Legacy keys for backward compatibility
export const LEGACY_INTRO_KEY = '@anote_has_completed_intro';
export const LEGACY_SEEDED_KEY = '@anote_has_seeded_v1';

/**
 * Retrieves the saved user profile from local storage.
 * Returns null if no profile has been saved.
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: UserProfile = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.displayName) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.warn('[A Note Profile] Error retrieving profile:', error);
    return null;
  }
}

/**
 * Saves or updates user profile locally.
 */
export async function saveUserProfile(data: {
  displayName: string;
  profession: ProfessionType | string;
  studioName?: string;
}): Promise<UserProfile> {
  const trimmedName = data.displayName.trim();
  if (!trimmedName) {
    throw new Error('Display Name is required.');
  }

  const existing = await getUserProfile();
  const now = new Date().toISOString();

  const profile: UserProfile = {
    displayName: trimmedName,
    profession: (data.profession || 'Video Editor').trim(),
    studioName: data.studioName ? data.studioName.trim() : '',
    onboardingCompleted: true,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  await AsyncStorage.setItem(ONBOARDING_STATUS_KEY, 'completed');
  // Also keep legacy intro flag in sync
  await AsyncStorage.setItem(LEGACY_INTRO_KEY, 'true');

  return profile;
}

/**
 * Permanently skips onboarding for this installation.
 */
export async function skipOnboarding(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_STATUS_KEY, 'skipped');
    // Ensure legacy intro does not pop up either
    await AsyncStorage.setItem(LEGACY_INTRO_KEY, 'true');
  } catch (error) {
    console.warn('[A Note Profile] Error saving skipped status:', error);
  }
}

/**
 * Gets current onboarding status.
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  try {
    const status = await AsyncStorage.getItem(ONBOARDING_STATUS_KEY);
    if (status === 'completed' || status === 'skipped') {
      return status;
    }
    const profile = await getUserProfile();
    if (profile?.onboardingCompleted) {
      return 'completed';
    }
    return 'pending';
  } catch {
    return 'pending';
  }
}

/**
 * Determines if the onboarding screen should be displayed.
 *
 * Safe backward compatibility rules:
 * 1. Fresh installations -> returns true.
 * 2. If onboarding was completed or skipped -> returns false.
 * 3. Existing users (who used the app before Phase 7, detected via
 *    legacy intro flag or existing SQLite client data) -> returns false. They retain
 *    their existing data and open directly into Home.
 * 4. Safe against storage wiping or database read failures without crashing.
 */
export async function shouldShowOnboarding(hasExistingClients?: boolean): Promise<boolean> {
  try {
    // 1. Check if user already completed or skipped Phase 7 onboarding
    const status = await AsyncStorage.getItem(ONBOARDING_STATUS_KEY);
    if (status === 'completed' || status === 'skipped') {
      return false;
    }

    const profile = await getUserProfile();
    if (profile && profile.onboardingCompleted) {
      return false;
    }

    // 2. Check for existing installations (backward compatibility)
    // If user previously completed intro from Phase 1-6
    const hasCompletedLegacyIntro = await AsyncStorage.getItem(LEGACY_INTRO_KEY);
    if (hasCompletedLegacyIntro === 'true') {
      await AsyncStorage.setItem(ONBOARDING_STATUS_KEY, 'skipped');
      return false;
    }

    // 3. Detect existing SQLite client data when AsyncStorage onboarding flags are missing
    if (hasExistingClients === true) {
      await AsyncStorage.setItem(ONBOARDING_STATUS_KEY, 'skipped');
      return false;
    }

    if (hasExistingClients === undefined) {
      try {
        const db = await getDbInstance();
        if (db) {
          const tableCheck = await db.getFirstAsync<{ name: string }>(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='clients';"
          );
          if (tableCheck) {
            const countRes = await db.getFirstAsync<{ count: number }>(
              'SELECT COUNT(*) as count FROM clients;'
            );
            const clientCount = countRes?.count || 0;
            const hasSeeded = await AsyncStorage.getItem(LEGACY_SEEDED_KEY);

            // If clients exist in SQLite and either hasSeeded is missing (wiped storage)
            // or there are custom clients beyond the initial demo count (> 2)
            if (clientCount > 0 && (!hasSeeded || clientCount > 2)) {
              await AsyncStorage.setItem(ONBOARDING_STATUS_KEY, 'skipped');
              return false;
            }
          }
        }
      } catch (dbErr) {
        console.warn('[A Note Profile] Safe check of SQLite clients note:', dbErr);
      }
    }

    // 4. Fresh installation
    return true;
  } catch (error) {
    console.warn('[A Note Profile] Error checking onboarding status:', error);
    return false;
  }
}

/**
 * Resets onboarding status (primarily for testing or explicit settings reset).
 */
export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
  await AsyncStorage.removeItem(ONBOARDING_STATUS_KEY);
  await AsyncStorage.removeItem(LEGACY_INTRO_KEY);
}

/**
 * Returns a time-based personalized greeting using the actual local time.
 * - Morning: 5:00 AM - 11:59 AM
 * - Afternoon: 12:00 PM - 4:59 PM
 * - Evening: 5:00 PM - 4:59 AM
 */
export function getTimeOfDayGreeting(hour?: number): string {
  const currentHour = hour !== undefined ? hour : new Date().getHours();
  if (currentHour >= 5 && currentHour < 12) {
    return 'Good Morning';
  }
  if (currentHour >= 12 && currentHour < 17) {
    return 'Good Afternoon';
  }
  return 'Good Evening';
}

/**
 * Formats a greeting with user's name if personalized,
 * or returns null if not personalized.
 */
export function getPersonalizedGreeting(
  displayName?: string | null,
  hour?: number
): string | null {
  if (!displayName || !displayName.trim()) {
    return null;
  }
  const timeGreeting = getTimeOfDayGreeting(hour);
  return `${timeGreeting}, ${displayName.trim()}!`;
}

