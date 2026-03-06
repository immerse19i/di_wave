const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middlewares/auth');
const permissionController = require('../controllers/admin/permissionController');

router.get('/', verifyToken, isAdmin, permissionController.getAdmins);
router.patch('/:id/toggle', verifyToken, isAdmin, permissionController.toggleAdmin);

module.exports = router;
