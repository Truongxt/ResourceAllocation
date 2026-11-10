import { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './styles/workspace.css';
import { Drawer, Layout } from 'antd';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ProtectedRoute from './components/common/ProtectedRoute';

// Mỗi trang là một chunk riêng: mở /login không phải tải theo cả sơ đồ Gantt,
// trang tối ưu hóa và báo cáo. Sidebar/Header vẫn nằm trong chunk chính vì
// khung layout hiện ngay từ khung hình đầu tiên.
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Projects = lazy(() => import('./pages/projects/Projects'));
const ProjectDetail = lazy(() => import('./pages/projects/ProjectDetail'));
const Tasks = lazy(() => import('./pages/tasks/Tasks'));
const Resources = lazy(() => import('./pages/resources/Resources'));
const Optimization = lazy(() => import('./pages/optimization/Optimization'));
const GanttChart = lazy(() => import('./pages/gantt/GanttChart'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const BenchmarkStudio = lazy(() => import('./pages/benchmark/BenchmarkStudio'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const CalendarPage = lazy(() => import('./pages/calendar/CalendarPage'));
const ActivityLogs = lazy(() => import('./pages/activity-logs/ActivityLogs'));

const { Content } = Layout;

function FullPageSpinner() {
  return (
    <div className="app-loading-screen">
      <div className="spinner" />
    </div>
  );
}

function ContentSpinner() {
  return (
    <div className="app-content-spinner">
      <div className="spinner" />
    </div>
  );
}

function AppLayout({ children }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const onChange = () => {
      setIsMobile(media.matches);
      setMenuOpen(false);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  useEffect(() => { setMenuOpen(false); }, [location.pathname, location.search]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <a className="skip-link" href="#main-content">Đến nội dung chính</a>
      {isMobile ? (
        <Drawer
          title="Điều hướng"
          placement="left"
          width={280}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          className="workspace-navigation-drawer"
          styles={{ body: { padding: 0 }, header: { background: 'var(--surface-ground)' } }}
        >
          <Sidebar collapsed={false} mobile onNavigate={() => setMenuOpen(false)} />
        </Drawer>
      ) : <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />}
      <Layout
        className="app-main"
        style={{
          marginLeft: isMobile ? 0 : collapsed ? 72 : 240,
          minWidth: 0,
          transition: 'margin-left var(--motion-duration-base) var(--ease-out)',
          minHeight: '100vh',
          background: 'var(--bg-primary, #0f172a)',
        }}
      >
        <Header collapsed={collapsed} isMobile={isMobile} menuOpen={menuOpen} onOpenMenu={() => setMenuOpen(true)} />
        <Content
          className="app-content"
          id="main-content"
          role="main"
          tabIndex={-1}
          style={{
            marginTop: 80,
            marginBottom: 24,
            marginLeft: 24,
            marginRight: 24,
            minHeight: 'calc(100vh - 104px)',
          }}
        >
          {/* Ranh giới Suspense nằm trong Content nên khi đổi trang chỉ vùng nội
              dung hiện spinner; sidebar và header không chớp mất rồi hiện lại. */}
          <Suspense fallback={<ContentSpinner />}>
            <div className="app-page-transition" key={`${location.pathname}${location.search}`}>
              {children}
            </div>
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <FullPageSpinner />;
  }

  return (
    // Ranh giới ngoài cùng lo cho Login/Register, hai trang không nằm trong AppLayout.
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/home" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route path="/dang-ky-demo" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />

        {/* Root Route: Landing page for guests, Dashboard for logged-in users */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
            ) : (
              <LandingPage />
            )
          }
        />
        <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
        {/* `module` khớp với `requireAppPermission` ở server: trang nào lấy dữ
            liệu từ route đã bị chặn thì chặn luôn tại đây, nếu không trang vẫn
            dựng ra rồi mọi request bên trong nhận 403.
            Riêng `/dashboard` **không** gắn: nút thoát của mọi màn hình từ chối
            đều trỏ về đó, chặn nốt là người dùng hết đường ra. */}
        <Route path="/projects" element={<ProtectedRoute module="projects"><AppLayout><Projects /></AppLayout></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute module="projects"><AppLayout><ProjectDetail /></AppLayout></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute module="tasks"><AppLayout><Tasks /></AppLayout></ProtectedRoute>} />
        <Route path="/resources" element={<ProtectedRoute roles={['admin', 'project_manager']}><AppLayout><Resources /></AppLayout></ProtectedRoute>} />
        <Route path="/optimization" element={<ProtectedRoute app="optimize"><AppLayout><Optimization /></AppLayout></ProtectedRoute>} />
        {/* Lịch và Gantt đều vẽ từ `/api/tasks` nên đi theo phân hệ `tasks`,
            không theo khóa `calendar` — khóa đó không có route riêng ở server
            (xem docs/API.md, mục app-permissions). */}
        <Route
          path="/calendar"
          element={<ProtectedRoute module="tasks"><AppLayout><CalendarPage /></AppLayout></ProtectedRoute>}
        />

        <Route path="/gantt" element={<ProtectedRoute module="tasks"><AppLayout><GanttChart /></AppLayout></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute module="reports"><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
        <Route path="/benchmark" element={<ProtectedRoute app="optimize"><AppLayout><BenchmarkStudio /></AppLayout></ProtectedRoute>} />
        <Route path="/activity-logs" element={<ProtectedRoute><AppLayout><ActivityLogs /></AppLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
