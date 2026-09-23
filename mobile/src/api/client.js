import axios from 'axios';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Tự động phát hiện địa chỉ IP của máy tính chạy server thông qua Expo / Metro
export const getDetectedHostIp = () => {
  try {
    // 1. Expo Constants hostUri (ví dụ: "172.27.37.181:8081")
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoClient?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }

    // 2. React Native scriptURL
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch (e) {
    console.warn('Không thể tự động phát hiện IP dev server:', e);
  }
  return null;
};

const detectedIp = getDetectedHostIp();

// Trên điện thoại thật, dùng IP máy chủ Wi-Fi (172.27.37.181). Trên giả lập Android Studio mới dùng 10.0.2.2
export const DEFAULT_API_URL = detectedIp
  ? `http://${detectedIp}:5000/api`
  : Platform.select({
      android: 'http://172.27.37.181:5000/api',
      default: 'http://localhost:5000/api',
    });

let customBaseUrl = null;

export const apiClient = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Nạp lại URL máy chủ tùy chỉnh đã lưu nếu có
AsyncStorage.getItem('rao_custom_api_url')
  .then((saved) => {
    if (saved && saved.trim()) {
      customBaseUrl = saved.trim();
      apiClient.defaults.baseURL = customBaseUrl;
    }
  })
  .catch(() => {});

export const getApiBaseUrl = () => customBaseUrl || apiClient.defaults.baseURL || DEFAULT_API_URL;

export const setApiBaseUrl = async (url) => {
  const cleanUrl = url ? url.trim().replace(/\/+$/, '') : null;
  customBaseUrl = cleanUrl;
  apiClient.defaults.baseURL = cleanUrl || DEFAULT_API_URL;
  if (cleanUrl) {
    await AsyncStorage.setItem('rao_custom_api_url', cleanUrl);
  } else {
    await AsyncStorage.removeItem('rao_custom_api_url');
  }
};

// Kiểm tra kết nối nhanh tới server (health check)
export const checkServerHealth = async (targetUrl) => {
  const baseUrl = targetUrl ? targetUrl.trim().replace(/\/+$/, '') : getApiBaseUrl();
  const healthUrl = baseUrl.endsWith('/api') ? `${baseUrl}/health` : `${baseUrl}/api/health`;
  try {
    const res = await axios.get(healthUrl, { timeout: 5000 });
    return { ok: res.status === 200, status: res.status, data: res.data };
  } catch (err) {
    return { ok: false, error: err.message || 'Không thể kết nối' };
  }
};

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('rao_access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const activeBaseUrl = getApiBaseUrl();
      if (activeBaseUrl) {
        config.baseURL = activeBaseUrl;
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
