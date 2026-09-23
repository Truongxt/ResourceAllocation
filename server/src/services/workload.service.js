const Resource = require('../models/Resource');
const Task = require('../models/Task');
const { weeklyLoadOf } = require('../analytics/workloadTrend');

/**
 * Đồng bộ khối lượng công việc (currentWorkload) và trạng thái sẵn sàng (availability)
 * cho danh sách nhân sự dựa trên các task thực tế đang được giao.
 *
 * **`maxCapacity` là số giờ mỗi TUẦN**, nên thứ đem ra so với nó cũng phải là giờ mỗi
 * tuần. Trước đây hàm này cộng `estimatedHours` của *mọi* task chưa xong — một lượng
 * tích lũy không có mốc thời gian — rồi so thẳng với năng lực tuần. Hệ quả: ai có
 * 3 task × 20h trải suốt 3 tháng cũng ra 150% và bị đánh dấu quá tải, dù thực tế chỉ
 * làm ~5h/tuần. Lỗi này ẩn được lâu vì dữ liệu mẫu chỉ có 3 task, mỗi người vừa khít
 * dưới 40h.
 *
 * Nay dùng lại chính phép tính của biểu đồ xu hướng (`analytics/workloadTrend.js`):
 * trải giờ của task lên các ngày làm việc rồi chỉ lấy phần rơi vào **tuần hiện tại** —
 * đúng nghĩa chữ "current" trong tên field.
 *
 * Giờ công của task **chưa xếp lịch** (thiếu ngày, hoặc ngày đảo ngược) không trải lên
 * trục thời gian được nên không vào `currentWorkload`; nó được đếm riêng vào
 * `unscheduledWorkload` thay vì biến mất — cùng quy ước với `excluded.unscheduledHours`
 * của biểu đồ xu hướng. `availability` vì vậy phản ánh **lịch đã xếp của tuần này**,
 * còn khối việc chưa xếp là một cảnh báo tách bạch.
 *
 * @param {Array<string|ObjectId>|string|ObjectId|null} userIds - Danh sách User ID cần tính lại, hoặc null để tính toàn bộ.
 * @returns {Promise<number>} Số lượng nhân sự đã được đồng bộ.
 */
const syncResourceWorkload = async (userIds = null) => {
  try {
    const resourceFilter = { isActive: true };

    if (userIds) {
      const normalizedIds = Array.isArray(userIds) ? userIds.filter(Boolean) : [userIds];
      if (normalizedIds.length === 0) return 0;
      resourceFilter.user = { $in: normalizedIds };
    }

    const resources = await Resource.find(resourceFilter);
    if (!resources.length) return 0;

    for (const resource of resources) {
      if (!resource.user) continue;

      // Lấy tất cả task đang hoạt động (chưa hoàn thành) của nhân sự
      const activeTasks = await Task.find({
        assignee: resource.user,
        status: { $in: ['todo', 'in_progress', 'review'] },
      }).select('estimatedHours startDate endDate');

      const { peakWeekHours, unscheduledHours } = weeklyLoadOf(activeTasks);

      resource.currentWorkload = Math.round(peakWeekHours * 10) / 10;
      resource.unscheduledWorkload = Math.round(unscheduledHours * 10) / 10;

      // Tính toán lại độ sẵn sàng (availability) theo tuần nặng nhất
      const capacity = (resource.maxCapacity || 40) * (resource.fte || 1);
      if (capacity <= 0 || peakWeekHours > capacity) {
        resource.availability = 'unavailable';
      } else if (peakWeekHours / capacity >= 0.7) {
        resource.availability = 'partially_available';
      } else {
        resource.availability = 'available';
      }

      await resource.save();
    }

    return resources.length;
  } catch (error) {
    console.error('Lỗi khi đồng bộ workload nhân sự:', error.message);
    return 0;
  }
};

module.exports = {
  syncResourceWorkload,
};
