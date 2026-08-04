import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

/**
 * Layout wrapper cho authenticated pages
 */
function AppLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header />
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-primary)',
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Register />}
      />

      {/* Protected routes - wrapped in AppLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout><Dashboard /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <AppLayout><Projects /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <AppLayout><Tasks /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/resources"
        element={
          <ProtectedRoute>
            <AppLayout><Resources /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/optimization"
        element={
          <ProtectedRoute>
            <AppLayout><Optimization /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/gantt"
        element={
          <ProtectedRoute>
            <AppLayout><GanttChart /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <AppLayout><Reports /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout><Settings /></AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
