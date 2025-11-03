import Constants from 'expo-constants';

type Env = 'dev' | 'prod';
const extra: any = Constants.expoConfig?.extra ?? {};
const ENV: Env = (extra.env ?? 'prod') as Env;

export const API_BASE =
  ENV === 'dev' ? extra.apiBaseDev : extra.apiBaseProd;

export const ENDPOINTS = {
  pecas: `${API_BASE}/pecas`,
  health: `${API_BASE}/health`,
};