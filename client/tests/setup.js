// Chạy trước mọi bộ test component.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom không có mấy API trình duyệt mà Ant Design gọi tới. Thiếu chúng thì lỗi
// nổ ra ở tầng thư viện, che mất lỗi thật của mình.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

window.scrollTo = window.scrollTo || vi.fn();

afterEach(() => {
  cleanup();
  localStorage.clear();
});
