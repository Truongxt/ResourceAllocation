// AsyncStorage là module native: trong jest không có, dùng bản giả lập của chính thư viện.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Icon không cần cho test, và nạp thật thì kéo theo expo-font → expo-asset. expo-asset chỉ có
// trong node_modules/expo/node_modules, nên jest không tìm thấy từ chỗ expo-font.
jest.mock('@expo/vector-icons', () => {
  const Icon = () => null;
  return new Proxy({}, { get: () => Icon });
});
