import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Skeleton, Space, Typography } from 'antd';
import { ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import analyticsService from '../../services/analyticsService';
import { taskStatusLabel } from '../../i18n/enums';
import { useAuth } from '../../context/AuthContext';
import { TASK_STATUSES, taskStatusCountKey } from '../../constants';
import DashboardKpiCards from './components/DashboardKpiCards';
import DashboardQuickAndRecent from './components/DashboardQuickAndRecent';
import DashboardTaskAndHours from './components/DashboardTaskAndHours';
import './Dashboard.css';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, hasAppAccess } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await analyticsService.getDashboard();
      setData(response.data.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const task = data?.tasks || {};
  const res = data?.resources || {};
  const canOptimize = hasAppAccess ? hasAppAccess('optimize') : user?.role === 'admin';

  const distribution = TASK_STATUSES.map((status) => ({
    key: status.key,
    label: taskStatusLabel(status.key),
    value: task[taskStatusCountKey(status.key)] || 0,
  }));

  const userName = user?.name || user?.email?.split('@')[0] || '';

  return (
    <div className="workspace-page dashboard-page">
      <header className="page-heading dashboard-header">
        <div className="dashboard-header-text">
          <div className="dashboard-header-title-row">
            <Typography.Title level={3} style={{ margin: 0 }}>
              {t('workspace.overview')}
            </Typography.Title>
            {userName && (
              <span className="dashboard-greeting-chip">
                Xin chào, <strong>{userName}</strong> 👋
              </span>
            )}
          </div>
          <p className="dashboard-header-desc">
            Theo dõi tiến độ tổng thể, phân bổ nguồn lực và xử lý các điểm nghẽn dự án trong thời gian thực.
          </p>
        </div>
        <Space wrap className="dashboard-header-actions">
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={load}
            loading={loading}
            className="btn-dashboard-reload"
          >
            {t('common.reload')}
          </Button>
          {canOptimize && (
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={() => navigate('/optimization')}
              className="btn-dashboard-cta"
            >
              {t('workspace.planAllocation')}
            </Button>
          )}
        </Space>
      </header>

      {error && (
        <Alert
          type="error"
          showIcon
          title={t('workspace.loadError')}
          action={<Button onClick={load}>{t('common.reload')}</Button>}
          className="dashboard-error"
        />
      )}

      {loading && !data ? (
        <div className="dashboard-loading-skeleton">
          <Skeleton active paragraph={{ rows: 3 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, margin: '24px 0' }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton.Button key={i} active style={{ height: 110, width: '100%', borderRadius: 12 }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        </div>
      ) : data ? (
        <div className="dashboard-body-container">
          {/* 1. HÀNG 4 THẺ KPI BENTO */}
          <DashboardKpiCards
            proj={data.projects}
            task={task}
            res={res}
            t={t}
          />

          {/* 2. KHỐI GIỮA: CẦN XỬ LÝ (TRIAGE) + CÔNG VIỆC VỪA CẬP NHẬT */}
          <DashboardQuickAndRecent
            task={task}
            res={res}
            recentTasks={data.recentTasks || []}
            user={user}
            t={t}
          />

          {/* 3. KHỐI DƯỚI: PHÂN BỔ TRẠNG THÁI + GIỜ CÔNG & NĂNG LỰC */}
          <DashboardTaskAndHours
            task={task}
            res={res}
            taskDistribution={distribution}
            recentOptimizations={data.recentOptimizations || []}
            t={t}
          />
        </div>
      ) : null}
    </div>
  );
}
