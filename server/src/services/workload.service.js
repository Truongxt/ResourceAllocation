const Resource = require('../models/Resource');
const Task = require('../models/Task');

/**
 * Đồng bộ khối lượng công việc (currentWorkload) và trạng thái sẵn sàng (availability)
 * cho danh sách nhân sự dựa trên các task thực tế đang được giao.
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
      }).select('estimatedHours');

      const totalHours = activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
      resource.currentWorkload = Math.round(totalHours * 10) / 10;

      // Tính toán lại độ sẵn sàng (availability)
      const capacity = (resource.maxCapacity || 40) * (resource.fte || 1);
      if (capacity <= 0 || totalHours > capacity) {
        resource.availability = 'unavailable';
      } else if (totalHours / capacity >= 0.7) {
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
