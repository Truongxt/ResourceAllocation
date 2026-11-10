import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Empty, Popconfirm, Segmented, Space, Spin, Table, Tag, Typography } from 'antd';
import { ReloadOutlined, SwapOutlined } from '@ant-design/icons';
import optimizationService from '../../services/optimizationService';

const { Text } = Typography;

export default function OptimizationProposalPreview({ resultId, onApply, constraintViolations = 0 }) {
  const { t } = useTranslation();
  const label = (key, options) => t(`optimizationReview.${key}`, options);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyFailed, setApplyFailed] = useState(false);
  const [week, setWeek] = useState(0);
  const request = useRef(0);
  const load = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    setError(false);
    setData(null);
    try {
      const response = await optimizationService.getPreview(resultId);
      if (current === request.current) setData(response.data.data);
    } catch {
      if (current === request.current) setError(true);
    } finally {
      if (current === request.current) setLoading(false);
    }
  }, [resultId]);
  useEffect(() => {
    setApplyFailed(false);
    load();
    return () => { request.current++; };
  }, [load]);

  const apply = async () => {
    setApplying(true);
    try {
      const applied = await onApply(resultId, data.previewToken);
      if (applied === false) { setApplyFailed(true); await load(); }
    } catch {
      setApplyFailed(true);
      await load();
    } finally { setApplying(false); }
  };
  const loadCell = (value) => (
    <Space orientation="vertical" size={0}>
      <Text strong>{value.workload}h / {value.capacity}h</Text>
      <Text type={value.workload > value.capacity ? 'danger' : 'secondary'}>
        {value.noCapacity ? label('noCapacity') : `${value.utilizationRate}%`}
      </Text>
      {value.unscheduledWorkload > 0 && <Text type="warning">{label('unscheduled', { hours: value.unscheduledWorkload })}</Text>}
    </Space>
  );
  const workloadRows = (data?.workloads || []).map((person) => ({ ...person, ...person.periods[week] }));
  const overloaded = workloadRows.filter((person) => person.after.workload > person.after.capacity).length;

  return (
    <Card>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text strong style={{ fontSize: 16 }}><SwapOutlined /> {label('title')}</Text>
          <Button icon={<ReloadOutlined />} onClick={load} disabled={loading || applying}>{label('refresh')}</Button>
        </Space>
        <Text type="secondary">{label('intro')}</Text>
        {constraintViolations > 0 && <Alert type="warning" showIcon title={label('constraints', { count: constraintViolations })} />}
        {loading && <Spin aria-label={label('loading')} />}
        {error && <Alert type="error" showIcon title={label('loadError')}
          action={<Button onClick={load}>{label('retry')}</Button>} />}
        {applyFailed && <Alert type="warning" showIcon title={label('applyFailed')} />}
        {data && !loading && <>
          <Space wrap>
            <Tag color="blue">{label('changed', { count: data.changedCount })}</Tag>
            <Tag>{label('unchanged', { count: data.unchangedCount })}</Tag>
            {data.blockedCount > 0 && <Tag color="error">{label('blocked', { count: data.blockedCount })}</Tag>}
          </Space>
          {data.blockedCount > 0 && <Alert type="error" showIcon title={label('invalidPlan')} />}
          <Table size="small" rowKey="key" dataSource={data.assignments} scroll={{ x: 760 }}
            pagination={{ pageSize: 8, hideOnSinglePage: true }} columns={[
              { title: label('task'), dataIndex: 'title', render: (title, row) => <Space orientation="vertical" size={2}>
                <Text strong>{title}</Text><Text type="secondary">{label('totalHours', { hours: row.estimatedHours })}</Text>
              </Space> },
              { title: label('current'), dataIndex: 'currentName', render: (name) => name || label('unassigned') },
              { title: label('proposed'), dataIndex: 'proposedName', render: (name) => <Text strong>{name || '—'}</Text> },
              { title: label('change'), dataIndex: 'change', render: (change, row) => <Space orientation="vertical" size={2}>
                <Tag color={row.issue ? 'error' : change === 'unchanged' ? 'default' : 'blue'}>{label(`changes.${change}`)}</Tag>
                {row.issue && <Text type="danger">{label(`issues.${row.issue}`)}</Text>}
              </Space> },
              { title: label('skillMatch'), dataIndex: 'skillMatch', render: (match) => match == null ? '—' : `${Math.round(match)}%` },
            ]} />
          <Text type="secondary">{label('skillNote')}</Text>
          <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
            <Text strong>{label('workload')}</Text>
            <Segmented value={week} onChange={setWeek} options={[{ label: label('thisWeek'), value: 0 }, { label: label('nextWeek'), value: 1 }]} />
          </Space>
          {workloadRows.length > 0 ? <>
            <Text type="secondary">{workloadRows[0].from} → {workloadRows[0].to} · {label('timezone')}</Text>
            {overloaded > 0 && <Alert type="warning" showIcon title={label('overloaded', { count: overloaded })} />}
            <Table size="small" rowKey="resourceId" dataSource={workloadRows} scroll={{ x: 500 }}
              pagination={{ pageSize: 8, hideOnSinglePage: true }} columns={[
                { title: label('person'), dataIndex: 'name' },
                { title: label('before'), dataIndex: 'before', render: loadCell },
                { title: label('after'), dataIndex: 'after', render: loadCell },
                { title: label('difference'), render: (_, row) => {
                  const delta = Math.round((row.after.workload - row.before.workload) * 100) / 100;
                  return <Text>{delta > 0 ? '+' : ''}{delta}h</Text>;
                } },
              ]} />
          </> : <Empty description={label('noPeople')} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          <Text type="secondary">{label('formula')}</Text>
          {!data.changedCount && !data.blockedCount && <Alert type="info" showIcon title={label('noChanges')} />}
          <Popconfirm title={label('confirm', { count: data.changedCount })} description={label('confirmNote')}
            onConfirm={apply} okText={label('apply')} cancelText={label('cancel')} disabled={!data.canApply || applying}
            okButtonProps={{ loading: applying }}>
            <Button type="primary" size="large" disabled={!data.canApply || applying} loading={applying}>
              {label('applyCount', { count: data.changedCount })}
            </Button>
          </Popconfirm>
        </>}
      </Space>
    </Card>
  );
}
