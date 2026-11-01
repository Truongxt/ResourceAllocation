const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getGroupsByProject,
  createGroup,
  updateGroup,
  deleteGroup,
  reorderGroups,
  toggleGroupOpen,
} = require('../controllers/taskGroup.controller');

router.use(protect);

router.get('/:projectId', getGroupsByProject);
router.post('/', createGroup);
router.put('/reorder', reorderGroups);
router.put('/:id', updateGroup);
router.patch('/:id/toggle-open', toggleGroupOpen);
router.delete('/:id', deleteGroup);

module.exports = router;
