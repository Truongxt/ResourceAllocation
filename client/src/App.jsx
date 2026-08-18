import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Resources from './pages/Resources';
import Optimization from './pages/Optimization';
import GanttChart from './pages/GanttChart';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const { Content } = Layout;

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
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
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

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />

      <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><AppLayout><Projects /></AppLayout></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><AppLayout><Tasks /></AppLayout></ProtectedRoute>} />
      <Route path="/resources" element={<ProtectedRoute><AppLayout><Resources /></AppLayout></ProtectedRoute>} />
      <Route path="/optimization" element={<ProtectedRoute><AppLayout><Optimization /></AppLayout></ProtectedRoute>} />
      <Route path="/gantt" element={<ProtectedRoute><AppLayout><GanttChart /></AppLayout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
