const bcrypt = require('bcryptjs');
const jwt =  require('jsonwebtoken');
const {pool} = require('../config/database');
const config = require('../config/config');

// 상수 정의 
const MAX_LOGIN_ATTEMPTS =5;
const LOCK_TIME = 30 * 60 * 1000;

//로긩
exports.login = async (req,res)=> {
  try{
    //id로 사용자 조회
const { loginId, password } = req.body;
const [users] = await pool.query(
  'SELECT * FROM users WHERE login_id = ?',
  [loginId]
);
    if (users.length === 0){
      return res.status(401).json({message: '아이디 또는 비밀번호가 올바르지 않습니다.'})
    }



    const user = users[0];

    // 계정 활성화 체크
    if(!user.is_active){
      return res.status(403).json({ message: '비활성화된 계정입니다.'});
    }

    // 계정 잠금 체크
    if(user.locked_until && new Date(user.locked_until) > new Date()){
      const remainingTime = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        message: `계정이 잠겼습니다. ${remainingTime}분 후 다시 시도하세요`,
        locked : true,
        remainingMinutes: remainingTime,
      });
    }


    //비밀번호 확인
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch) {
      // 실패 횟수 증가
      const attempts = (user.login_attempts ||0) + 1;

      if(attempts >= MAX_LOGIN_ATTEMPTS){
        // 5회 실패 >> 계정잠금
        await pool.query(
          'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?',
          [attempts, new Date(Date.now() + LOCK_TIME), user.id]
        );
        return res.status(423).json({
          message: '5회 로그인 실패로 계정이 30분간 잠겼습니다.',
          locked: true,
          remainingMinutes: 30
        });
      }else {
        // 실패 횟수만 증가
        await pool.query(
          'UPDATE users SET login_attempts = ? WHERE id = ?',
          [attempts, user.id]
        );
        return res.status(401).json({
          message: `아이디 또는 비밀번호가 올바르지 않습니다. (${attempts}/${MAX_LOGIN_ATTEMPTS}회 실패)`,
          attempts: attempts,
          maxAttempts: MAX_LOGIN_ATTEMPTS
        })
      }
    }

    //JWT 토큰 생성
    const token = jwt.sign(
      {id: user.id, hospital_id: user.hospital_id , role: user.role}, 
      config.jwt.secret, 
      {expiresIn: config.jwt.expiresIn}
    )

    // 로그인 성공 실패횟수 초기화
    await pool.query(
      'UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?',
      [user.id]
    )

    //마지막 로그인 시간
    // await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id])

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hospital_id: user.hospital_id
      }
    });


  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({message: '서버 오류 발생'});
  }
}

exports.logout = async (req, res) => {
  // JWT는 서버에서 무효화 할 수 없음 (클라이언트에서 토큰 삭제)
  res.json({message: '로그아웃 되었습니다.'});
}

// 내 정보 조회
exports.getMe = async (req,res) => {
  try{
    const  [users] = await pool.query(
      `SELECT u.id, u.login_id, u.email, u.name, u.role, u.hospital_id, u.last_login,
              h.name as hospital_name, h.ceo_name, h.phone, 
              h.address, h.address_detail, h.business_number, 
              h.business_license_path, h.status as hospital_status
       FROM users u
       LEFT JOIN hospitals h ON u.hospital_id = h.id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (users.length === 0){
      return res.status(404).json({message: '사용자를 찾을 수  없습니다.'});
    }
    res.json(users[0]);
  } catch (error) {
    console.error('GetMe error', error);
    res.status(500).json({message: '서버 오류가 발생했습니다.'});
  }
};


// 비밀번호 변경
exports.changePassword = async (req,res) => {
  try{
    const { currentPassword, newPassword} = req.body;
    // 현재 비밀번호 확인
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, users[0].password);

    if (!isMatch) {
      return res.status(400).json({message: '현재 비밀번호가 올바르지 않습니다.'});
    }
    
      // 새 비번 해시화 후 저장
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
    
      res.json({message : '비밀번호가 변경되었습니다.'});
  } catch (error) {
    console.error('ChangePassword error: ', error);
    res.status(500).json({message: '서버 오류가 발생했습니다.'});
  }
};

exports.unlockAccount = async (req,res) => {
  try {
    const { userId} = req.params;

    // 사용자 존재 확인
    const [users] = await pool.query('SELECT id, login_id FROM users WHERE id = ?', [userId]);

    if(users.length === 0) {
      return res.status(404).json({message: '사용자를 찾을 수 없습니다.'});
    }

    // 잠금해제
    await pool.query(
      'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?',
      [userId]
    );

    res.json({
      message: `${users[0].login_id} 계정의 잠금이 해제되었습니다.`
    });





  }catch (error){
    console.error('UnlockAccount error:', error);
    res.status(500).json({message: '서버오류가 발생했습니다.'});
  }
}