import { Alert, Card, Drawer, Table, Tag, Typography } from 'antd';

const statusLabels = { todo: 'Cần làm', in_progress: 'Đang thực hiện', review: 'Chờ đánh giá' };
const dateLabel = value => value && !Number.isNaN(new Date(value).getTime())
  ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : 'Chưa có ngày';

export default function WorkloadBreakdown({ selection, period, onClose }) {
  return <Drawer open={Boolean(selection)} onClose={onClose} title={`Chi tiết giờ · ${selection?.name || ''}`} width={820}>
    <Typography.Paragraph>{dateLabel(period?.from)} → {dateLabel(period?.to)} · Giờ Việt Nam · tính cả hai ngày đầu và cuối</Typography.Paragraph>
    <Alert type="info" showIcon style={{ marginBottom: 16 }} title="Giờ ước tính là tổng giờ của cả công việc"
      description="Ví dụ nhập 8h nghĩa là cả công việc dự kiến cần 8 giờ. Hệ thống chia đều số giờ đó theo ngày làm việc từ ngày bắt đầu đến ngày kết thúc, rồi lấy phần thuộc kỳ đang xem. Đây là tải kế hoạch của việc đang mở, chưa phải giờ thực tế đã làm." />
    <Typography.Paragraph type="secondary">Chỉ tính việc Cần làm, Đang thực hiện và Chờ đánh giá. Tiến độ 100% nhưng còn chờ đánh giá vẫn được tính; khi chuyển sang Đã hoàn thành, việc được loại khỏi tải. Giờ thực tế và phần trăm tiến độ chưa được dùng để trừ giờ kế hoạch.</Typography.Paragraph>
    {(selection?.people || []).map(person => <Card key={person._id} title={person.name} size="small" style={{ marginBottom: 16 }}>
      <Typography.Paragraph strong>Tải việc đang mở: {person.workload}h · Khả năng làm việc: {person.capacity}h trong kỳ</Typography.Paragraph>
      <Typography.Paragraph type="secondary">Khả năng làm việc: {person.baseWeeklyCapacity}h/tuần × FTE {person.fte} ÷ 5 × {person.availableDays} ngày = {person.capacity}h. Số ngày này chỉ gồm thứ Hai–thứ Sáu sau khi trừ lịch nghỉ; lịch nghỉ không tự dời giờ công việc.</Typography.Paragraph>
      {person.noCapacity && <Alert type="warning" title="Không có công suất trong kỳ; không thể tính tỷ lệ %." />}
      {person.unscheduledWorkload > 0 && <Alert type="warning" title={`${person.unscheduledWorkload}h chưa có lịch hợp lệ, chưa cộng vào tải trong kỳ.`} />}
      <Table rowKey="taskId" size="small" pagination={false} dataSource={person.breakdown || []} locale={{ emptyText: 'Không có việc đang mở được phân bổ giờ vào kỳ này.' }} scroll={{ x: 680 }} columns={[
        { title: 'Công việc & lịch phân bổ', dataIndex: 'title', render: (value, row) => <>
          <Typography.Text strong>{value}</Typography.Text>
          <div><Tag color={row.status === 'review' ? 'orange' : 'blue'}>{statusLabels[row.status] || row.status}</Tag></div>
          <Typography.Text type="secondary">{dateLabel(row.startDate)} → {dateLabel(row.endDate)}</Typography.Text>
        </> },
        { title: 'Tổng giờ ước tính', dataIndex: 'estimatedHours', render: value => `${value}h` },
        { title: 'Phép tính giờ trong kỳ', render: (_, row) => row.scheduled ? <>
          <Typography.Text strong>{`${row.estimatedHours}h ÷ ${row.workingDays} ngày × ${row.periodDays} ngày ≈ ${row.periodHours}h`}</Typography.Text>
          <div><Typography.Text type="secondary">{row.periodDays} / {row.workingDays}</Typography.Text></div>
          <Typography.Text type="secondary">{row.distributionBasis === 'calendar_days' ? 'Ngày lịch trong kỳ / tổng ngày (việc chỉ diễn ra cuối tuần)' : 'Ngày làm việc trong kỳ / tổng ngày làm việc'}</Typography.Text>
        </> : 'Chưa xếp lịch — chưa tính giờ vào kỳ' },
        { title: 'Giờ trong kỳ', dataIndex: 'periodHours', render: (value, row) => row.scheduled ? `${value}h` : '—' },
      ]} />
    </Card>)}
    <Typography.Text type="secondary">Các dòng làm tròn đến 2 chữ số thập phân; tổng tính trước khi làm tròn.</Typography.Text>
  </Drawer>;
}
