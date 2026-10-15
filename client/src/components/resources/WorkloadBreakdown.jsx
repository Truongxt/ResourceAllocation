import { Alert, Card, Drawer, Table, Typography } from 'antd';

export default function WorkloadBreakdown({ selection, period, onClose }) {
  return <Drawer open={Boolean(selection)} onClose={onClose} title={`Chi tiết giờ · ${selection?.name || ''}`} width={820}>
    <Typography.Paragraph>{period?.from} → {period?.to} · Giờ Việt Nam</Typography.Paragraph>
    <Alert type="info" showIcon style={{ marginBottom: 16 }} message="Cách tính"
      description="Giờ công việc trong kỳ = giờ ước tính × số ngày làm việc giao với kỳ / tổng ngày làm việc của công việc. Tính các việc cần làm, đang thực hiện và chờ đánh giá. Công suất = định mức tuần × FTE / 5 × số ngày thứ Hai–thứ Sáu còn làm việc sau khi trừ lịch nghỉ. Công việc chỉ diễn ra cuối tuần được chia theo ngày lịch. Đây là giờ kế hoạch, chưa phải giờ chấm công." />
    {(selection?.people || []).map(person => <Card key={person._id} title={person.name} size="small" style={{ marginBottom: 16 }}>
      <Typography.Paragraph strong>{person.workload}h / {person.capacity}h trong kỳ</Typography.Paragraph>
      <Typography.Paragraph type="secondary">Công suất: {person.baseWeeklyCapacity}h × FTE {person.fte} / 5 × {person.availableDays} ngày = {person.capacity}h.</Typography.Paragraph>
      {person.noCapacity && <Alert type="warning" message="Không có công suất trong kỳ; không thể tính tỷ lệ %." />}
      {person.unscheduledWorkload > 0 && <Alert type="warning" message={`${person.unscheduledWorkload}h chưa có lịch hợp lệ, chưa cộng vào tải trong kỳ.`} />}
      <Table rowKey="taskId" size="small" pagination={false} dataSource={person.breakdown || []} scroll={{ x: 570 }} columns={[
        { title: 'Công việc', dataIndex: 'title' },
        { title: 'Ước tính', dataIndex: 'estimatedHours', render: value => `${value}h` },
        { title: 'Ngày trong kỳ / tổng ngày', render: (_, row) => row.scheduled ? `${row.periodDays} / ${row.workingDays}` : 'Chưa xếp lịch' },
        { title: 'Giờ trong kỳ', dataIndex: 'periodHours', render: (value, row) => row.scheduled ? `${value}h` : '—' },
      ]} />
    </Card>)}
    <Typography.Text type="secondary">Các dòng làm tròn đến 2 chữ số thập phân; tổng tính trước khi làm tròn.</Typography.Text>
  </Drawer>;
}
