import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Card, DatePicker, Segmented, Space, Spin, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import MetricStrip from '../common/MetricStrip';
import analyticsService from '../../services/analyticsService';
import { useAuth } from '../../context/AuthContext';

const { Text } = Typography;

/**
 * Báo cáo kết quả theo người — `GET /analytics/performance`.
 *
 * Kỳ báo cáo lọc theo deadline: việc có hạn trong kỳ thì thuộc kỳ đó. Đúng/trễ hạn do
 * server tính từ `completedAt`. "Toàn công ty" chỉ hiện với Owner/Admin, vì server trả
 * 403 cho người khác.
 */
export default function PerformanceReport() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canSeeAll = Boolean(user?.isOwner || user?.role === 'admin');
  const [scope, setScope] = useState(canSeeAll ? 'all' : 'me');
  const [range, setRange] = useState(() => [dayjs().startOf('month'), dayjs().endOf('month')]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await analyticsService.getPerformance({
        scope,
        from: range[0].format('YYYY-MM-DD'),
        to: range[1].format('YYYY-MM-DD'),
      });
      setData(res.data.data);
    } catch {
      setData(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [scope, range]);

  useEffect(() => {
    load();
  }, [load]);

  const rate = (value) => (value === null || value === undefined ? '—' : `${value}%`);
  const num = (key, title, danger) => ({
    title,
    dataIndex: key,
    key,
    align: 'right',
    sorter: (a, b) => a[key] - b[key],
    render: (v) => (danger && v > 0 ? <Text type="danger">{v}</Text> : v),
  });

  const columns = [
    {
      title: t('reports.performance.columns.person'),
      key: 'person',
      render: (_, r) => (
        <div>
          <Text strong>{r.user?.name}</Text>
          {r.department && <div><Text type="secondary" style={{ fontSize: 12 }}>{r.department}</Text></div>}
        </div>
      ),
    },
    num('total', t('reports.performance.columns.total')),
    num('onTime', t('reports.performance.columns.onTime')),
    num('late', t('reports.performance.columns.late'), true),
    num('failed', t('reports.performance.columns.failed'), true),
    num('overdue', t('reports.performance.columns.overdue'), true),
    num('pendingReview', t('reports.performance.columns.pendingReview')),
    num('extensions', t('reports.performance.columns.extensions')),
    {
      title: t('reports.performance.columns.onTimeRate'),
      dataIndex: 'onTimeRate',
      key: 'onTimeRate',
      align: 'right',
      sorter: (a, b) => (a.onTimeRate ?? -1) - (b.onTimeRate ?? -1),
      render: rate,
    },
  ];

  const totals = data?.totals;
  const scopeOptions = [
    { label: t('reports.performance.scopeMe'), value: 'me' },
    { label: t('reports.performance.scopeSubordinates'), value: 'subordinates' },
    ...(canSeeAll ? [{ label: t('reports.performance.scopeAll'), value: 'all' }] : []),
  ];

  return (
    <Spin spinning={loading}>
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <Card styles={{ body: { padding: '12px 16px' } }}>
          <Space wrap size={16}>
            <Segmented value={scope} onChange={setScope} options={scopeOptions} />
            <DatePicker.RangePicker
              value={range}
              onChange={(value) => value && setRange(value)}
              format="DD/MM/YYYY"
              allowClear={false}
            />
            <Text type="secondary">{t('reports.performance.periodHint')}</Text>
          </Space>
        </Card>

        {error && <Alert type="error" showIcon title={t('reports.performance.loadError')} />}

        {totals && (
          <MetricStrip items={[
            { label: t('reports.performance.columns.total'), value: totals.total },
            { label: t('reports.performance.columns.onTimeRate'), value: rate(totals.onTimeRate) },
            { label: t('reports.performance.columns.late'), value: totals.late, danger: totals.late > 0 },
            { label: t('reports.performance.columns.overdue'), value: totals.overdue, danger: totals.overdue > 0 },
            { label: t('reports.performance.columns.failed'), value: totals.failed, danger: totals.failed > 0 },
          ]} />
        )}

        {(totals?.doneNoTimestamp > 0 || data?.excluded?.noDeadline > 0) && (
          <Alert
            type="warning"
            showIcon
            title={
              <>
                {totals.doneNoTimestamp > 0 && (
                  <div>{t('reports.performance.noTimestamp', { count: totals.doneNoTimestamp })}</div>
                )}
                {data.excluded.noDeadline > 0 && (
                  <div>{t('reports.performance.noDeadline', { count: data.excluded.noDeadline })}</div>
                )}
              </>
            }
          />
        )}

        <Card styles={{ body: { padding: 0 } }}>
          <Table
            columns={columns}
            dataSource={data?.people || []}
            rowKey={(r) => r.user?._id}
            pagination={{ pageSize: 20 }}
            locale={{
              emptyText: scope === 'subordinates'
                ? t('reports.performance.emptySubordinates')
                : t('reports.performance.empty'),
            }}
          />
        </Card>
      </Space>
    </Spin>
  );
}
