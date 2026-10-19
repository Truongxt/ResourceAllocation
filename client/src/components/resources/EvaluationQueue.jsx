import { useEffect, useState } from 'react';
import { Alert, Button, Card, Empty, Table, Tag } from 'antd';
import resourceService from '../../services/resourceService';

export default function EvaluationQueue({ revision, onReview, onCount }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    resourceService.getPendingEvaluations({ page }).then(response => {
      if (!active) return;
      const data = response.data.data;
      if (page > 1 && !data.resources.length) { setPage(1); return; }
      setRows(data.resources); setTotal(data.total); onCount(data.total);
    }).catch(err => { if (active) setError(err.response?.data?.message || 'Không tải được hàng chờ duyệt'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, revision, refresh, onCount]);
  return <Card title="Bản tự đánh giá chờ quản lý duyệt" extra={<Button onClick={() => setRefresh(value => value + 1)}>Làm mới</Button>}>
    <p>Đối chiếu mức tự chấm và minh chứng, sau đó phê duyệt hoặc yêu cầu nhân viên bổ sung.</p>
    {error ? <Alert type="error" showIcon message={error} /> : <Table rowKey="_id" loading={loading} dataSource={rows}
      locale={{ emptyText: <Empty description="Không có bản đánh giá chờ duyệt trong phạm vi quản lý" /> }}
      pagination={{ current: page, pageSize: 50, total, onChange: setPage, showSizeChanger: false }} scroll={{ x: 650 }} columns={[
        { title: 'Nhân viên', render: (_, row) => <><strong>{row.user?.name || row.position}</strong><div>{row.department}</div></> },
        { title: 'Kỹ năng chờ duyệt', render: (_, row) => row.skills.filter(skill => skill.evaluationStatus === 'self_assessed').map(skill => <Tag color="orange" key={skill.name}>{skill.name} · Mức {skill.selfLevel}</Tag>) },
        { title: 'Hành động', render: (_, row) => <Button type="primary" onClick={() => onReview(row)}>Đánh giá & duyệt</Button> },
      ]} />}
  </Card>;
}
