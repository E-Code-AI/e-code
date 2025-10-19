import Constants from 'expo-constants';

const fallbackUrl = 'http://localhost:5000/api';

export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? fallbackUrl;
