import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute - Chặn truy cập khi chưa đăng nhập
 * Redirect đến /login nếu chưa authenticated
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  // Show loading while checking auth
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

  // Not authenticated → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="app-empty-state" style={{ minHeight: '60vh' }}>
        <div className="app-empty-state-icon" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.25)' }}>
          <LockOutlined />
        </div>
        <h3 className="empty-state-title" style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px 0' }}>
          {t('protectedRoute.forbiddenTitle')}
        </h3>
        <p className="empty-state-text" style={{ color: 'var(--text-secondary)', maxWidth: 420 }}>
          {t('protectedRoute.forbiddenText')}
        </p>
      </div>
    );
  }

  return children;
}
