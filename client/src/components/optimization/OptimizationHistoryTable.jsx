/**
 * ============================================================================
 * BẢNG LỊCH SỬ TỐI ƯU HÓA & CHỌN SO SÁNH (Optimization History Table Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Hiển thị danh sách các lần thực thi thuật toán trước đây (GA, CSP, Hybrid).
 *   - Cho phép người dùng xem lại kết quả chi tiết, áp dụng hoặc hoàn tác phân bổ.
 *   - Cho phép chọn từ 2 đến 4 phương án bằng checkbox để tiến hành so sánh đối sánh (Benchmark).
 *
 * Props:
 *   - @param {Array} history - Danh sách lịch sử các đợt chạy tối ưu
 *   - @param {Array} selectedIds - Danh sách các ID được tích chọn
 *   - @param {Function} setSelectedIds - Hàm cập nhật danh sách ID được tích chọn
 *   - @param {Function} onViewResult - Hàm xem chi tiết 1 kết quả
 *   - @param {Function} onApply - Hàm áp dụng phân công vào hệ thống
 *   - @param {Function} onRollback - Hàm hoàn tác phân bổ
 *   - @param {Function} onCompare - Hàm kích hoạt so sánh các phương án đã chọn
 *   - @param {boolean} benchmarkLoading - Trạng thái đang tải so sánh
 *   - @param {Function} onReload - Hàm tải lại lịch sử
 *   - @param {Function} t - Hàm dịch ngôn ngữ i18n
 */

import { Card, Table, Space, Button, Tag, Typography, Popconfirm } from 'antd';
import {
  EyeOutlined,
  CheckOutlined,
  RollbackOutlined,
  ReloadOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { MAX_COMPARE, formatTime } from './OptimizationConstants';

const { Text } = Typography;

export default function OptimizationHistoryTable({
  history = [],
  selectedIds = [],
  setSelectedIds,
  onViewResult,
  onApply,
  onRollback,
  onCompare,
  benchmarkLoading = false,
  onReload,
  t,
}) {
  // Cấu hình các cột hiển thị trong bảng lịch sử
  const columns = [
    {
      title: t('optimization.algorithm') || 'Thuật toán',
      dataIndex: 'algorithm',
      key: 'algorithm',
      render: (algo) => {
        const icon = algo === 'genetic' ? '🧬' : algo === 'csp' ? '🔗' : '⚡';
        return <Tag color="blue">{icon} {algo?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Fitness',
      dataIndex: 'fitness',
      key: 'fitness',
      render: (fitness) => <Text strong style={{ color: '#6366f1' }}>{fitness ? fitness.toFixed(4) : '—'}</Text>,
    },
    {
      title: t('optimization.scale') || 'Quy mô',
      key: 'scale',
      render: (_, record) => (
        <Text type="secondary">
          {record.taskCount} tasks • {record.resourceCount} nhân sự
        </Text>
      ),
    },
    {
      title: t('optimization.runtime') || 'Thời gian',
      dataIndex: 'executionTime',
      key: 'executionTime',
      render: (time) => formatTime(time || 0),
    },
    {
      title: t('common.status') || 'Trạng thái',
      key: 'status',
      render: (_, record) => (
        <Space>
          <Tag color={record.status === 'completed' ? 'success' : 'error'}>
            {record.status === 'completed' ? 'Hoàn thành' : 'Thất bại'}
          </Tag>
          {record.isApplied && !record.isRolledBack && <Tag color="cyan">Đã áp dụng</Tag>}
          {record.isRolledBack && <Tag color="default">Đã hoàn tác</Tag>}
        </Space>
      ),
    },
    {
      title: t('common.actions') || 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => onViewResult(record._id)}>
            Xem
          </Button>

          {record.status === 'completed' && !record.isApplied && !record.isRolledBack && (
            <Popconfirm
              title={t('optimization.applyConfirm') || 'Áp dụng phương án này?'}
              description={t('optimization.applyConfirmBody') || 'Người thực hiện của các công việc trong hệ thống sẽ được cập nhật.'}
              onConfirm={() => onApply(record._id)}
              okText="Áp dụng"
              cancelText="Hủy"
            >
              <Button size="small" type="primary" icon={<CheckOutlined />}>
                Áp dụng
              </Button>
            </Popconfirm>
          )}

          {record.isApplied && !record.isRolledBack && (
            <Popconfirm
              title="Hoàn tác phân bổ này?"
              description="Khôi phục lại phân công cũ trước khi phương án này được áp dụng."
              onConfirm={() => onRollback(record._id)}
              okText="Hoàn tác"
              cancelText="Hủy"
            >
              <Button size="small" danger icon={<RollbackOutlined />}>
                Hoàn tác
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={t('optimization.historyTitle') || 'Lịch sử chạy tối ưu hóa'}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={onReload}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<ExperimentOutlined />}
            disabled={selectedIds.length < 2 || selectedIds.length > MAX_COMPARE}
            loading={benchmarkLoading}
            onClick={onCompare}
          >
            So sánh đối sánh
            {selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={history}
        rowKey="_id"
        pagination={{ pageSize: 8 }}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: setSelectedIds,
          getCheckboxProps: (record) => ({
            // Khóa checkbox nếu đã chọn tối đa 4 phương án
            disabled: selectedIds.length >= MAX_COMPARE && !selectedIds.includes(record._id),
          }),
        }}
      />
    </Card>
  );
}
