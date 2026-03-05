const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middlewares/auth');
const hospitalController = require('../controllers/hospitalController');

// 모든 관리자 API에 인증 + 관리자 권한 체크
router.use(verifyToken, isAdmin);

// 목록
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/business/'),
  filename: (req, file, cb) => {
    const original = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${Date.now()}_${original}`);
  }
});
const upload = multer({ storage });



router.get('/', hospitalController.getHospitals);




// 가입계정 목록
router.get('/accounts', hospitalController.getAccounts);

// 가입계정 상세 (accounts/:id 는 /:id 보다 위에!)
router.get('/accounts/:id', hospitalController.getAccountDetail);
router.put('/accounts/:id', hospitalController.updateAccountInfo);
router.get('/accounts/:id/logs', hospitalController.getAccountLogs);
router.get('/accounts/:id/credit-history', hospitalController.getCreditHistory);
router.patch('/accounts/:id/unlock', hospitalController.unlockAccount);
router.patch('/accounts/:id/status', hospitalController.changeAccountStatus);
router.patch('/accounts/:id/credit', hospitalController.adjustCredit);

// 상세
router.get('/:id', hospitalController.getHospitalDetail);



// 승인
router.patch('/:id/approve', hospitalController.approveHospital);

// 반려
router.patch('/:id/reject', hospitalController.rejectHospital);


// 사업자등록증 업로드
router.post('/accounts/:id/license', upload.single('file'), hospitalController.uploadBusinessLicense);


module.exports = router;
