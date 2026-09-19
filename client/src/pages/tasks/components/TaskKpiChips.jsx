/**
 * ============================================================================
 * COMPACT TASK METRICS STRIP (Human-Crafted B2B SaaS)
 * ============================================================================
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
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      {/* Thẻ 1: Tổng công việc */}
      <Col xs={12} sm={6}>
        <div className="saas-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="icon-chip icon-chip-primary" style={{ width: 30, height: 30, fontSize: 13 }}>
            <ClockCircleOutlined />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {t('tasks.stats.total') || 'Tổng số'}
            </Text>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }} className="tabular-nums">
              {stats.total || 0}
            </div>
          </div>
        </div>
      </Col>

      {/* Thẻ 2: Đang thực hiện */}
      <Col xs={12} sm={6}>
        <div className="saas-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="icon-chip icon-chip-info" style={{ width: 30, height: 30, fontSize: 13 }}>
            <SyncOutlined spin />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {t('enums.taskStatus.in_progress') || 'Đang làm'}
            </Text>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--brand-primary)' }} className="tabular-nums">
              {stats.inProgress || 0}
            </div>
          </div>
        </div>
      </Col>

      {/* Thẻ 3: Đã hoàn thành */}
      <Col xs={12} sm={6}>
        <div className="saas-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="icon-chip icon-chip-success" style={{ width: 30, height: 30, fontSize: 13 }}>
            <CheckCircleOutlined />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {t('enums.taskStatus.done') || 'Hoàn thành'}
            </Text>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--status-success)' }} className="tabular-nums">
              {stats.done || 0}
            </div>
          </div>
        </div>
      </Col>

      {/* Thẻ 4: Bị chặn */}
      <Col xs={12} sm={6}>
        <div className="saas-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className={`icon-chip ${stats.blocked > 0 ? 'icon-chip-danger' : 'icon-chip-primary'}`} style={{ width: 30, height: 30, fontSize: 13 }}>
            <CloseCircleOutlined />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {t('enums.taskStatus.blocked') || 'Bị chặn'}
            </Text>
            <div style={{ fontSize: 18, fontWeight: 600, color: stats.blocked > 0 ? 'var(--status-danger)' : 'var(--text-primary)' }} className="tabular-nums">
              {stats.blocked || 0}
            </div>
          </div>
        </div>
      </Col>
    </Row>
  );
}
