/**
 * Chuỗi thời gian khối lượng công việc, suy ra từ lịch của các công việc.
 *
 * Hệ thống KHÔNG lưu ảnh chụp workload theo ngày, nên biểu đồ này không phải nhật ký
 * quá khứ. Nó trải số giờ ước tính của từng công việc lên khoảng ngày làm việc của công
 * việc đó rồi cộng lại theo từng người. Đọc nó là đọc "khối lượng đã cam kết rơi vào
 * lúc nào" — dùng để thấy trước tuần nào ai sẽ quá tải — chứ không phải "tháng trước ai
 * đã thực sự làm bao nhiêu giờ". Muốn có số liệu lịch sử thật thì phải chụp và lưu định
 * kỳ, đó là việc khác.
 *
 * Vì là suy ra chứ không phải ghi nhận, mọi giờ công không đặt được lên trục thời gian
 * đều được báo lại trong `excluded` thay vì lặng lẽ biến mất khỏi biểu đồ.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// maxCapacity trong Resource là số giờ mỗi TUẦN, nên quy về ngày phải chia cho số ngày
// làm việc trong tuần chứ không phải 7.
const WORKING_DAYS_PER_WEEK = 5;

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

// Không dùng toISOString() vì nó đổi sang UTC và có thể lùi ngày ở múi giờ dương.
const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;

const addDays = (date, days) => new Date(date.getTime() + days * MS_PER_DAY);

/** Thứ Hai của tuần chứa `date`. Tuần bắt đầu từ thứ Hai theo thói quen Việt Nam. */
const startOfWeek = (date) => {
  const day = date.getDay();
  return startOfDay(addDays(date, day === 0 ? -6 : 1 - day));
};

const eachDay = (from, to) => {
  const days = [];
  for (let cursor = startOfDay(from); cursor <= to; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
  return days;
};

const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

/**
 * Trải giờ ước tính của một công việc lên từng ngày nó chiếm.
 *
 * Chia đều cho các ngày LÀM VIỆC trong khoảng, vì capacity cũng tính theo ngày làm việc.
 * Công việc nằm trọn trong cuối tuần thì không có ngày làm việc nào — khi đó chia đều
 * cho ngày thường để số giờ không bốc hơi khỏi biểu đồ.
 */
const spreadTaskHours = (task) => {
  const start = startOfDay(task.startDate);
  const end = startOfDay(task.endDate);
  const hours = Number(task.estimatedHours) || 0;

  const span = eachDay(start, end);
  const workingDays = span.filter((day) => !isWeekend(day));
  const target = workingDays.length ? workingDays : span;

  const perDay = hours / target.length;
  return target.map((day) => ({ day, hours: perDay }));
};

/** Capacity một ngày của một nhân sự: 0 vào cuối tuần và trong lịch nghỉ đã đăng ký. */
const dailyCapacity = (resource, day) => {
  if (isWeekend(day)) return 0;

  const onLeave = (resource.unavailablePeriods || []).some((period) => {
    const from = period.startDate ? startOfDay(period.startDate) : null;
    const to = period.endDate ? startOfDay(period.endDate) : null;
    if (!isValidDate(from) || !isValidDate(to)) return false;
    return day >= from && day <= to;
  });
  if (onLeave) return 0;

  // Cố tình KHÔNG dùng resource.availability: đó là trạng thái hiện tại, không gắn với
  // ngày nào, nên áp nó lên cả trục thời gian sẽ bóp méo cả quá khứ lẫn tương lai.
  const weekly = Number(resource.maxCapacity) || 40;
  const fte = Number(resource.fte) || 1;
  return (weekly * fte) / WORKING_DAYS_PER_WEEK;
};

const bucketLabel = (start, granularity) => {
  const d = String(start.getDate()).padStart(2, '0');
  const m = String(start.getMonth() + 1).padStart(2, '0');
  return granularity === 'week' ? `Tuần ${d}/${m}` : `${d}/${m}`;
};

/**
 * @param {Object[]} tasks     công việc, cần startDate/endDate/estimatedHours/assignee
 * @param {Object[]} resources nhân sự đã làm phẳng, cần _id/userId/maxCapacity/fte
 * @param {Object}   options   { from, to, granularity: 'day'|'week', maxBuckets }
 */
function buildWorkloadTrend(tasks = [], resources = [], options = {}) {
  const { from, to, maxBuckets = 180 } = options;
  let granularity = options.granularity === 'week' ? 'week' : 'day';

  const excluded = {
    unscheduledTasks: 0,
    unscheduledHours: 0,
    unassignedTasks: 0,
    unassignedHours: 0,
  };

  // Một người có thể ứng với nhiều bản ghi Resource; khóa theo userId vì Task.assignee
  // trỏ tới User chứ không trỏ tới Resource.
  const byUser = new Map();
  resources.forEach((resource) => {
    if (resource.userId) byUser.set(String(resource.userId), resource);
  });

  const scheduled = [];
  tasks.forEach((task) => {
    const hours = Number(task.estimatedHours) || 0;
    const start = task.startDate ? startOfDay(task.startDate) : null;
    const end = task.endDate ? startOfDay(task.endDate) : null;

    if (!isValidDate(start) || !isValidDate(end) || end < start) {
      excluded.unscheduledTasks++;
      excluded.unscheduledHours += hours;
      return;
    }
    if (!task.assignee || !byUser.has(String(task.assignee))) {
      excluded.unassignedTasks++;
      excluded.unassignedHours += hours;
      return;
    }
    scheduled.push({ ...task, startDate: start, endDate: end });
  });

  const empty = {
    granularity,
    from: null,
    to: null,
    truncated: false,
    buckets: [],
    totals: [],
    resources: [],
    excluded,
  };

  if (!scheduled.length) return empty;

  let rangeStart = from ? startOfDay(from) : null;
  let rangeEnd = to ? startOfDay(to) : null;
  if (!isValidDate(rangeStart)) {
    rangeStart = scheduled.reduce((min, t) => (t.startDate < min ? t.startDate : min), scheduled[0].startDate);
  }
  if (!isValidDate(rangeEnd)) {
    rangeEnd = scheduled.reduce((max, t) => (t.endDate > max ? t.endDate : max), scheduled[0].endDate);
  }
  if (rangeEnd < rangeStart) return { ...empty, from: rangeStart, to: rangeEnd };

  // Khoảng quá dài mà vẽ theo ngày thì biểu đồ thành một mảng nhiễu, tự hạ xuống tuần.
  const dayCount = Math.round((rangeEnd - rangeStart) / MS_PER_DAY) + 1;
  if (granularity === 'day' && dayCount > maxBuckets) granularity = 'week';

  const days = eachDay(rangeStart, rangeEnd);
  const bucketOf = (day) => (granularity === 'week' ? dayKey(startOfWeek(day)) : dayKey(day));

  const bucketIndex = new Map();
  const buckets = [];
  days.forEach((day) => {
    const key = bucketOf(day);
    if (bucketIndex.has(key)) {
      buckets[bucketIndex.get(key)].end = day;
      return;
    }
    bucketIndex.set(key, buckets.length);
    buckets.push({ key, start: granularity === 'week' ? startOfWeek(day) : day, end: day });
  });

  let truncated = false;
  if (buckets.length > maxBuckets) {
    buckets.length = maxBuckets;
    truncated = true;
    [...bucketIndex.keys()].forEach((key) => {
      if (bucketIndex.get(key) >= maxBuckets) bucketIndex.delete(key);
    });
  }

  const series = new Map();
  const seriesOf = (resource) => {
    const key = String(resource._id);
    if (!series.has(key)) {
      series.set(key, {
        _id: key,
        name: resource.userName || resource.position || 'Không rõ',
        position: resource.position || '',
        load: new Array(buckets.length).fill(0),
        capacity: new Array(buckets.length).fill(0),
      });
    }
    return series.get(key);
  };

  // Capacity tính cho MỌI nhân sự, kể cả người chưa được giao việc gì — thiếu họ thì
  // đường capacity tổng bị hụt và biểu đồ trông như cả đội đang quá tải.
  resources.forEach((resource) => {
    const row = seriesOf(resource);
    days.forEach((day) => {
      const index = bucketIndex.get(bucketOf(day));
      if (index === undefined) return;
      row.capacity[index] += dailyCapacity(resource, day);
    });
  });

  scheduled.forEach((task) => {
    const resource = byUser.get(String(task.assignee));
    const row = seriesOf(resource);
    spreadTaskHours(task).forEach(({ day, hours }) => {
      const index = bucketIndex.get(bucketOf(day));
      if (index === undefined) return;
      row.load[index] += hours;
    });
  });

  const round = (value) => Math.round(value * 100) / 100;

  const rows = [...series.values()].map((row) => {
    // Tỉ lệ chỉ tính trên những khoảng CÓ capacity. Khoảng capacity bằng 0 mà vẫn có việc
    // là chuyện khác hẳn — chia cho 0 không ra "vô cùng phần trăm" mà là một câu hỏi:
    // ai đó đang được giao việc rơi trọn vào lịch nghỉ. Báo riêng bằng cờ.
    const rated = row.capacity
      .map((capacity, index) => (capacity > 0 ? (row.load[index] / capacity) * 100 : null))
      .filter((value) => value !== null);

    return {
      ...row,
      load: row.load.map(round),
      capacity: row.capacity.map(round),
      peakUtilization: rated.length ? Math.round(Math.max(...rated)) : 0,
      worksWhileUnavailable: row.capacity.some((capacity, index) => capacity <= 0 && row.load[index] > 0),
    };
  });

  const totals = buckets.map((_, index) => {
    const load = rows.reduce((sum, row) => sum + row.load[index], 0);
    const capacity = rows.reduce((sum, row) => sum + row.capacity[index], 0);
    const overloaded = rows.filter((row) =>
      row.capacity[index] > 0 ? row.load[index] > row.capacity[index] : row.load[index] > 0
    ).length;

    return {
      load: round(load),
      capacity: round(capacity),
      utilization: capacity > 0 ? Math.round((load / capacity) * 100) : null,
      overloaded,
    };
  });

  return {
    granularity,
    from: rangeStart,
    to: buckets.length ? buckets[buckets.length - 1].end : rangeEnd,
    truncated,
    buckets: buckets.map((bucket) => ({
      key: bucket.key,
      start: bucket.start,
      end: bucket.end,
      label: bucketLabel(bucket.start, granularity),
    })),
    totals,
    resources: rows.sort(
      (a, b) =>
        Number(b.worksWhileUnavailable) - Number(a.worksWhileUnavailable) ||
        b.peakUtilization - a.peakUtilization
    ),
    excluded: {
      ...excluded,
      unscheduledHours: round(excluded.unscheduledHours),
      unassignedHours: round(excluded.unassignedHours),
    },
  };
}

module.exports = {
  buildWorkloadTrend,
  // Xuất riêng để kiểm thử đơn vị từng mảnh, và để chỗ khác dùng lại nếu cần.
  spreadTaskHours,
  dailyCapacity,
  startOfWeek,
  WORKING_DAYS_PER_WEEK,
};
