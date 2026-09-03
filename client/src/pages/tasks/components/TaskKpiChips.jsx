/**
 * ============================================================================
 * KHỐI CHỈ SỐ KPI CÔNG VIỆC (Task KPI Chips Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Hiển thị 4 thẻ tóm tắt nhanh:
 *     1. Tổng số công việc (Total)
 *     2. Đang thực hiện (In Progress)
 *     3. Đã hoàn thành (Done)
 *     4. Bị chặn / Tạm hoãn (Blocked)
 */

import { Row, Col, Typography } from 'antd';
import {
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

export default function TaskKpiChips({ stats = {}, isDark = false, t }) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
      {/* Thẻ 1: Tổng công việc */}
      <Col xs={12} sm={6}>
        <div className="saas-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="icon-chip icon-chip-primary">
            <ClockCircleOutlined />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
              {t('tasks.stats.total') || 'Tổng công việc'}
            </Text>
            <div style={{ fontSize: 22, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }} className="tabular-nums">
              {stats.total || 0}
            </div>
          </div>
        </div>
      </Col>

      {/* Thẻ 2: Đang thực hiện */}
      <Col xs={12} sm={6}>
        <div className="saas-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="icon-chip icon-chip-info">
            <SyncOutlined spin />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
              {t('enums.taskStatus.in_progress') || 'Đang thực hiện'}
            </Text>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#06b6d4' }} className="tabular-nums">
              {stats.inProgress || 0}
            </div>
          </div>
        </div>
      </Col>

      {/* Thẻ 3: Đã hoàn thành */}
      <Col xs={12} sm={6}>
        <div className="saas-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="icon-chip icon-chip-success">
            <CheckCircleOutlined />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
              {t('enums.taskStatus.done') || 'Hoàn thành'}
            </Text>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }} className="tabular-nums">
              {stats.done || 0}
            </div>
          </div>
        </div>
      </Col>

      {/* Thẻ 4: Bị chặn */}
      <Col xs={12} sm={6}>
        <div className="saas-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={`icon-chip ${stats.blocked > 0 ? 'icon-chip-danger' : 'icon-chip-primary'}`}>
            <CloseCircleOutlined />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
              {t('enums.taskStatus.blocked') || 'Bị chặn'}
            </Text>
            <div style={{ fontSize: 22, fontWeight: 800, color: stats.blocked > 0 ? '#ef4444' : isDark ? '#f8fafc' : '#0f172a' }} className="tabular-nums">
              {stats.blocked || 0}
            </div>
          </div>
        </div>
      </Col>
    </Row>
  );
}
