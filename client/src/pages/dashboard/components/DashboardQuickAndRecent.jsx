/**
 * ============================================================================
 * LỐI TẮT NHANH & NHẬT KÝ HOẠT ĐỘNG GẦN ĐÂY (Quick Actions & Recent Activity)
 * ============================================================================
 *
 * Mục đích:
 *   - Bên trái: Các ô lối tắt điều hướng nhanh đến Tối ưu hóa, Bảng Kanban, Quản lý đội ngũ.
 *   - Bên phải: Dòng thời gian hiển thị các công việc/hoạt động vừa được cập nhật gần nhất.
 */

import { Row, Col, Typography, Button, Empty, Tag } from 'antd';
import {
  ThunderboltOutlined,
  UnorderedListOutlined,
  ProjectOutlined,
  TeamOutlined,
  ArrowRightOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { taskStatusLabel } from '../../../i18n/enums';
import { formatTimeAgo } from '../../../i18n/format';
import {
  TASK_STATUS_BADGE_COLORS as STATUS_COLORS,
  TASK_STATUS_COLORS,
} from '../../../constants';

const { Text } = Typography;

export default function DashboardQuickAndRecent({
  recentTasks = [],
  user,
  isDark = false,
  navigate,
  t,
}) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {/* Cột trái: Lối tắt Nhanh */}
      <Col xs={24} lg={10}>
        <div className="saas-card" style={{ padding: 20, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <ThunderboltOutlined style={{ fontSize: 16, color: '#6366f1' }} />
            <Text strong style={{ fontSize: 14 }}>
              {t('dashboard.quickActions') || 'Lối tắt Nhanh'}
            </Text>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Tile 1: Chạy Tối ưu hóa */}
            <div
              onClick={() => navigate('/optimization')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 10,
                background: isDark ? 'rgba(99, 102, 241, 0.08)' : '#eef2ff',
                border: isDark ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid #e0e7ff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              className="quick-action-tile"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 18,
                  }}
                >
                  <ThunderboltOutlined />
                </div>
                <div>
                  <Text strong style={{ fontSize: 13, display: 'block', color: isDark ? '#f8fafc' : '#1e1b4b' }}>
                    {t('dashboard.optimizeAllocation') || 'Chạy Tối ưu hóa Phân bổ'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Thuật toán GA / CSP tự động cân bằng tải
                  </Text>
                </div>
              </div>
              <ArrowRightOutlined style={{ color: '#818cf8', fontSize: 14 }} />
            </div>

            {/* Tile 2: Bảng Kanban */}
            <div
              onClick={() => navigate('/tasks')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 10,
                background: isDark ? 'rgba(6, 182, 212, 0.08)' : '#ecfeff',
                border: isDark ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid #cffafe',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              className="quick-action-tile"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 18,
                  }}
                >
                  <UnorderedListOutlined />
                </div>
                <div>
                  <Text strong style={{ fontSize: 13, display: 'block', color: isDark ? '#f8fafc' : '#164e63' }}>
                    {t('dashboard.manageTasks') || 'Bảng Kanban Công việc'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Kéo thả và cập nhật tiến độ công việc
                  </Text>
                </div>
              </div>
              <ArrowRightOutlined style={{ color: '#22d3ee', fontSize: 14 }} />
            </div>

            {/* Tile 3: Nhân sự / Dự án */}
            <div
              onClick={() => navigate(user?.role === 'member' ? '/projects' : '/resources')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 10,
                background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
                border: isDark ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid #dcfce7',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              className="quick-action-tile"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 18,
                  }}
                >
                  {user?.role === 'member' ? <ProjectOutlined /> : <TeamOutlined />}
                </div>
                <div>
                  <Text strong style={{ fontSize: 13, display: 'block', color: isDark ? '#f8fafc' : '#14532d' }}>
                    {user?.role === 'member' ? (t('nav.projects') || 'Dự án của tôi') : (t('dashboard.manageResources') || 'Quản lý Đội ngũ & Kỹ năng')}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {user?.role === 'member' ? 'Xem danh sách dự án tham gia' : 'Ma trận kỹ năng và phân bổ phòng ban'}
                  </Text>
                </div>
              </div>
              <ArrowRightOutlined style={{ color: '#34d399', fontSize: 14 }} />
            </div>
          </div>
        </div>
      </Col>

      {/* Cột phải: Dòng hoạt động gần đây */}
      <Col xs={24} lg={14}>
        <div className="saas-card" style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HistoryOutlined style={{ fontSize: 16, color: '#818cf8' }} />
              <Text strong style={{ fontSize: 14 }}>
                {t('dashboard.recentActivity') || 'Nhật ký Hoạt động Gần đây'}
              </Text>
            </div>
            <Button type="link" size="small" onClick={() => navigate('/activity-logs')} style={{ padding: 0, color: '#818cf8' }}>
              {t('common.viewAll') || 'Xem tất cả →'}
            </Button>
          </div>

          {(recentTasks || []).length === 0 ? (
            <Empty description={t('dashboard.noActivity') || 'Chưa có hoạt động nào'} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: 'auto' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 250 }}>
              {(recentTasks || []).slice(0, 6).map((item) => (
                <div
                  key={item._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: TASK_STATUS_COLORS[item.status] || '#6366f1',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ overflow: 'hidden' }}>
                      <Text strong style={{ fontSize: 13, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        {item.project && (
                          <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }}>
                            📁 {item.project.name}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}>•</span>
                        <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
                          👤 {item.assignee?.name || 'Chưa gán'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <Tag color={STATUS_COLORS[item.status]} style={{ margin: 0, borderRadius: 12, fontSize: 11 }}>
                      {taskStatusLabel(item.status)}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {formatTimeAgo(item.updatedAt, t)}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Col>
    </Row>
  );
}
