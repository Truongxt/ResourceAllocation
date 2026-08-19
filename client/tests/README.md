# Kiểm thử phía client

Hai loại, cố ý tách bằng đuôi file:

| Đuôi | Loại | Chạy bằng | Vì sao tách |
|------|------|-----------|-------------|
| `*.test.mjs` | Logic thuần | `node` trực tiếp | Không phụ thuộc gì ngoài Node. Chạy được ngay cả khi chưa `npm install` devDependencies |
| `*.test.jsx` | Component | vitest + jsdom | Cần render React thật, nên phải có jsdom và Testing Library |

## Chạy

```bash
npm test              # cả hai loại
npm run test:logic    # chỉ logic thuần
npm run test:component # chỉ component
npm run test:watch    # component, chế độ theo dõi
```

## Các bộ

| Bộ | File | Phạm vi |
|----|------|---------|
| Gantt | `gantt.test.mjs` | CPM (lượt xuôi/ngược, slack, phát hiện chu trình), tính thời lượng, nhận diện mốc |
| ProtectedRoute | `protected-route.test.jsx` | Ranh giới đăng nhập: đang kiểm tra phiên thì **không** đá về `/login`; chưa đăng nhập thì đá; sai vai trò thì chặn tại chỗ chứ không đá về `/login` |
| Định tuyến | `app-routing.test.jsx` | 12 trang nạp theo chunk (`React.lazy`) có render ra không, và ranh giới `Suspense` trong `Content` có giữ được sidebar/header khi nội dung đang tải không |
| Link thông báo | `notification-link.test.jsx` | Chặn open redirect ở `notif.link` — đích điều hướng động duy nhất của client. Bấm thật qua giao diện, không gọi thẳng hàm kiểm tra |
| Đổi ngôn ngữ | `language-switch.test.jsx` | Bấm nút đổi ngôn ngữ thì sidebar, tiêu đề trang và nhãn enum có đổi theo không, và lựa chọn có được nhớ không |
| Làm mới token | `api-refresh.test.jsx` | Interceptor 401 tự làm mới rồi chạy lại request. Ca quan trọng nhất: nhiều request cùng hết hạn chỉ được kích hoạt **một** lượt làm mới — nhiều hơn thì server hiểu là token bị đánh cắp và thu hồi cả chuỗi |

Đuôi `.jsx` đánh dấu **trình chạy** (vitest + jsdom), không có nghĩa là file phải chứa JSX:
`api-refresh.test.jsx` không render component nào nhưng vẫn cần `localStorage` của jsdom.

## Quy ước

`tests/helpers.jsx` dựng cây provider giống `main.jsx` nhưng dùng `MemoryRouter` để đặt được
route ban đầu, và bỏ phần theme của antd cho nhẹ.

**AuthProvider và SocketProvider không nằm trong helper.** Bộ nào cần thì tự mock `useAuth` /
`useSocket` bằng `vi.mock` + `vi.hoisted`, vì thứ đang kiểm là component chứ không phải hai
context đó.

`tests/setup.js` vá `matchMedia` và `ResizeObserver` — jsdom không có, mà Ant Design gọi tới.
Thiếu chúng thì lỗi nổ ở tầng thư viện và che mất lỗi thật.

## Viết thêm bộ mới

Một bộ test chỉ có giá trị nếu nó **fail khi thứ nó bảo vệ bị phá**. Trước khi tin vào một bộ
mới, hãy sửa hỏng code có chủ đích rồi chạy lại: không đỏ lên thì bộ đó chưa kiểm cái gì cả.
Hai bộ `app-routing` và `notification-link` đều đã qua bước này.
