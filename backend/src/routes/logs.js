const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/adminAuth');
const logController = require('../controllers/admin/logController');

router.get('/', verifyToken, isAdmin, logController.getLogs);
router.get('/:id', verifyToken, isAdmin, logController.getLogDetail);

module.exports = router;
