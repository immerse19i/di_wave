const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken , isAdmin } = require('../middlewares/auth');
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/business/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const uploadBusiness = multer({ storage });


// 로그인
router.post('/login', authController.login);

// 로그아웃
router.post('/logout', verifyToken, authController.logout);

// 내 정보 조회
router.get('/me', verifyToken, authController.getMe);

// 비밀번호 변경

router.put('/password', verifyToken, authController.changePassword);

// 관리자 전용: 계정 잠금 해제
router.patch('/unlock/:userId', verifyToken, isAdmin, authController.unlockAccount);


// 회원가입로직
router.post('/check-id', authController.checkId);
router.post('/send-code', authController.sendCode);
router.post('/verify-code', authController.verifyCode);
router.post('/register', uploadBusiness.single('businessLicense'), authController.register);


module.exports = router;
