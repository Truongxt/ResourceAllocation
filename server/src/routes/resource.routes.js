const express = require('express');
const router = express.Router();

// TODO: Implement resource controllers

// GET /api/resources - Lấy danh sách nhân sự
router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Get all resources - TODO' });
});

// GET /api/resources/:id - Chi tiết nhân sự
router.get('/:id', (req, res) => {
  res.json({ success: true, message: 'Get resource by ID - TODO' });
});

// POST /api/resources - Thêm nhân sự
router.post('/', (req, res) => {
  res.json({ success: true, message: 'Create resource - TODO' });
});

// PUT /api/resources/:id - Cập nhật nhân sự
router.put('/:id', (req, res) => {
  res.json({ success: true, message: 'Update resource - TODO' });
});

// DELETE /api/resources/:id - Xóa nhân sự
router.delete('/:id', (req, res) => {
  res.json({ success: true, message: 'Delete resource - TODO' });
});

// GET /api/resources/:id/skills - Lấy skill matrix
router.get('/:id/skills', (req, res) => {
  res.json({ success: true, message: 'Get resource skills - TODO' });
});

// PUT /api/resources/:id/skills - Cập nhật skills
router.put('/:id/skills', (req, res) => {
  res.json({ success: true, message: 'Update resource skills - TODO' });
});

// GET /api/resources/:id/workload - Lấy workload
router.get('/:id/workload', (req, res) => {
  res.json({ success: true, message: 'Get resource workload - TODO' });
});

module.exports = router;
