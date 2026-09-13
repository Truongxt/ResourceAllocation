const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getCompanySettings,
  updateCompanySettings,
} = require('../controllers/companySetting.controller');

const router = express.Router();

router.use(protect);

router.get('/', getCompanySettings);
router.put('/', updateCompanySettings);

module.exports = router;
