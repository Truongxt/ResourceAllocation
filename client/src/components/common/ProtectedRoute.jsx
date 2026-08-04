import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute - Chặn truy cập khi chưa đăng nhập
 * Redirect đến /login nếu chưa authenticated
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

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
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="empty-state-icon">🔒</div>
        <h3 className="empty-state-title">Không có quyền truy cập</h3>
        <p className="empty-state-text">
          Bạn không có quyền truy cập trang này. Vui lòng liên hệ Admin.
        </p>
      </div>
    );
  }

  return children;
}
