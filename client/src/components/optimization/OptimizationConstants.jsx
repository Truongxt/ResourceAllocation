/**
 * ============================================================================
 * HẰNG SỐ & TIỆN ÍCH DÙNG CHUNG PHÂN HỆ TỐI ƯU HÓA (Optimization Constants)
 * ============================================================================
 *
 * Mục đích:
 *   - Tập trung các định nghĩa thuật toán (GA, CSP, Hybrid), metadata hiển thị icon/màu sắc,
 *     các hàm format hiển thị thời gian, đơn vị đo lường và Header bảng so sánh.
 */

import { Space, Tag, Typography } from 'antd';
import { formatDateTime, formatNumber } from '../../i18n/format';

const { Text } = Typography;

export const ALGO_VALUES = ['genetic', 'csp', 'hybrid'];

export const ALGO_META = {
  genetic: { icon: '🧬', label: 'GA', color: 'purple' },
  csp: { icon: '🔗', label: 'CSP', color: 'blue' },
  hybrid: { icon: '⚡', label: 'Hybrid', color: 'gold' },
};

/**
 * Đơn vị đi kèm từng chỉ số so sánh (được map với file ngôn ngữ i18n)
 */
export const METRIC_UNIT_KEYS = {
  averageSkillMatch: 'percent',
  workloadVariance: 'hours',
  overallocatedResources: 'people',
  averageUtilization: 'percent',
  executionTime: 'ms',
};

/**
 * Giới hạn số lượng phương án tối đa có thể chọn để so sánh đối sánh (Benchmark)
 */
export const MAX_COMPARE = 4;

/**
 * Định dạng hiển thị thời gian chạy (ms -> giây)
 * @param {number} ms - Số mili giây
 * @returns {string} Chuỗi hiển thị, ví dụ "45ms", "1.25s"
 */
export function formatTime(ms) {
  if (!ms) return '0ms';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Định dạng hiển thị chỉ số đánh giá kèm đơn vị
 * @param {number} value - Giá trị số
 * @param {Object} metric - Cấu hình metric từ server
 * @param {Function} t - Hàm dịch i18n
 */
export function formatMetric(value, metric, t) {
  if (typeof value !== 'number') return '—';
  const text = metric.digits > 0 ? value.toFixed(metric.digits) : formatNumber(Math.round(value));
  const unitKey = METRIC_UNIT_KEYS[metric.key];
  return unitKey ? `${text} ${t(`optimization.unit.${unitKey}`)}` : text;
}

/**
 * Component hiển thị tiêu đề cột trong bảng so sánh đa phương án
 */
export function ResultHeader({ result, t }) {
  const meta = ALGO_META[result.algorithm] || { icon: '•', label: result.algorithm, color: 'default' };
  const scope =
    result.projectFilter?.code || result.projectFilter?.name || t('optimization.wholeSystem');

  return (
    <Space direction="vertical" size={2} style={{ lineHeight: 1.35 }}>
      <Space size={4}>
        <Tag color={meta.color} style={{ margin: 0 }}>{meta.icon} {meta.label}</Tag>
        {result.isApplied && (
          <Tag color="cyan" style={{ margin: 0 }}>{t('optimization.applied')}</Tag>
        )}
      </Space>
      <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>
        {formatDateTime(result.createdAt)}
      </Text>
      <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>
        {t('optimization.scopeSummary', { count: result.taskCount, scope })}
      </Text>
    </Space>
  );
}
