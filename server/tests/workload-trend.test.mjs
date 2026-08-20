/**
 * Kiểm thử đơn vị cho chuỗi thời gian khối lượng công việc.
 *
 * Không cần server lẫn database: nạp thẳng module tính toán và chạy trên lịch dựng sẵn,
 * nên khẳng định được đúng phép tính chứ không phải cả đường đi HTTP.
 *
 * Mốc thời gian dùng tháng 3/2026: mùng 2 là thứ Hai, mùng 6 là thứ Sáu, 7-8 là cuối
 * tuần, mùng 9 lại là thứ Hai. Nhờ vậy một tuần làm việc trọn vẹn nằm gọn trong 2→6.
 * Ngày tạo bằng `new Date(năm, tháng, ngày)` (giờ địa phương) chứ không dùng chuỗi ISO,
 * vì module tính theo ngày địa phương và chuỗi ISO sẽ lệch múi giờ.
 */

import { createRequire } from 'module';
import { ok, section as S, summary } from './helpers.mjs';

const require = createRequire(import.meta.url);
const {
  buildWorkloadTrend,
  spreadTaskHours,
  dailyCapacity,
  startOfWeek,
} = require('../src/analytics/workloadTrend');

const day = (d) => new Date(2026, 2, d);

const task = (id, from, to, hours, assignee = 'u1') => ({
  _id: id,
  title: `Task ${id}`,
  estimatedHours: hours,
  startDate: day(from),
  endDate: day(to),
  assignee,
});

const resource = (id, userId, overrides = {}) => ({
  _id: id,
  userId,
  userName: `Người ${id}`,
  position: 'Developer',
  maxCapacity: 40,
  fte: 1,
  unavailablePeriods: [],
  ...overrides,
});

const sum = (values) => Math.round(values.reduce((s, v) => s + v, 0) * 100) / 100;

// ══════════════════════════════════════════════
S('Trải giờ công lên các ngày');
{
  const full = spreadTaskHours(task('a', 2, 6, 40));
  ok(full.length === 5, 'Thứ Hai→thứ Sáu là 5 ngày làm việc');
  ok(full.every((d) => d.hours === 8), '40 giờ chia đều thành 8 giờ/ngày');

  const overWeekend = spreadTaskHours(task('b', 2, 9, 40));
  ok(overWeekend.length === 6, 'Khoảng 2→9 có 8 ngày lịch nhưng chỉ 6 ngày làm việc');
  ok(!overWeekend.some((d) => d.day.getDay() === 0 || d.day.getDay() === 6),
    'Không rơi giờ nào vào thứ Bảy/Chủ nhật');
  ok(sum(overWeekend.map((d) => d.hours)) === 40, 'Tổng vẫn đúng 40 giờ');

  // Nếu chỉ chia cho ngày làm việc thì công việc nằm trọn cuối tuần sẽ chia cho 0 và
  // toàn bộ số giờ biến mất khỏi biểu đồ.
  const weekendOnly = spreadTaskHours(task('c', 7, 8, 10));
  ok(weekendOnly.length === 2 && sum(weekendOnly.map((d) => d.hours)) === 10,
    'Công việc nằm trọn cuối tuần vẫn giữ đủ giờ');

  const oneDay = spreadTaskHours(task('d', 3, 3, 6));
  ok(oneDay.length === 1 && oneDay[0].hours === 6, 'Công việc một ngày dồn hết vào ngày đó');

  const noHours = spreadTaskHours(task('e', 2, 6, 0));
  ok(noHours.every((d) => d.hours === 0), 'Công việc 0 giờ không sinh tải');
}

// ══════════════════════════════════════════════
S('Capacity theo ngày');
{
  const r = resource('r1', 'u1');
  ok(dailyCapacity(r, day(3)) === 8, '40 giờ/tuần → 8 giờ mỗi ngày làm việc');
  ok(dailyCapacity(r, day(7)) === 0, 'Thứ Bảy không có capacity');
  ok(dailyCapacity(r, day(8)) === 0, 'Chủ nhật không có capacity');

  const half = resource('r2', 'u2', { fte: 0.5 });
  ok(dailyCapacity(half, day(3)) === 4, 'fte 0.5 chỉ còn nửa capacity');

  const onLeave = resource('r3', 'u3', {
    unavailablePeriods: [{ startDate: day(4), endDate: day(5), reason: 'Nghỉ phép' }],
  });
  ok(dailyCapacity(onLeave, day(3)) === 8, 'Ngoài lịch nghỉ vẫn đủ capacity');
  ok(dailyCapacity(onLeave, day(4)) === 0 && dailyCapacity(onLeave, day(5)) === 0,
    'Trong lịch nghỉ capacity bằng 0');
  ok(dailyCapacity(onLeave, day(6)) === 8, 'Hết lịch nghỉ thì capacity trở lại');

  // availability là trạng thái hiện tại, không gắn với ngày nào, nên không được phép
  // bóp méo cả trục thời gian.
  const flagged = resource('r4', 'u4', { availability: 'on_leave' });
  ok(dailyCapacity(flagged, day(3)) === 8, 'Cờ availability không ảnh hưởng chuỗi thời gian');

  ok(startOfWeek(day(8)).getDate() === 2, 'Chủ nhật thuộc về tuần bắt đầu thứ Hai trước đó');
  ok(startOfWeek(day(9)).getDate() === 9, 'Thứ Hai là đầu tuần của chính nó');
}

// ══════════════════════════════════════════════
S('Chuỗi theo ngày');
{
  const resources = [resource('r1', 'u1'), resource('r2', 'u2')];
  const trend = buildWorkloadTrend([task('t1', 2, 6, 40)], resources, { granularity: 'day' });

  ok(trend.granularity === 'day' && trend.buckets.length === 5, '5 mốc cho tuần 2→6');
  // Mốc chỉ mang ngày bắt đầu; nhãn hiển thị do client dựng theo ngôn ngữ đang chọn.
  ok(trend.buckets[0].key === '2026-03-02' && +trend.buckets[0].start === +day(2),
    'Mốc mang ngày bắt đầu, không mang nhãn dựng sẵn');
  ok(trend.totals.every((t) => t.load === 8), 'Mỗi ngày 8 giờ tải');

  // Người không được giao việc nào vẫn phải góp capacity, nếu không đường capacity tổng
  // bị hụt và cả đội trông như đang quá tải.
  ok(trend.totals.every((t) => t.capacity === 16), 'Cả 2 nhân sự đều góp capacity');
  ok(trend.totals.every((t) => t.utilization === 50), 'Tỉ lệ sử dụng 8/16 = 50%');
  ok(trend.totals.every((t) => t.overloaded === 0), 'Không ai quá tải');

  ok(trend.resources.length === 2, 'Có dòng cho cả nhân sự rảnh');
  const idle = trend.resources.find((r) => r._id === 'r2');
  ok(idle.load.every((v) => v === 0) && idle.capacity.every((v) => v === 8),
    'Nhân sự rảnh: tải 0 nhưng capacity vẫn 8');

  ok(trend.from.getDate() === 2 && trend.to.getDate() === 6,
    'Bỏ trống from/to thì tự lấy trọn khoảng của các công việc');
}

// ══════════════════════════════════════════════
S('Quá tải và lịch nghỉ');
{
  const resources = [resource('r1', 'u1')];
  const heavy = buildWorkloadTrend([task('t1', 2, 6, 60)], resources, { granularity: 'day' });
  ok(heavy.totals.every((t) => t.overloaded === 1), '12 giờ/ngày trên capacity 8 → quá tải');
  ok(heavy.resources[0].peakUtilization === 150, 'Đỉnh sử dụng 150%');
  ok(heavy.resources[0].worksWhileUnavailable === false, 'Quá tải khác với làm trong ngày nghỉ');

  // Giao việc rơi trọn vào lịch nghỉ: capacity bằng 0 nên không có tỉ lệ phần trăm nào
  // đúng cả — phải báo bằng cờ riêng thay vì chia cho 0.
  const leave = [resource('r1', 'u1', {
    unavailablePeriods: [{ startDate: day(2), endDate: day(6) }],
  })];
  const clash = buildWorkloadTrend([task('t1', 2, 6, 40)], leave, { granularity: 'day' });
  ok(clash.totals.every((t) => t.capacity === 0), 'Nghỉ cả tuần → capacity 0');
  ok(clash.totals.every((t) => t.utilization === null),
    'Không có capacity thì không có tỉ lệ, trả null chứ không phải 0%');
  ok(clash.totals.every((t) => t.overloaded === 1), 'Có tải mà không có capacity vẫn là quá tải');
  ok(clash.resources[0].worksWhileUnavailable === true, 'Báo lại: được giao việc trong ngày nghỉ');
  ok(clash.resources[0].peakUtilization === 0, 'Đỉnh sử dụng không bịa số khi mọi capacity đều 0');
}

// ══════════════════════════════════════════════
S('Giờ công không đặt được lên trục thời gian');
{
  const resources = [resource('r1', 'u1')];
  const trend = buildWorkloadTrend(
    [
      task('ok', 2, 6, 40),
      { _id: 'no-date', estimatedHours: 12, assignee: 'u1' },
      { _id: 'bad-range', estimatedHours: 5, assignee: 'u1', startDate: day(6), endDate: day(2) },
      task('no-owner', 2, 6, 7, null),
      task('ghost-owner', 2, 6, 3, 'u-khong-ton-tai'),
    ],
    resources,
    { granularity: 'day' }
  );

  ok(trend.excluded.unscheduledTasks === 2 && trend.excluded.unscheduledHours === 17,
    'Thiếu ngày hoặc ngày ngược → báo lại, không im lặng bỏ qua', '(12 + 5 giờ)');
  ok(trend.excluded.unassignedTasks === 2 && trend.excluded.unassignedHours === 10,
    'Chưa có người làm, hoặc người làm đã bị xóa → cũng phải báo', '(7 + 3 giờ)');
  ok(sum(trend.totals.map((t) => t.load)) === 40, 'Chỉ 40 giờ đặt được lên biểu đồ');
}

// ══════════════════════════════════════════════
S('Gộp theo tuần');
{
  const resources = [resource('r1', 'u1')];
  const trend = buildWorkloadTrend([task('t1', 2, 13, 80)], resources, { granularity: 'week' });

  ok(trend.buckets.length === 2, 'Hai tuần làm việc → 2 mốc');
  ok(+trend.buckets[0].start === +day(2) && +trend.buckets[1].start === +day(9),
    'Mốc tuần bắt đầu từ thứ Hai');
  ok(trend.totals.every((t) => t.capacity === 40), 'Capacity một tuần là 40 giờ');
  ok(sum(trend.totals.map((t) => t.load)) === 80, 'Tổng tải giữ nguyên khi gộp tuần');
  ok(trend.totals.every((t) => t.utilization === 100), 'Đúng bằng capacity → 100%');

  // Khoảng quá dài mà vẽ theo ngày thì biểu đồ thành mảng nhiễu.
  const long = buildWorkloadTrend(
    [{ _id: 'x', estimatedHours: 400, assignee: 'u1', startDate: new Date(2026, 0, 1), endDate: new Date(2026, 11, 31) }],
    resources,
    { granularity: 'day' }
  );
  ok(long.granularity === 'week', 'Khoảng dài quá thì tự hạ từ ngày xuống tuần');
  ok(long.buckets.length <= 180 && long.buckets.length > 40, 'Số mốc về mức vẽ được',
    `(${long.buckets.length} mốc)`);

  const clipped = buildWorkloadTrend(
    [{ _id: 'x', estimatedHours: 100, assignee: 'u1', startDate: new Date(2020, 0, 1), endDate: new Date(2030, 0, 1) }],
    resources,
    { granularity: 'week', maxBuckets: 10 }
  );
  ok(clipped.truncated === true && clipped.buckets.length === 10,
    'Vượt trần thì cắt bớt và báo bằng cờ truncated');
}

// ══════════════════════════════════════════════
S('Trường hợp biên');
{
  const empty = buildWorkloadTrend([], [], {});
  ok(empty.buckets.length === 0 && empty.totals.length === 0, 'Không có gì → chuỗi rỗng');
  ok(empty.from === null && empty.to === null, 'Không bịa ra khoảng thời gian');

  const noResource = buildWorkloadTrend([task('t1', 2, 6, 40)], [], {});
  ok(noResource.buckets.length === 0 && noResource.excluded.unassignedTasks === 1,
    'Có việc nhưng không có nhân sự nào → không dựng được chuỗi');

  const resources = [resource('r1', 'u1')];
  const windowed = buildWorkloadTrend([task('t1', 2, 13, 80)], resources, {
    granularity: 'day',
    from: day(9),
    to: day(13),
  });
  ok(windowed.buckets.length === 5 && windowed.from.getDate() === 9,
    'Chỉ định from/to thì cắt đúng cửa sổ đó');
  ok(sum(windowed.totals.map((t) => t.load)) === 40,
    'Chỉ tính phần giờ rơi vào cửa sổ, không kéo cả công việc vào');

  const reversed = buildWorkloadTrend([task('t1', 2, 6, 40)], resources, {
    from: day(13),
    to: day(9),
  });
  ok(reversed.buckets.length === 0, 'from sau to → chuỗi rỗng chứ không nổ');

  const sorted = buildWorkloadTrend(
    [task('light', 2, 6, 8, 'u1'), task('heavy', 2, 6, 60, 'u2')],
    [resource('r1', 'u1'), resource('r2', 'u2')],
    { granularity: 'week' }
  );
  ok(sorted.resources[0]._id === 'r2', 'Người căng nhất xếp lên đầu');
}

process.exit(summary() ? 1 : 0);
