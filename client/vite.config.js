import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Chỉ tách tay đúng những thư viện mà **mọi** trang đều cần: React và tầng
// mạng đằng nào cũng nằm trong đồ thị của entry, nên gom lại chỉ để cache được
// lâu qua các lần deploy.
//
// Cố tình KHÔNG gom antd vào một chunk: làm vậy thì Table, DatePicker, Slider…
// dù chỉ một trang dùng cũng bị kéo vào chunk mà khung layout cần ngay, và lần
// vào đầu tiên phải tải cả 1,1 MB. Để Rollup tự chia thì phần antd chỉ một
// trang dùng nằm luôn trong chunk của trang đó.
//
// So sánh theo tên package chứ không theo đường dẫn, vì 'react-icons' cũng
// chứa chuỗi 'react'.
const REACT_PKGS = ['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler'];
const NET_PKGS = ['axios', 'socket.io-client', 'socket.io-parser', 'engine.io-client', 'engine.io-parser'];

function manualChunks(id) {
  if (!id.includes('node_modules')) return undefined;

  const after = id.split('node_modules/').pop();
  const pkg = after.startsWith('@')
    ? after.split('/').slice(0, 2).join('/')
    : after.split('/')[0];

  if (REACT_PKGS.includes(pkg)) return 'react-vendor';
  if (NET_PKGS.includes(pkg)) return 'net-vendor';

  return undefined;
}

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: { manualChunks },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
