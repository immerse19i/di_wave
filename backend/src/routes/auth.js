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

// 비밀번호 검증
router.post('/verify-password', verifyToken, authController.verifyPassword);
// 비밀번호 변경
router.put('/password', verifyToken, authController.changePassword);

// 프로필 수정
router.put('/profile', verifyToken, authController.updateProfile);

// 관리자 전용: 계정 잠금 해제
router.patch('/unlock/:userId', verifyToken, isAdmin, authController.unlockAccount);

router.post('/find-id', authController.findId);
router.post('/find-password', authController.findPassword);
router.post('/reset-password', authController.resetPassword);
// 회원가입로직
router.post('/check-id', authController.checkId);
router.post('/check-email', authController.checkEmail);

router.post('/send-code', authController.sendCode);
router.post('/verify-code', authController.verifyCode);
router.post('/register', uploadBusiness.single('businessLicense'), authController.register);

// 반려 후 서류보완 재신청
router.get('/rejected-info', verifyToken, authController.getRejectedInfo);
router.put('/reapply', verifyToken, uploadBusiness.single('businessLicense'), authController.reapply);

module.exports = router;
