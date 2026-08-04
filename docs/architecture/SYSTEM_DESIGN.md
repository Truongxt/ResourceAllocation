# 🏗️ System Design - Kiến trúc Hệ thống

## 1. High-Level Architecture

```
                    ┌─────────────────────────────────────┐
                    │          Client (Browser)            │
                    │     React 18 + Vite + React Router   │
                    │                                     │
                    │  ┌─────────┐  ┌──────┐  ┌────────┐ │
                    │  │ Context │  │Hooks │  │Services│ │
                    │  └─────────┘  └──────┘  └────────┘ │
                    └──────────────────┬──────────────────┘
                                      │ HTTP/REST (JSON)
                                      │
                    ┌──────────────────┴──────────────────┐
                    │         API Gateway (Express)        │
                    │                                     │
                    │  ┌──────┐  ┌───────┐  ┌──────────┐ │
                    │  │ CORS │  │ Auth  │  │ Morgan   │ │
                    │  │      │  │ (JWT) │  │ (Logger) │ │
                    │  └──────┘  └───────┘  └──────────┘ │
                    │                                     │
                    │  ┌─────────────────────────────────┐ │
                    │  │           Routes                │ │
                    │  │  /auth  /projects  /tasks       │ │
                    │  │  /resources  /optimization      │ │
                    │  └────────────────┬────────────────┘ │
                    │                  │                   │
                    │  ┌───────────────┴────────────────┐  │
                    │  │        Controllers             │  │
                    │  └───────────────┬────────────────┘  │
                    │                  │                   │
                    │  ┌───────────────┴────────────────┐  │
                    │  │     Services (Business Logic)  │  │
                    │  └───────────────┬────────────────┘  │
                    │                  │                   │
                    │  ┌──────────┐ ┌──┴───────────────┐  │
                    │  │ Models   │ │ Algorithm Engine  │  │
                    │  │(Mongoose)│ │ (GA + CSP)        │  │
                    │  └────┬─────┘ └──────────────────┘  │
                    └───────┼─────────────────────────────┘
                            │
                    ┌───────┴─────────────────────────────┐
                    │           MongoDB Database            │
                    │  Users | Projects | Tasks | Resources │
                    └─────────────────────────────────────┘
```

## 2. Layer Architecture

### 2.1 Client Layer

```
src/
├── components/          # Presentation Layer
│   ├── common/         # Shared components (Button, Modal, Input)
│   ├── layout/         # Layout components (Sidebar, Header)
│   ├── charts/         # Chart components (Gantt, Histogram)
│   └── forms/          # Form components
├── pages/              # Page Layer (route-level components)
├── context/            # State Management (React Context)
├── hooks/              # Custom hooks (reusable logic)
├── services/           # Data Access Layer (API calls)
├── utils/              # Utility functions
└── constants/          # Application constants
```

### 2.2 Server Layer

```
src/
├── routes/             # Route definitions (URL → Controller mapping)
├── controllers/        # Request handling (parse input, call service, send response)
├── services/           # Business logic (validation, data transformation)
├── models/             # Data models (Mongoose schemas)
├── middleware/         # Cross-cutting concerns (auth, error handling)
├── algorithms/         # Algorithm implementations
│   ├── genetic/        # Genetic Algorithm
│   └── csp/            # Constraint Satisfaction Problem
├── validators/         # Input validation (express-validator)
└── config/             # Configuration (database, environment)
```

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
[Route Handler → Controller]
     │
     ▼
[Input Validation (express-validator)]
     │
     ▼
[Service Layer (Business Logic)]
     │
     ▼
[Model Layer (Database Operations)]
     │
     ▼
[Response: JSON { success, data, message }]
```

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
┌──────────┐                    ┌──────────┐              ┌──────────┐
│  Client  │  POST /optimize    │  Server  │  Query data  │ Database │
│          │ ──────────────────▶│          │ ────────────▶│          │
│          │  {algorithm,       │          │              │          │
│          │   projectIds,      │          │  tasks +     │          │
│          │   parameters}      │          │◀ resources   │          │
│          │                    │          │              └──────────┘
│          │                    │          │
│          │                    │  ┌───────┴────────┐
│          │                    │  │ Algorithm      │
│          │                    │  │ Engine         │
│          │                    │  │                │
│          │                    │  │ 1. CSP Filter  │
│          │                    │  │ 2. GA Optimize │
│          │                    │  │ 3. Evaluate    │
│          │                    │  └───────┬────────┘
│          │                    │          │
│          │  { assignments,    │          │
│          │    metrics,        │          │
│          │◀── fitness }       │          │
│          │                    │          │
│  Display │                    │          │
│  results │                    │          │
│  & chart │                    │          │
└──────────┘                    └──────────┘
```

## 6. Tech Stack Summary

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Frontend Framework | React | 18.x | UI Components |
| Build Tool | Vite | 5.x | Dev server + bundling |
| Routing | React Router | 6.x | Client-side routing |
| HTTP Client | Axios | 1.x | API calls |
| Icons | React Icons | 5.x | UI Icons |
| Backend Framework | Express | 4.x | REST API |
| Database | MongoDB | 7.x | Data storage |
| ODM | Mongoose | 8.x | Schema + queries |
| Auth | jsonwebtoken | 9.x | JWT tokens |
| Password | bcryptjs | 2.x | Password hashing |
| Validation | express-validator | 7.x | Input validation |
| Logging | Morgan | 1.x | HTTP request logging |
| Dev Reload | Nodemon | 3.x | Auto-restart server |
| Concurrent | Concurrently | 8.x | Run client + server |

## 7. Environment Variables

| Variable | Default | Mô tả |
|----------|---------|-------|
| `PORT` | 5000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `MONGODB_URI` | mongodb://localhost:27017/resource_allocation | MongoDB connection |
| `JWT_SECRET` | - | JWT signing secret |
| `JWT_EXPIRE` | 7d | Token expiration |
| `VITE_API_URL` | /api | Client API base URL |
