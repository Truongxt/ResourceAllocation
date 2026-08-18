# 🏗️ System Design - Kiến trúc Hệ thống

## 1. High-Level Architecture

```
                    ┌──────────────────────────────────────────┐
                    │            Client (Browser)               │
                    │  React 18 + Vite + React Router + Antd 6  │
                    │                                          │
                    │  ┌─────────┐  ┌────────┐  ┌───────────┐ │
                    │  │ Context │  │Services│  │  Pages    │ │
                    │  │Auth/    │  │(Axios) │  │(10 routes)│ │
                    │  │Socket/  │  │        │  │           │ │
                    │  │Theme    │  │        │  │           │ │
                    │  └─────────┘  └────────┘  └───────────┘ │
                    └────────┬──────────────────────┬──────────┘
                             │ HTTP/REST (JSON)     │ WebSocket
                             │ Bearer JWT           │ (socket.io-client)
                    ┌────────┴──────────────────────┴──────────┐
                    │        API Gateway (Express + HTTP)       │
                    │                                          │
                    │  ┌──────┐ ┌───────┐ ┌──────┐ ┌────────┐ │
                    │  │ CORS │ │ Auth  │ │Morgan│ │Socket. │ │
                    │  │      │ │ (JWT) │ │      │ │IO Server│ │
                    │  └──────┘ └───────┘ └──────┘ └────┬───┘ │
                    │                                   │      │
                    │  ┌────────────────────────────────┴────┐ │
                    │  │              Routes                  │ │
                    │  │  /auth /projects /tasks /resources   │ │
                    │  │  /departments /optimization          │ │
                    │  │  /analytics /notifications           │ │
                    │  │  /activity-logs /health              │ │
                    │  └────────────────┬────────────────────┘ │
                    │                   │                       │
                    │  ┌────────────────┴────────────────────┐ │
                    │  │            Controllers               │ │
                    │  └───┬──────────────┬───────────────┬──┘ │
                    │      │              │               │     │
                    │  ┌───┴────┐  ┌──────┴──────┐  ┌────┴───┐ │
                    │  │ Models │  │  Algorithm  │  │Services│ │
                    │  │(Mongoose)│ │Engine GA+CSP│  │socket/ │ │
                    │  │        │  │             │  │notif/  │ │
                    │  │        │  │             │  │actLog  │ │
                    │  └───┬────┘  └─────────────┘  └────────┘ │
                    └──────┼───────────────────────────────────┘
                           │
              ┌────────────┴──────────────────────────────────┐
              │             MongoDB Database                   │
              │  Users | Projects | Tasks | Resources          │
              │  Departments | OptimizationResults             │
              │  Notifications | ActivityLogs                  │
              └───────────────────────────────────────────────┘
```

> **Lưu ý về tầng Services**: khác với kiến trúc 3 lớp cổ điển, controllers ở đây gọi
> thẳng Mongoose models. Thư mục `services/` chỉ chứa 3 module cross-cutting
> (`socket.service`, `notification.service`, `activityLog.service`), không phải tầng
> business logic bắt buộc đi qua.

## 2. Layer Architecture

### 2.1 Client Layer

```
src/
├── components/          # Presentation Layer
│   ├── common/         # ProtectedRoute
│   └── layout/         # Sidebar, Header (+ CSS)
├── pages/              # Page Layer — 10 route-level components (+ CSS mỗi trang)
│                       #   Login, Register, Dashboard, Projects, Tasks,
│                       #   Resources, Optimization, GanttChart, Reports,
│                       #   Settings, ActivityLogs
├── context/            # State Management — AuthContext, SocketContext, ThemeContext
├── services/           # Data Access Layer — 10 service module dùng chung instance Axios
├── constants/          # Application constants (hiện KHÔNG được import ở đâu — dead code)
└── styles/             # index.css + antdTheme.js (cấu hình theme Ant Design)
```

> Biểu đồ và Gantt được vẽ trực tiếp bằng CSS/DOM trong từng trang, không tách thành
> thư mục `components/charts/`. Dự án hiện **không có** thư mục `hooks/`, `utils/`,
> `components/forms/`.

### 2.2 Server Layer

```
server/
├── server.js           # HTTP server + Socket.IO + kết nối DB + khởi động
├── app.js              # Express app: middleware, mount routes, error handler
└── src/
    ├── routes/         # 9 route file — định nghĩa URL, phân quyền VÀ validation
    │                   #   (express-validator viết inline tại đây, không tách riêng)
    ├── controllers/    # 9 controller — xử lý request, gọi thẳng Mongoose models
    ├── services/       # Cross-cutting: socket.service, notification.service,
    │                   #   activityLog.service
    ├── models/         # 8 Mongoose schema
    ├── middleware/     # auth (protect/authorize), error (notFound/errorHandler),
    │                   #   validate (gom kết quả express-validator)
    ├── algorithms/
    │   ├── genetic/    # GeneticAlgorithm.js
    │   └── csp/        # CSPSolver.js
    ├── config/         # db.js (kết nối Mongoose)
    └── utils/          # seeder.js (dữ liệu mẫu)
```

> Dự án **không có** thư mục `validators/` — toàn bộ rule validation nằm ngay trong
> từng file `routes/*.routes.js`, chạy trước middleware `validate`.

## 3. Request Flow

```
Client Request
     │
     ▼
[Middleware: CORS, Body Parser, Morgan]
     │
     ▼
[Middleware: JWT Authentication]
     │
     ▼
[Middleware: Role Authorization]
     │
     ▼
[Validation rules (express-validator, khai báo trong route)]
     │
     ▼
[Middleware: validate — gom lỗi, trả 400 kèm errors[]]
     │
     ▼
[Controller — business logic + gọi Mongoose trực tiếp]
     │
     ├──▶ [logActivity()]  ghi ActivityLog (fire-and-forget)
     ├──▶ [sendNotification()] tạo Notification + emit Socket.IO
     │
     ▼
[Model Layer (Mongoose)]
     │
     ▼
[Response: JSON { success, data: { <key>: ... }, message }]
```

Thứ tự middleware trong `app.js`: `cors` → `morgan('dev')` → `express.json` →
`express.urlencoded` → routes → `notFound` → `errorHandler`.

`errorHandler` chuẩn hóa 3 loại lỗi Mongoose: `CastError` ObjectId → 400 "ID không hợp lệ",
duplicate key (11000) → 400 "Giá trị '<field>' đã tồn tại", `ValidationError` → 400 (gộp message).

## 4. Authentication Flow

```
┌──────────┐     POST /auth/login      ┌──────────┐
│  Client  │ ──────────────────────────▶│  Server  │
│          │     { email, password }     │          │
│          │                            │          │
│          │     { token, user }        │          │
│          │ ◀──────────────────────────│          │
│          │                            │          │
│  Store   │     GET /api/projects      │  Verify  │
│  token   │ ──────────────────────────▶│  JWT     │
│  in LS   │  Authorization: Bearer xxx │  token   │
│          │                            │          │
│          │     { data: [...] }        │          │
│          │ ◀──────────────────────────│          │
└──────────┘                            └──────────┘
```

## 5. Optimization Flow

```
┌──────────┐                          ┌──────────┐              ┌──────────┐
│  Client  │ POST /optimization/      │  Server  │  Query data  │ Database │
│          │      run/{genetic|csp|   │          │ ────────────▶│          │
│          │          hybrid}         │          │              │          │
│          │ ────────────────────────▶│          │  tasks có    │          │
│          │  { projectId,            │          │◀ status todo/│          │
│          │    populationSize, ... }  │          │  in_progress/│          │
│          │                          │          │  review      │          │
│          │                          │          │  + resources │          │
│          │                          │          │  isActive    │          │
│          │                          │          │              └──────────┘
│          │                          │          │
│          │        ┌─────────────────┴──────┐   │  1. Tạo bản ghi
│          │        │  OptimizationResult    │◀──┘     status='running'
│          │        │  (status: running)     │
│          │        └─────────────────┬──────┘
│          │                          │
│          │        ┌─────────────────┴────────────┐
│          │        │      Algorithm Engine        │
│          │        │  genetic → GA                │
│          │        │  csp     → CSPSolver         │
│          │        │  hybrid  → CSP ∥ GA (song    │
│          │        │            song, độc lập)    │
│          │        └─────────────────┬────────────┘
│          │                          │  2. Ghi kết quả,
│          │                          │     status='completed'|'failed'
│          │  { data: { result: <OptimizationResult đầy đủ> } }
│          │◀─────────────────────────│
│  Hiển thị│                          │
│  + biểu  │  POST /:id/apply         │  3. Ghi assignee cho từng task
│  đồ hội  │ ────────────────────────▶│     (= resource.user)
│  tụ      │                          │     + notification + ActivityLog
└──────────┘                          └──────────┘
```

Chi tiết cơ chế từng thuật toán: xem [ALGORITHMS.md](../ALGORITHMS.md).

## 5b. Realtime Notification Flow

```
┌──────────┐   io(url, {auth:{token}})   ┌───────────────┐
│  Client  │ ───────────────────────────▶│ Socket.IO srv │
│(SocketCtx)│                             │  io.use():    │
│          │                             │  verify JWT   │
│          │                             │  join room    │
│          │                             │  user:<id>    │
│          │                             └───────┬───────┘
│          │                                     │
│          │   Controller gọi sendNotification() │
│          │   → lưu Notification vào DB         │
│          │   → emitToUser(recipient, ...)      │
│          │                                     │
│          │◀─── 'notification:new' ─────────────│
│  Toast + │◀─── 'notification:read' ────────────│
│  Badge   │◀─── 'notification:read-all' ────────│
└──────────┘                             └───────────────┘
```

Socket dùng **cùng `JWT_SECRET`** với REST API. Nếu handshake không kèm token hợp lệ,
kết nối bị từ chối với `Error('Authentication error')`.

## 6. Tech Stack Summary

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Frontend Framework | React | 18.3 | UI Components |
| **UI Library** | **Ant Design (antd)** | **6.6** | **Toàn bộ component UI: Layout, Table, Modal, Form, Tabs…** |
| **UI Icons** | **@ant-design/icons** | **6.3** | **Bộ icon chính đang dùng** |
| Build Tool | Vite | 5.4 | Dev server + bundling |
| Routing | React Router | 6.26 | Client-side routing |
| HTTP Client | Axios | 1.7 | API calls |
| **Realtime (client)** | **socket.io-client** | **4.8** | **Nhận notification real-time** |
| Icons (phụ) | React Icons | 5.3 | Có trong dependency, ít dùng |
| Backend Framework | Express | 4.19 | REST API |
| **Realtime (server)** | **Socket.IO** | **4.8** | **WebSocket server, xác thực bằng JWT, room theo user** |
| Database | MongoDB | 7.x | Data storage |
| ODM | Mongoose | 8.5 | Schema + queries |
| Auth | jsonwebtoken | 9.0 | JWT tokens |
| Password | bcryptjs | 2.4 | Password hashing (salt 12) |
| Validation | express-validator | 7.1 | Input validation |
| Logging | Morgan | 1.10 | HTTP request logging |
| **Config** | **dotenv** | **16.4** | **Nạp biến môi trường từ `.env`** |
| Dev Reload | Nodemon | 3.1 | Auto-restart server |
| Concurrent | Concurrently | 8.2 | Run client + server |

## 7. Environment Variables

File `.env` đặt ở **thư mục gốc dự án**. `server.js` nạp bằng `dotenv.config({ path: '../.env' })`,
tức đường dẫn tính từ thư mục `server/` khi chạy `npm run dev:server`.

| Variable | Default trong code | Mô tả |
|----------|--------------------|-------|
| `PORT` | 5000 | Server port |
| `NODE_ENV` | development | Bật stack trace trong response lỗi khi = `development` |
| `MONGODB_URI` | mongodb://localhost:27017/resource_allocation | Chuỗi kết nối MongoDB |
| `JWT_SECRET` | khóa dev tạm (xem dưới) | Khóa ký JWT |
| `JWT_EXPIRE` | 7d | Thời hạn token |
| `CLIENT_URL` | http://localhost:5173 | Origin được phép cho CORS của Socket.IO |
| `VITE_API_URL` | /api | Base URL client gọi API |

**`JWT_SECRET`** được đọc qua một nguồn duy nhất là [`src/config/jwt.js`](../../server/src/config/jwt.js).
Nơi ký token (`auth.controller.js`), nơi verify (`middleware/auth.js`) và handshake Socket.IO
(`server.js`) đều gọi cùng hàm `getJwtSecret()`, nên không thể lệch khóa giữa các nơi.

| Môi trường | Thiếu `JWT_SECRET` |
|------------|--------------------|
| `NODE_ENV` ≠ production | Ghi cảnh báo một lần rồi dùng khóa dev tạm — hệ thống vẫn chạy được |
| `NODE_ENV=production` | `assertJwtConfig()` chạy ngay đầu `startServer()` → **server thoát với exit code 1** trước khi listen |

Kiểm tra cấu hình đặt trước cả bước kết nối DB, để lỗi lộ ra lúc khởi động thay vì
biến thành 401 khó chẩn đoán ở request đầu tiên.

> ⚠️ **`VITE_API_URL`**: để trống thì client dùng `/api` và đi qua proxy khai báo trong
> `vite.config.js` (trỏ tới `http://localhost:5000`). File `.env.example` hiện đặt sẵn
> `http://localhost:5000/api`, khiến client gọi thẳng server và bỏ qua proxy — cả hai cách
> đều chạy được ở môi trường dev.

> ⚠️ **`utils/seeder.js` không dùng đúng biến này**: nó đọc `process.env.MONGO_URI`
> (thiếu chữ `DB`) và gọi `dotenv.config()` không kèm đường dẫn, nên luôn ghi vào
> `mongodb://localhost:27017/resource_allocation` bất kể cấu hình.
