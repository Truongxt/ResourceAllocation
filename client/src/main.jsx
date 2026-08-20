import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { darkTheme, lightTheme } from './styles/antdTheme';
import './i18n';
import './styles/index.css';

// Locale của Ant Design phải đi kèm ngôn ngữ ứng dụng, nếu không thì nút "OK/Cancel"
// của DatePicker, chữ "Không có dữ liệu" của Table và tên tháng vẫn ở ngôn ngữ cũ.
const ANTD_LOCALES = { vi: viVN, en: enUS };

function AntdConfigured({ children }) {
  const { isDark } = useTheme();
  const { i18n } = useTranslation();
  const currentTheme = isDark ? darkTheme : lightTheme;

  return (
    <ConfigProvider
      locale={ANTD_LOCALES[i18n.language] || viVN}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        ...currentTheme,
      }}
    >
      {children}
    </ConfigProvider>
  );
}

/**
 * `key` đổi theo ngôn ngữ nên đổi ngôn ngữ là dựng lại toàn bộ cây.
 *
 * Cách này thô nhưng đúng: nhiều chỗ trong ứng dụng lấy nhãn ngoài vòng render
 * của React — cột của Table dựng trong `useMemo`, option truyền vào Select,
 * nhãn ghi thẳng vào state. Chúng không tự cập nhật khi i18n đổi ngôn ngữ, và
 * kết quả là màn hình lẫn lộn hai thứ tiếng. Đổi ngôn ngữ là thao tác hiếm, mất
 * một lần dựng lại đổi lấy sự chắc chắn là đáng.
 */
function LocalizedApp() {
  const { i18n } = useTranslation();
  return <App key={i18n.language} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AntdConfigured>
            <SocketProvider>
              <LocalizedApp />
            </SocketProvider>
          </AntdConfigured>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
