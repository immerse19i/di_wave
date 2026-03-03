const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middlewares/auth');
const hospitalController = require('../controllers/hospitalController');

// 모든 관리자 API에 인증 + 관리자 권한 체크
router.use(verifyToken, isAdmin);

// 목록
router.get('/', hospitalController.getHospitals);

// 상세
router.get('/:id', hospitalController.getHospitalDetail);

// 승인
router.patch('/:id/approve', hospitalController.approveHospital);

// 반려
router.patch('/:id/reject', hospitalController.rejectHospital);

module.exports = router;
