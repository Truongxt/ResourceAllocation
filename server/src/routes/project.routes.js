const express = require('express');
const router = express.Router();

// TODO: Implement project controllers

// GET /api/projects - Lấy danh sách dự án
router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Get all projects - TODO' });
});

// GET /api/projects/:id - Lấy chi tiết dự án
router.get('/:id', (req, res) => {
  res.json({ success: true, message: 'Get project by ID - TODO' });
});

// POST /api/projects - Tạo dự án mới
router.post('/', (req, res) => {
  res.json({ success: true, message: 'Create project - TODO' });
});

// PUT /api/projects/:id - Cập nhật dự án
router.put('/:id', (req, res) => {
  res.json({ success: true, message: 'Update project - TODO' });
});

// DELETE /api/projects/:id - Xóa dự án
router.delete('/:id', (req, res) => {
  res.json({ success: true, message: 'Delete project - TODO' });
});

// POST /api/projects/:id/members - Thêm thành viên
router.post('/:id/members', (req, res) => {
  res.json({ success: true, message: 'Add member to project - TODO' });
});

module.exports = router;
