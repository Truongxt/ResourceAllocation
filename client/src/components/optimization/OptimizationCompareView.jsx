/**
 * ============================================================================
 * VIEW SO SÁNH ĐỐI SÁNH CÁC PHƯƠNG ÁN (Optimization Compare View Component)
 * ============================================================================
 *
 * Mục đích:
 *   - So sánh song song (Benchmark) từ 2 đến 4 kết quả chạy tối ưu hóa (GA vs CSP vs Hybrid).
 *   - Hiển thị bảng so sánh các chỉ số đa mục tiêu (Fitness, Khớp kỹ năng, Tải trọng, Thời gian giải...).
 *   - Đánh dấu sao (★) và màu xanh lá cho phương án đạt kết quả tốt nhất ở từng tiêu chí.
 *   - Bảng phân tích chi tiết sự khác biệt trong phân công công việc (Diff View) giữa các thuật toán.
 *
 * Props:
 *   - @param {Object} benchmark - Dữ liệu so sánh từ API optimizationService.compare()
 *   - @param {boolean} loading - Trạng thái đang tải dữ liệu so sánh
 *   - @param {Function} t - Hàm dịch ngôn ngữ i18n
 */

import { useState } from 'react';
import { Card, Table, Space, Tag, Typography, Alert, Spin, Empty, Switch } from 'antd';
import {
  ALGO_META,
  MAX_COMPARE,
  ResultHeader,
  formatMetric,
} from './OptimizationConstants';

const { Text } = Typography;

export default function OptimizationCompareView({ benchmark, loading = false, t }) {
  const [onlyDiff, setOnlyDiff] = useState(false);

  if (!benchmark) {
    return (
      <Spin spinning={loading}>
        <Card>
          <Empty
            description={
              t('optimization.benchmarkHint', { max: MAX_COMPARE }) ||
              'Chọn từ 2 đến 4 phương án trong tab Lịch sử và nhấn "So sánh đối sánh"'
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      </Spin>
    );
  }

  const resultColumns = benchmark.results || [];

  // Cấu hình các cột cho bảng so sánh chỉ số định lượng
  const metricColumns = [
    {
      title: t('optimization.metricColumn') || 'Chỉ số đánh giá',
      dataIndex: 'key',
      key: 'label',
      width: 230,
      render: (key, row) => (
        <div style={{ lineHeight: 1.35 }}>
          <Text strong style={{ fontSize: 13 }}>
            {t(`optimization.metric.${key}`, { defaultValue: key })}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {row.higherIsBetter === null
              ? t('optimization.direction.neutral') || 'Trung hòa'
              : row.higherIsBetter
                ? t('optimization.direction.higher') || 'Càng cao càng tốt'
                : t('optimization.direction.lower') || 'Càng thấp càng tốt'}
          </Text>
        </div>
      ),
    },
    ...resultColumns.map((result, index) => ({
      title: <ResultHeader result={result} t={t} />,
      key: result._id,
      align: 'center',
      render: (_, row) => {
        const isBest = row.bestIndex === index;
        return (
          <Text
            strong={isBest}
            style={{ fontSize: 13, color: isBest ? '#10b981' : undefined }}
          >
            {formatMetric(row.values[index], row, t)}
            {isBest && ' ★'}
          </Text>
        );
      },
    })),
  ];

  // Lọc danh sách phân công khác biệt nếu người dùng bật "Chỉ xem khác biệt"
  const diffRows = onlyDiff
    ? (benchmark.assignments.rows || []).filter((row) => !row.agreed)
    : benchmark.assignments.rows || [];

  // Cấu hình các cột cho bảng so sánh chi tiết phân công từng công việc
  const diffColumns = [
    {
      title: t('nav.tasks') || 'Công việc',
      dataIndex: 'taskTitle',
      key: 'task',
      width: 230,
      render: (title, row) => (
        <Space size={6} align="start">
          {!row.agreed && (
            <Tag color={row.comparable ? 'orange' : 'default'} style={{ margin: 0 }}>
              {row.comparable
                ? t('optimization.diffDiffers') || 'Khác biệt'
                : t('optimization.diffMissing') || 'Không thuộc phạm vi'}
            </Tag>
          )}
          <Text style={{ fontSize: 13 }}>{title}</Text>
        </Space>
      ),
    },
    ...resultColumns.map((result, index) => {
      const meta = ALGO_META[result.algorithm] || {
        icon: '•',
        label: result.algorithm,
        color: 'default',
      };
      return {
        title: (
          <Tag color={meta.color} style={{ margin: 0 }}>
            {meta.icon} {meta.label}
          </Tag>
        ),
        key: `${result._id}-assignment`,
        render: (_, row) => {
          const cell = row.cells[index];
          if (!cell) {
            return (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('optimization.notAssigned') || 'Chưa phân công'}
              </Text>
            );
          }
          return (
            <div style={{ lineHeight: 1.35 }}>
              <Text style={{ fontSize: 13 }}>
                {cell.resourceName || t('projectDetail.unknownUser') || '—'}
              </Text>
              {typeof cell.skillMatch === 'number' && (
                <>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {t('optimization.matchPercent', { percent: Math.round(cell.skillMatch) }) ||
                      `Khớp ${Math.round(cell.skillMatch)}%`}
                  </Text>
                </>
              )}
            </div>
          );
        },
      };
    }),
  ];

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Cảnh báo nếu so sánh giữa các dự án khác nhau hoặc số task không đồng nhất */}
        {benchmark.warnings.map((warning, idx) => (
          <Alert
            key={idx}
            type="warning"
            showIcon
            message={
              t(`optimization.warning.${warning.code}`, {
                count: warning.count,
                counts: (warning.counts || []).join(' / '),
              }) || 'Lưu ý: Các phương án có thể có phạm vi số lượng công việc khác nhau'
            }
          />
        ))}

        {/* Bảng so sánh các chỉ số hiệu năng */}
        <Card title={t('optimization.metricsTable') || 'Bảng so sánh chỉ số hiệu năng'} styles={{ body: { padding: 0 } }}>
          <Table
            columns={metricColumns}
            dataSource={benchmark.metrics}
            rowKey="key"
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        </Card>

        {/* Bảng phân tích chi tiết sự khác biệt trong phân công */}
        <Card
          title={t('optimization.diffTitle') || 'Chi tiết khác biệt trong phân công công việc'}
          extra={
            <Space size={8}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('optimization.onlyDiff') || 'Chỉ hiển thị công việc có sự khác biệt'}
              </Text>
              <Switch size="small" checked={onlyDiff} onChange={setOnlyDiff} />
            </Space>
          }
          styles={{ body: { padding: 0 } }}
        >
          <div style={{ padding: '12px 16px' }}>
            {benchmark.assignments.agreementRate === null ? (
              <Text type="secondary" style={{ fontSize: 13 }}>
                {t('optimization.noAgreement', { count: benchmark.results.length }) ||
                  'Không có công việc chung nào giữa các phương án'}
              </Text>
            ) : (
              <Text style={{ fontSize: 13 }}>
                {t('optimization.agreement', {
                  agreed: benchmark.assignments.agreed,
                  comparable: benchmark.assignments.comparable,
                  rate: benchmark.assignments.agreementRate,
                }) ||
                  `Mức độ đồng thuận: ${benchmark.assignments.agreementRate}% (${benchmark.assignments.agreed}/${benchmark.assignments.comparable} công việc trùng khớp phân công)`}
                {benchmark.assignments.total > benchmark.assignments.comparable && (
                  <Text type="secondary">
                    {' '}
                    (Đã loại trừ {benchmark.assignments.total - benchmark.assignments.comparable} công việc không đồng nhất phạm vi)
                  </Text>
                )}
              </Text>
            )}
          </div>

          <Table
            columns={diffColumns}
            dataSource={diffRows}
            rowKey="task"
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 'max-content' }}
            locale={{
              emptyText: onlyDiff
                ? t('optimization.identicalPlans') || 'Tất cả các phương án đều phân công giống nhau'
                : t('optimization.noAssignments') || 'Không có dữ liệu phân công',
            }}
          />
        </Card>
      </Space>
    </Spin>
  );
}
