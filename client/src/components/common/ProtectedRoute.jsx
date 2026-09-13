import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LockOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute - Chặn truy cập khi chưa đăng nhập hoặc chưa được cấp quyền
 * Redirect đến /login nếu chưa authenticated
 */
export default function ProtectedRoute({ children, roles, app }) {
  const { isAuthenticated, loading, user, hasAppAccess } = useAuth();
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

  // Check app admin authorization (Owner, Admin hoặc người dùng được cấp App Admin cho phân hệ này)
  if (app && !hasAppAccess(app)) {
    const appNames = {
      optimize: 'Base Optimize+ (Tối ưu hóa nguồn lực)',
      analytics: 'Base Analytics+ (Báo cáo & Phân tích)',
      resource: 'Base Resource+ (Hồ sơ nguồn lực)',
      work: 'Base Work+ (Quản lý dự án & công việc)',
      schedule: 'Base Schedule+ (Lịch làm việc)',
    };
    const appLabel = appNames[app] || `ứng dụng ${app}`;

    return (
      <div className="app-empty-state" style={{ minHeight: '65vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px' }}>
        <div
          className="app-empty-state-icon"
          style={{
            color: '#8b5cf6',
            background: 'rgba(139, 92, 246, 0.12)',
            borderColor: 'rgba(139, 92, 246, 0.3)',
            width: 72,
            height: 72,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            marginBottom: 20,
          }}
        >
          <LockOutlined />
        </div>
        <h3 className="empty-state-title" style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text-primary, #0f172a)' }}>
          Chưa được phân quyền Quản trị ứng dụng (App Admin)
        </h3>
        <p className="empty-state-text" style={{ color: 'var(--text-secondary, #64748b)', maxWidth: 500, margin: '0 auto 24px auto', fontSize: 14, lineHeight: 1.6 }}>
          Tài khoản của bạn chưa được cấp quyền Quản trị ứng dụng (App Admin) cho phân hệ <strong>{appLabel}</strong>. Vui lòng liên hệ Quản trị viên cấp cao (Owner) để được cấp quyền sử dụng.
        </p>
        <Button
          type="primary"
          size="large"
          onClick={() => { window.location.href = '/dashboard'; }}
          style={{ background: '#2563eb', borderRadius: 8, height: 42, padding: '0 24px', fontWeight: 600 }}
        >
          Quay lại Tổng quan Dashboard
        </Button>
      </div>
    );
  }

  // Check role authorization
  if (roles && !roles.includes(user.role) && !user.isOwner) {
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
