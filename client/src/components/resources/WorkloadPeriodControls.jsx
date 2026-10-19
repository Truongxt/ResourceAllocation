import { DatePicker, Radio, Space, Typography, message } from 'antd';
import dayjs from 'dayjs';

export function weekRange(offset = 0) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(p => [p.type, p.value]));
  const today = dayjs(`${parts.year}-${parts.month}-${parts.day}`);
  const start = today.subtract((today.day() + 6) % 7, 'day').add(offset * 7, 'day');
  return { from: start.format('YYYY-MM-DD'), to: start.add(6, 'day').format('YYYY-MM-DD') };
}

export default function WorkloadPeriodControls({ value, onChange }) {
  const current = weekRange(), next = weekRange(1);
  const selected = value.from === current.from && value.to === current.to ? 'current' : value.from === next.from && value.to === next.to ? 'next' : 'custom';
  return <Space wrap style={{ marginBottom: 16 }}>
    <Typography.Text strong>Kỳ tính tải:</Typography.Text>
    <Radio.Group value={selected} onChange={e => { if (e.target.value !== 'custom') onChange(weekRange(e.target.value === 'next' ? 1 : 0)); }}>
      <Radio.Button value="current">Tuần này</Radio.Button><Radio.Button value="next">Tuần tới</Radio.Button>
    </Radio.Group>
    <DatePicker.RangePicker allowClear={false} value={[dayjs(value.from), dayjs(value.to)]} format="DD/MM/YYYY"
      onChange={dates => {
        if (dates?.length !== 2) return;
        if (dates[1].diff(dates[0], 'day') >= 366) { message.warning('Vui lòng chọn khoảng không quá 366 ngày'); return; }
        onChange({ from: dates[0].format('YYYY-MM-DD'), to: dates[1].format('YYYY-MM-DD') });
      }} />
    <Typography.Text type="secondary">Giờ Việt Nam · tối đa 366 ngày</Typography.Text>
  </Space>;
}
