const jwt = require('jsonwebtoken');
const config = require('../config/config');
const {pool} = require('../config/database');


// JWT 토큰 검증 + 동시접속 체크
exports.verifyToken = async (req, res, next) => {
  try {
    // 헤더 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({message: '인증 토큰이 필요합니다.'});
    }

    const token = authHeader.split(' ')[1];
    // 토큰 검증
    const decoded = jwt.verify(token, config.jwt.secret);

    // 동시접속 체크 (sessionId가 있는 토큰만)
    if (decoded.sessionId) {
      const [rows] = await pool.query(
        'SELECT current_session_id FROM users WHERE id = ?',
        [decoded.id]
      );

      if (!rows.length || rows[0].current_session_id !== decoded.sessionId) {
        return res.status(401).json({
          code: 'SESSION_EXPIRED',
          message: '다른 기기에서 로그인하여 로그아웃 처리되었습니다.'
        });
      }
    }

    // req.user 에 사용자 정보 저장
    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({message: '토큰이 만료되었습니다.'});
    }
    return res.status(401).json({message: '유효하지 않은 토큰입니다.'});
  }
};

//관리자 권한 확인 미들웨어

exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({message: '관리자 권한이 필요합니다.'});
  }
  next();
}
