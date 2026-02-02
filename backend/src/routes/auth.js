const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/auth');

// 로그인
router.post('/login', authController.login);

// 로그아웃
router.post('/logout', verifyToken, authController.logout);

// 내 정보 조회
router.get('/me', verifyToken, authController.getMe);

// 비밀번호 변경

router.put('/password', verifyToken, authController.changePassword);

module.exports = router;
