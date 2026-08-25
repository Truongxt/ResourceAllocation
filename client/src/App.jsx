import { Suspense, lazy, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ProtectedRoute from './components/common/ProtectedRoute';

// Mỗi trang là một chunk riêng: mở /login không phải tải theo cả sơ đồ Gantt,
// trang tối ưu hóa và báo cáo. Sidebar/Header vẫn nằm trong chunk chính vì
// khung layout hiện ngay từ khung hình đầu tiên.
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Resources = lazy(() => import('./pages/Resources'));
const Optimization = lazy(() => import('./pages/Optimization'));
const GanttChart = lazy(() => import('./pages/GanttChart'));
const Reports = lazy(() => import('./pages/Reports'));
const BenchmarkStudio = lazy(() => import('./pages/BenchmarkStudio'));
const Settings = lazy(() => import('./pages/Settings'));
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'));

const { Content } = Layout;

function FullPageSpinner() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--bg-primary, #0f172a)',
    }}>
      <div className="spinner" />
    </div>
  );
}

function ContentSpinner() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 200px)',
    }}>
      <div className="spinner" />
    </div>
  );
}

function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Layout
        style={{
          marginLeft: collapsed ? 72 : 240,
          transition: 'margin-left 0.2s ease',
          minHeight: '100vh',
          background: 'var(--bg-primary, #0f172a)',
        }}
      >
        <Header collapsed={collapsed} />
        <Content
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
          <Suspense fallback={<ContentSpinner />}>{children}</Suspense>
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
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />

        <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><AppLayout><Projects /></AppLayout></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><AppLayout><ProjectDetail /></AppLayout></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><AppLayout><Tasks /></AppLayout></ProtectedRoute>} />
        <Route path="/resources" element={<ProtectedRoute><AppLayout><Resources /></AppLayout></ProtectedRoute>} />
        <Route path="/optimization" element={<ProtectedRoute><AppLayout><Optimization /></AppLayout></ProtectedRoute>} />
        <Route path="/gantt" element={<ProtectedRoute><AppLayout><GanttChart /></AppLayout></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
        <Route path="/benchmark" element={<ProtectedRoute><AppLayout><BenchmarkStudio /></AppLayout></ProtectedRoute>} />
        <Route path="/activity-logs" element={<ProtectedRoute><AppLayout><ActivityLogs /></AppLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
