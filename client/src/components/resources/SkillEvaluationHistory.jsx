import { Collapse, Empty, Table, Typography } from 'antd';

const labels = { submitted: 'Gửi tự đánh giá', approved: 'Phê duyệt', returned: 'Yêu cầu bổ sung' };
const level = value => value == null ? 'Chưa duyệt' : `Mức ${value}`;

export default function SkillEvaluationHistory({ history = [] }) {
  return <Collapse style={{ marginTop: 16 }} items={[{
    key: 'history', label: `Lịch sử đánh giá (${history.length})`,
    children: history.length ? [...history].reverse().map((event, index) => <section key={event._id || index} style={{ marginBottom: 20 }}>
      <Typography.Paragraph strong>{labels[event.action]} · {event.actorName || 'Quản lý'} · {new Date(event.at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</Typography.Paragraph>
      <Table size="small" pagination={false} rowKey="name" dataSource={event.changes} scroll={{ x: 560 }} columns={[
        { title: 'Kỹ năng', dataIndex: 'name' },
        { title: 'Tự chấm', dataIndex: 'selfLevel', render: value => value == null ? '—' : `Mức ${value}` },
        { title: 'Mức chính thức trước → sau', render: (_, row) => `${level(row.previousLevel)} → ${level(row.approvedLevel)}` },
        { title: 'Minh chứng', dataIndex: 'evidence', render: value => value || '—' },
        { title: 'Phản hồi', dataIndex: 'feedback', render: value => value || '—' },
      ]} />
    </section>) : <Empty description="Chưa có lịch sử đánh giá" />,
  }]} />;
}
