/**
 * ============================================================================
 * TRANG BẢNG ĐIỀU KHIỂN TRUNG TÂM (System Dashboard Page)
 * ============================================================================
 *
 * Mục đích:
 *   - Giám sát toàn cảnh hệ thống: Tiến độ dự án, công việc, tải làm việc nhân sự,
 *     các cảnh báo kiệt sức (Burnout), các hoạt động gần đây và lối tắt nhanh.
 *
 * Cấu trúc các module con:
 *   - DashboardKpiCards: 4 thẻ thống kê điều hành (Dự án, Công việc, Nhân sự, Cảnh báo quá tải)
 *   - DashboardQuickAndRecent: Lối tắt điều hướng nhanh & Dòng hoạt động gần nhất
 *   - DashboardTaskAndHours: Phân bổ trạng thái công việc & Thống kê giờ công thực tế vs capacity
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Typography, Space, Spin, Button } from 'antd';
import { ThunderboltOutlined, ReloadOutlined } from '@ant-design/icons';
import analyticsService from '../../services/analyticsService';
import { taskStatusLabel } from '../../i18n/enums';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { TASK_STATUSES, taskStatusCountKey } from '../../constants';
import DashboardKpiCards from './components/DashboardKpiCards';
import DashboardQuickAndRecent from './components/DashboardQuickAndRecent';
import DashboardTaskAndHours from './components/DashboardTaskAndHours';
import './Dashboard.css';

const { Title, Text } = Typography;

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * Tải toàn bộ dữ liệu tổng hợp Dashboard từ backend
   */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsService.getDashboard();
      setData(res.data.data);
    } catch {
      // Bỏ qua lỗi kết nối ban đầu
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const proj = data?.projects || {};
  const task = data?.tasks || {};
  const res = data?.resources || {};

  // Tính toán tỷ lệ hoàn thành
  const projectCompletionRate = proj.total > 0 ? Math.round(((proj.completed || 0) / proj.total) * 100) : 0;
  const taskCompletionRate = task.total > 0 ? Math.round(((task.done || 0) / task.total) * 100) : 0;
  const avgUtil = Math.round(res.avgUtilization || 0);

  // Chuẩn bị dữ liệu phân bổ trạng thái công việc
  const taskDistribution = TASK_STATUSES.map((status) => ({
    key: status.key,
    label: taskStatusLabel(status.key),
    value: task[taskStatusCountKey(status.key)] || 0,
    color: status.color,
  }));

  return (
    <Spin spinning={loading} size="large">
      <div style={{ maxWidth: 1440, margin: '0 auto' }}>
        {/* Tiêu đề trang & Nút thao tác nhanh */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Title level={3} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {t('dashboard.welcome', { defaultValue: 'Tổng quan Hệ thống' })}
              </Title>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                Real-time Sync
              </span>
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('dashboard.subtitle', { defaultValue: 'Tổng quan hệ thống quản lý nguồn lực và phân bổ nhân sự' })}
            </Text>
          </div>

          <Space size="small">
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={() => navigate('/optimization')}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              {t('dashboard.runOptimization') || 'Tối ưu hóa Phân bổ'}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={load} style={{ borderRadius: 8 }}>
              {t('common.reload') || 'Làm mới'}
            </Button>
          </Space>
        </div>

        {/* 1. Khối 4 thẻ KPI Tổng quan */}
        <DashboardKpiCards
          proj={proj}
          task={task}
          res={res}
          projectCompletionRate={projectCompletionRate}
          taskCompletionRate={taskCompletionRate}
          avgUtil={avgUtil}
          isDark={isDark}
          user={user}
          navigate={navigate}
          t={t}
        />

        {/* 2. Lối tắt Nhanh & Dòng Hoạt động Gần đây */}
        <DashboardQuickAndRecent
          recentTasks={data?.recentTasks || []}
          user={user}
          isDark={isDark}
          navigate={navigate}
          t={t}
        />

        {/* 3. Phân bổ Trạng thái Công việc & Tổng hợp Giờ công */}
        <DashboardTaskAndHours
          task={task}
          res={res}
          taskDistribution={taskDistribution}
          isDark={isDark}
          t={t}
        />
      </div>
    </Spin>
  );
}
