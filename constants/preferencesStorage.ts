import AsyncStorage from '@react-native-async-storage/async-storage';

export const PREFERENCES_UPDATED_AT_KEY = '@askzaen_preferences_updated_at_v1';

export async function markPreferencesUpdated(): Promise<void> {
  await AsyncStorage.setItem(PREFERENCES_UPDATED_AT_KEY, new Date().toISOString()).catch(() => {});
}
