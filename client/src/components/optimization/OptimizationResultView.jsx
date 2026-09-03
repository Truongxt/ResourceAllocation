/**
 * ============================================================================
 * VIEW XEM CHI TIẾT KẾT QUẢ TỐI ƯU HÓA (Optimization Result View Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Trực quan hóa toàn diện kết quả giải bài toán phân bổ nguồn lực:
 *     1. Thống kê KPI: Điểm thích nghi (Fitness), Chi phí (Cost), Khớp kỹ năng, Độ lệch chuẩn tải.
 *     2. Biểu đồ tiến hóa / hội tụ (Convergence History) qua từng thế hệ của Genetic Algorithm.
 *     3. Thanh thao tác: Nút Áp Dụng (Apply) vào hệ thống và Nút Hoàn Tác (Rollback) an toàn.
 *     4. Báo cáo mức độ thu hẹp miền giá trị CSP (khi chạy Hybrid).
 *     5. Báo cáo các ràng buộc cứng bị vi phạm (Constraint Report của CSP).
 *     6. Bảng danh sách phân công công việc chi tiết (Task Assignments).
 */

import {
  Row,
  Col,
  Card,
  Statistic,
  Space,
  Tag,
  Typography,
  Tooltip,
  Alert,
  Table,
  Button,
  Popconfirm,
  Empty,
  Progress,
} from 'antd';
import {
  CheckOutlined,
  CheckCircleOutlined,
  RollbackOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { formatNumber } from '../../i18n/format';

const { Text } = Typography;

export default function OptimizationResultView({
  currentResult,
  onApply,
  onRollback,
  t,
}) {
  if (!currentResult) {
    return (
      <Card>
        <Empty
          description={t('optimization.noResult') || 'Chưa có kết quả tối ưu hóa nào được chọn'}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  // Cấu hình các cột cho bảng phân công chi tiết
  const assignmentColumns = [
    {
      title: t('optimization.taskTitle') || 'Công việc',
      dataIndex: 'taskTitle',
      key: 'taskTitle',
      render: (title, r) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{title || r.title}</Text>
          {r.task?.project?.name && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                📁 {r.task.project.name}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t('optimization.assignedResource') || 'Nhân sự được giao',
      dataIndex: 'resourceName',
      key: 'resourceName',
      render: (name, r) => (
        <Space>
          <span style={{ fontSize: 14 }}>👤</span>
          <Text strong>{name || r.resource?.user?.name || r.resource?.position || '—'}</Text>
        </Space>
      ),
    },
    {
      title: t('optimization.skillMatch') || 'Độ khớp kỹ năng',
      dataIndex: 'skillMatch',
      key: 'skillMatch',
      render: (match) => {
        const pct = Math.round((match || 0) * 100);
        const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
        return (
          <Space>
            <Progress
              percent={pct}
              size="small"
              strokeColor={color}
              style={{ width: 80 }}
              showInfo={false}
            />
            <Text style={{ fontSize: 12, fontWeight: 600, color }}>{pct}%</Text>
          </Space>
        );
      },
    },
    {
      title: t('optimization.estimatedHours') || 'Số giờ',
      dataIndex: 'estimatedHours',
      key: 'estimatedHours',
      render: (h) => `${h || 0}h`,
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {/* Khối thẻ KPI tổng quan */}
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card hoverable styles={{ body: { padding: '16px' } }}>
            <Statistic
              title={t('optimization.fitnessScore') || 'Điểm thích nghi'}
              value={currentResult.fitness ? (currentResult.fitness).toFixed(4) : '—'}
              valueStyle={{ color: '#6366f1', fontWeight: 700 }}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card hoverable styles={{ body: { padding: '16px' } }}>
            <Statistic
              title={t('optimization.totalCost') || 'Tổng chi phí'}
              value={currentResult.metrics?.totalCost || 0}
              formatter={(v) => formatNumber(v)}
              suffix="₫"
              valueStyle={{ color: '#06b6d4', fontWeight: 700 }}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card hoverable styles={{ body: { padding: '16px' } }}>
            <Statistic
              title={t('optimization.avgSkillMatch') || 'Khớp kỹ năng TB'}
              value={
                currentResult.metrics?.averageSkillMatch !== undefined
                  ? `${Math.round(currentResult.metrics.averageSkillMatch * 100)}%`
                  : '—'
              }
              valueStyle={{ color: '#10b981', fontWeight: 700 }}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card hoverable styles={{ body: { padding: '16px' } }}>
            <Statistic
              title={t('optimization.workloadVariance') || 'Độ lệch tải (StdDev)'}
              value={
                currentResult.metrics?.workloadVariance !== undefined
                  ? currentResult.metrics.workloadVariance.toFixed(2)
                  : '—'
              }
              suffix="h"
              valueStyle={{ color: '#f59e0b', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ hội tụ GA (Convergence History) */}
      {currentResult.convergenceHistory && currentResult.convergenceHistory.length > 1 && (
        <Card
          size="small"
          title={t('optimization.convergenceChart') || '📈 Quá trình tiến hóa & hội tụ giải thuật (GA)'}
        >
          <div
            style={{
              height: 120,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 2,
              padding: '8px 0',
              overflowX: 'auto',
            }}
          >
            {currentResult.convergenceHistory.map((point, idx) => {
              const fitness = point.bestFitness || point.fitness || 0;
              const heightPct = Math.max(5, Math.min(100, Math.round(fitness * 100)));
              return (
                <Tooltip
                  key={idx}
                  title={`Thế hệ ${point.generation}: Fitness = ${fitness.toFixed(4)}`}
                >
                  <div
                    style={{
                      flex: 1,
                      minWidth: 4,
                      height: `${heightPct}%`,
                      background: 'linear-gradient(to top, #6366f1, #14b8a6)',
                      borderRadius: '2px 2px 0 0',
                      opacity: 0.85,
                    }}
                  />
                </Tooltip>
              );
            })}
          </div>
        </Card>
      )}

      {/* Thanh thao tác (Action Bar: Áp dụng & Hoàn tác) */}
      <Card styles={{ body: { padding: '16px 20px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong>{t('optimization.bestPlan') || 'Phương án tối ưu được đề xuất'}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('optimization.assignedFound', {
                count: currentResult.assignments?.length || 0,
              }) || `Đã tìm thấy phương án phân công cho ${currentResult.assignments?.length || 0} công việc`}
            </Text>
          </div>

          {currentResult.isRolledBack ? (
            <Tag color="default" style={{ padding: '6px 12px', fontSize: 13 }}>
              <RollbackOutlined /> Đã hoàn tác phân bổ
            </Tag>
          ) : !currentResult.isApplied ? (
            <Popconfirm
              title={t('optimization.applyConfirm') || 'Áp dụng phương án này?'}
              description={t('optimization.applyConfirmDb') || 'Người thực hiện của các công việc trong hệ thống sẽ được cập nhật.'}
              onConfirm={() => onApply(currentResult._id)}
              okText={t('common.confirm') || 'Xác nhận'}
              cancelText={t('common.cancel') || 'Hủy'}
            >
              <Button type="primary" icon={<CheckOutlined />} size="large">
                {t('optimization.applyThis') || 'Áp dụng phương án này'}
              </Button>
            </Popconfirm>
          ) : (
            <Space>
              <Tag color="success" style={{ padding: '6px 12px', fontSize: 13 }}>
                <CheckCircleOutlined /> {t('optimization.appliedToSystem') || 'Đã áp dụng vào hệ thống'}
              </Tag>
              <Popconfirm
                title="Hoàn tác phân bổ này?"
                description="Khôi phục lại người thực hiện của các công việc về trạng thái trước khi áp dụng phương án này."
                onConfirm={() => onRollback(currentResult._id)}
                okText="Hoàn tác"
                cancelText="Hủy"
              >
                <Button danger icon={<RollbackOutlined />} size="large">
                  Hoàn tác phân bổ
                </Button>
              </Popconfirm>
            </Space>
          )}
        </div>
      </Card>

      {/* Báo cáo thu hẹp không gian tìm kiếm (Pha CSP trong Hybrid) */}
      {currentResult.domainReduction?.restricted && (
        <Card size="small" title={`🔗 ${t('optimization.domain.title') || 'Hiệu quả thu hẹp không gian tìm kiếm (CSP)'}`}>
          <Space size={32} wrap>
            <Statistic
              title={t('optimization.domain.pairsLeft') || 'Số cặp khả thi còn lại'}
              value={currentResult.domainReduction.feasiblePairs}
              suffix={`/ ${currentResult.domainReduction.totalPairs}`}
            />
            <Statistic
              title={t('optimization.domain.reducedBy') || 'Thu hẹp không gian tìm kiếm'}
              value={Math.round(
                (1 -
                  currentResult.domainReduction.feasiblePairs /
                    currentResult.domainReduction.totalPairs) *
                  100
              )}
              suffix="%"
              valueStyle={{ color: '#10b981' }}
            />
          </Space>
          {currentResult.domainReduction.tasksReopened > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 12 }}
              message={t('optimization.domain.reopened', {
                count: currentResult.domainReduction.tasksReopened,
              }) || `Đã mở lại toàn bộ miền cho ${currentResult.domainReduction.tasksReopened} công việc`}
              description={t('optimization.domain.reopenedBody') || 'Một số công việc có miền rỗng do ràng buộc quá chặt, hệ thống đã nới lỏng để GA tìm lời giải gần tối ưu.'}
            />
          )}
        </Card>
      )}

      {/* Báo cáo ràng buộc vi phạm (CSP / Hybrid) */}
      {currentResult.constraintReport?.details?.violated?.length > 0 && (
        <Card
          size="small"
          title={
            <Space>
              <WarningOutlined style={{ color: '#f59e0b' }} />
              <span>
                {t('optimization.metric.violatedConstraints') || 'Ràng buộc bị vi phạm'} (
                {currentResult.constraintReport.details.violated.length})
              </span>
            </Space>
          }
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              Thỏa mãn {currentResult.constraintReport.satisfied} ràng buộc
            </Text>
          }
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {currentResult.constraintReport.details.violated.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <Tag color={item.type === 'dependency' ? 'orange' : 'red'} style={{ margin: 0 }}>
                  {item.type === 'dependency' ? 'Thứ tự phụ thuộc' : 'Quá tải Capacity'}
                </Tag>
                <Text strong style={{ fontSize: 13 }}>{item.subject}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>— {item.detail}</Text>
              </div>
            ))}
          </Space>
        </Card>
      )}

      {/* Bảng chi tiết phân công công việc */}
      <Card title={t('optimization.assignmentDetail') || 'Chi tiết phân công công việc'} styles={{ body: { padding: 0 } }}>
        <Table
          columns={assignmentColumns}
          dataSource={currentResult.assignments || []}
          rowKey={(r, idx) => r.taskId || r.task || idx}
          pagination={{ pageSize: 8 }}
        />
      </Card>
    </Space>
  );
}
