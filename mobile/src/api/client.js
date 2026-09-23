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

export const ACCESS_TOKEN_KEY = 'rao_access_token';
export const REFRESH_TOKEN_KEY = 'rao_refresh_token';

export const apiClient = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    // Server đọc header này để trả refresh token trong body thay vì cookie.
    // Thiếu nó thì refresh token đi bằng cookie và rơi mất ở React Native.
    'X-Client-Type': 'mobile',
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

const currentBaseUrl = () => customBaseUrl || apiClient.defaults.baseURL;

export const saveTokens = async ({ token, refreshToken }) => {
  const pairs = [];
  if (token) pairs.push([ACCESS_TOKEN_KEY, token]);
  if (refreshToken) pairs.push([REFRESH_TOKEN_KEY, refreshToken]);
  if (pairs.length) await AsyncStorage.multiSet(pairs);
};

export const clearTokens = () =>
  AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);

/**
 * Gọi khi phiên không cứu được nữa, để tầng trên đưa người dùng về màn đăng nhập.
 * Không tự điều hướng ở đây: tầng HTTP không nên biết gì về navigation.
 */
let onSessionExpired = null;
export const setOnSessionExpired = (fn) => {
  onSessionExpired = fn;
};

/**
 * Làm mới access token.
 *
 * Dùng `axios` trần chứ không phải `apiClient`: nếu đi qua interceptor bên dưới
 * thì một lần làm mới hỏng sẽ tự gọi lại chính nó, thành vòng lặp vô hạn.
 */
const requestNewToken = async () => {
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const res = await axios.post(
    `${currentBaseUrl()}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json', 'X-Client-Type': 'mobile' }, timeout: 15000 }
  );

  const data = res.data?.data;
  if (!data?.token) return null;

  // Server xoay vòng refresh token mỗi lần làm mới: giá trị cũ vừa chết. Không
  // lưu giá trị mới thì lần sau trình ra token đã thu hồi, server coi là bị đánh
  // cắp và thu hồi cả chuỗi — tự đá mình ra.
  await saveTokens(data);
  return data.token;
};

/**
 * Nhiều request cùng hết hạn một lúc (mỗi màn hình gọi vài API khi mở).
 * Nếu mỗi cái tự đi làm mới thì cái đầu xoay vòng token, những cái sau trình ra
 * token vừa chết → server tưởng bị tấn công. Nên chỉ cho đúng một lần làm mới
 * chạy, các request còn lại chờ chung kết quả đó.
 */
let refreshInFlight = null;

const refreshOnce = () => {
  if (!refreshInFlight) {
    refreshInFlight = requestNewToken()
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
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

// Response Interceptor: 401 → làm mới một lần rồi gửi lại
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // `_retried` chặn lặp: nếu lần gửi lại vẫn 401 thì phiên hỏng thật.
    // Bỏ qua chính endpoint làm mới và đăng nhập, vì 401 ở đó là câu trả lời
    // cuối cùng chứ không phải access token hết hạn.
    const isAuthEndpoint = /\/auth\/(refresh|login|register)$/.test(original?.url || '');

    if (error.response?.status !== 401 || !original || original._retried || isAuthEndpoint) {
      return Promise.reject(error);
    }

    original._retried = true;

    const token = await refreshOnce();
    if (!token) {
      await clearTokens();
      if (onSessionExpired) onSessionExpired();
      return Promise.reject(error);
    }

    original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
    return apiClient(original);
  }
);

export default apiClient;
