const express = require('express');
const router = express.Router();

// TODO: Implement task controllers

// GET /api/tasks - Lấy danh sách task
router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Get all tasks - TODO' });
});

// GET /api/tasks/:id - Chi tiết task
router.get('/:id', (req, res) => {
  res.json({ success: true, message: 'Get task by ID - TODO' });
});

// POST /api/tasks - Tạo task mới
router.post('/', (req, res) => {
  res.json({ success: true, message: 'Create task - TODO' });
});

// PUT /api/tasks/:id - Cập nhật task
router.put('/:id', (req, res) => {
  res.json({ success: true, message: 'Update task - TODO' });
});

// DELETE /api/tasks/:id - Xóa task
router.delete('/:id', (req, res) => {
  res.json({ success: true, message: 'Delete task - TODO' });
});

// PUT /api/tasks/:id/assign - Gán nhân sự cho task
router.put('/:id/assign', (req, res) => {
  res.json({ success: true, message: 'Assign resource to task - TODO' });
});

// PUT /api/tasks/:id/status - Thay đổi trạng thái task
router.put('/:id/status', (req, res) => {
  res.json({ success: true, message: 'Update task status - TODO' });
});

module.exports = router;
