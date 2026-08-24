import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In Expo/React Native:
// - Android Emulator: 10.0.2.2
// - iOS Simulator / Web: localhost
// - Custom LAN IP can be stored in AsyncStorage if needed
const DEFAULT_API_URL = Platform.select({
  android: 'http://10.0.2.2:5000/api',
  default: 'http://localhost:5000/api',
});

export const apiClient = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let customBaseUrl = null;

export const setApiBaseUrl = (url) => {
  customBaseUrl = url;
  apiClient.defaults.baseURL = url;
};

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('rao_access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (customBaseUrl) {
        config.baseURL = customBaseUrl;
      }
    } catch (e) {
      console.warn('Error reading auth token:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle errors & 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Optional: Trigger logout or refresh
    }
    return Promise.reject(error);
  }
);

export default apiClient;
