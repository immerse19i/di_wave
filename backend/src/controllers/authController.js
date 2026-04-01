const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const {pool} = require('../config/database');
const config = require('../config/config');

// 상수 정의 
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 10 * 60 * 1000;

// 메일 전송 설정
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

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
// 계정 활성화 체크
if(!user.is_active){
  if(user.role === 'hospital' && user.hospital_id) {
    const [hospitals] = await pool.query(
      'SELECT status FROM hospitals WHERE id = ?', 
      [user.hospital_id]
    );
    if(hospitals.length > 0) {
      const hStatus = hospitals[0].status;
      if(hStatus === 'pending') {
        return res.status(403).json({ 
          code: 'PENDING_APPROVAL',
          message: '아직 가입 승인 대기 중입니다. 승인 완료 후 이메일로 안내해 드립니다.'
        });
      }
      if(hStatus === 'rejected') {
        // 반려 시 비밀번호 검증 후 토큰 발급 (서류보완 페이지 접근용)
        const isMatchRejected = await bcrypt.compare(password, user.password);
        if (!isMatchRejected) {
          return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }
        const rejectedToken = jwt.sign(
          { id: user.id, hospital_id: user.hospital_id, role: user.role },
          config.jwt.secret,
          { expiresIn: config.jwt.expiresIn }
        );
        // 반려 사유 조회
        const [logRows] = await pool.query(
          `SELECT details FROM admin_logs
           WHERE hospital_id = ? AND category = '승인상태 변경' AND details LIKE '%반려%'
           ORDER BY created_at DESC LIMIT 1`,
          [user.hospital_id]
        );
        return res.status(403).json({
          code: 'REJECTED',
          message: '가입이 반려되었습니다. 사유 확인 후 재신청이 가능합니다.',
          token: rejectedToken,
          rejectInfo: logRows.length > 0 ? logRows[0].details : '',
        });
      }
      if(hStatus === 'suspended') {
        return res.status(403).json({ 
          code: 'SUSPENDED',
          message: '정지된 계정입니다. 관리자에게 문의해 주세요.'
        });
      }
      if(hStatus === 'withdrawn') {
        // 탈퇴 사실 미고지 — 일반 로그인 실패와 동일 메시지
        return res.status(401).json({ 
          message: '아이디 또는 비밀번호가 올바르지 않습니다.'
        });
      }
    }
  }
  return res.status(403).json({ message: '비활성화된 계정입니다.' });
}



    // 계정 잠금 체크
    if(user.locked_until && new Date(user.locked_until) > new Date()){
      const remainingTime = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        message: `로그인 시도가 5회 이상 실패하여\n보안을 위해 로그인이 제한되었습니다. ${remainingTime}분 후 다시 시도해 주세요.`,
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

  // 계정 잠금 시 시스템 로그
  await pool.query(
    `INSERT INTO admin_logs (hospital_id, target_type, target_id, category, details, operator, actor_type)
     VALUES (?, 'account', ?, '로그인 제한 상태', '-', '-', 'system')`,
    [user.hospital_id, user.hospital_id]
  );

  return res.status(423).json({
    message: '로그인 시도가 5회 이상 실패하여\n보안을 위해 로그인이 제한되었습니다. 10분 후 다시 시도해 주세요.',
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
       h.business_license_path, h.status as hospital_status,
       IFNULL(c.balance, 0) as credit_balance
FROM users u
LEFT JOIN hospitals h ON u.hospital_id = h.id
LEFT JOIN credits c ON u.hospital_id = c.hospital_id
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

// 유저 프로필 수정
exports.updateProfile = async (req, res) => {
  try {
    const { name, ceo_name, phone, email, address, address_detail, business_number } = req.body;

    // hospital_id 조회
    const [users] = await pool.query('SELECT hospital_id FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    const hospitalId = users[0].hospital_id;

    // hospitals 테이블 업데이트
    await pool.query(
      `UPDATE hospitals SET name = ?, ceo_name = ?, phone = ?, address = ?, address_detail = ?, business_number = ? WHERE id = ?`,
      [name, ceo_name, phone, address, address_detail, business_number, hospitalId]
    );

    // users 테이블 이메일 업데이트
    await pool.query(
      'UPDATE users SET email = ? WHERE id = ?',
      [email, req.user.id]
    );

    res.json({ success: true, message: '저장되었습니다.' });
  } catch (error) {
    console.error('UpdateProfile error:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
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


// POST /api/auth/check-id
exports.checkId = async (req, res) => {
  try {
    const { loginId } = req.body;
    const [rows] = await pool.query('SELECT id FROM users WHERE login_id = ?', [loginId]);
    
    if (rows.length > 0) {
      return res.json({ success: false, message: '이미 사용 중인 ID입니다.' });
    }
    res.json({ success: true, message: '사용 가능한 ID입니다.' });
  } catch (error) {
    console.error('ID 중복확인 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};


//인증번호 송

// POST /api/auth/send-code
exports.sendCode = async (req, res) => {
  try {
    const { email, type } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query('DELETE FROM email_verifications WHERE email = ? AND type = ?', [email, type]);
    await pool.query(
      'INSERT INTO email_verifications (email, code, type, expires_at) VALUES (?, ?, ?, ?)',
      [email, code, type, expires]
    );

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: '[OsteoAge] 이메일 인증번호',
      html: `
        <div style="max-width:600px; text-align:left; font-family:'Inter',Arial,sans-serif; color:#353535
        
        ;">
      <p style="font-size:14px; font-weight:bold;">[OsteoAge]</p>
      
      <p style="font-size:14px; line-height:1.4;">
        OsteoAge 서비스 가입을 위해 본인 확인이 필요합니다.<br/>
        아래의 인증번호를 회원가입 화면의 '인증번호' 칸에 입력해 주세요.
      </p>

      <div style="background-color:#353535; padding:12px 48px; display:inline-block; margin:20px 0;">
        <p style="font-family:'Inter',Arial,sans-serif; font-weight:500; font-size:36px; line-height:140%; letter-spacing:0; color:#fff; margin:0; text-align:center;">
          ${code}
        </p>
      </div>

      <p style="font-size:13px; line-height:1.8; color:#353535;">
        인증번호는 10분 동안 유효합니다. 만료되기 전에 입력해 주시기 바랍니다.<br/>
        누군가가 잘못된 정보를 입력했을 수 있습니다. 이 경우, 이 이메일을 무시하셔도 됩니다. 
        다른 사람이 귀하의 계정에 접근할 수 없으므로 안심하셔도 됩니다.
      </p>

      <p style="font-size:12px; color:#353535; margin-top:24px;">
        본 메일은 발송 전용으로 회신이 불가능합니다.<br/>
        Copyright © OsteoAge. All rights reserved.
      </p>

      

      <p style="font-size:12px; color:#353535; line-height:1.8;">
        문의사항이 있을 경우 아래 문의처를 이용해 주시기 바랍니다.<br/><br/>
        디웨이브주식회사<br/>
        02-2088-8728 [문의가능시간 : 10:00~17:00 (토 · 일 · 공휴일 휴무)]
      </p>

      <img src="http://osteoage.ai/assets/logo/di_wave_logo_color.png" alt="OsteoAge" style="height:40px; margin-top:16px;" />
    </div>
      `,
    });

    res.json({ success: true, message: '인증번호를 발송했습니다.' });
  } catch (error) {
    console.error('인증번호 발송 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// 인증 번호 확인

// POST /api/auth/verify-code
exports.verifyCode = async (req, res) => {
  try {
    const { email, code, type } = req.body;
    const [rows] = await pool.query(
      'SELECT id FROM email_verifications WHERE email = ? AND code = ? AND type = ? AND expires_at > NOW() AND verified = FALSE',
      [email, code, type]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: '인증번호가 올바르지 않거나 만료되었습니다.' });
    }

   await pool.query('UPDATE email_verifications SET verified = TRUE WHERE id = ?', [rows[0].id]);

if (type === 'find_id') {
  const [users] = await pool.query(
    'SELECT login_id FROM users WHERE email = ?',
    [email]
  );
  return res.json({ 
    success: true, 
    message: '인증되었습니다.',
    loginId: users.length > 0 ? users[0].login_id : null
  });
}
res.json({ success: true, message: '인증되었습니다.' });
  } catch (error) {
    console.error('인증 확인 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// 회원 가입
// POST /api/auth/register
exports.register = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { loginId, password, email, hospitalName, ceoName, phone, address, addressDetail, businessNumber } = req.body;

    // ID 중복 확인
    const [existing] = await conn.query('SELECT id FROM users WHERE login_id = ?', [loginId]);
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: '이미 사용 중인 ID입니다.' });
    }

    //이메일 중복 화긴
const [existingEmail] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
if (existingEmail.length > 0) {
  await conn.rollback();
  return res.status(400).json({ success: false, message: '이미 등록된 이메일입니다.' });
}

// 사업자번호 중복 확인
const [existingBiz] = await conn.query('SELECT id FROM hospitals WHERE business_number = ?', [businessNumber]);
if (existingBiz.length > 0) {
  await conn.rollback();
  return res.status(400).json({ success: false, message: '이미 등록된 사업자번호입니다.' });
}


    // 이메일 인증 확인
    const [verified] = await conn.query(
      'SELECT id FROM email_verifications WHERE email = ? AND type = "register" AND verified = TRUE',
      [email]
    );
    if (verified.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: '이메일 인증이 필요합니다.' });
    }

    // 병원 생성
    const businessLicensePath = req.file ? req.file.path : null;
    const [hospitalResult] = await conn.query(
      `INSERT INTO hospitals (name, ceo_name, phone, address, address_detail, business_number, business_license_path, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [hospitalName, ceoName, phone, address, addressDetail, businessNumber, businessLicensePath]
    );

    // 유저 생성
    const hashedPassword = await bcrypt.hash(password, 10);
    await conn.query(
      `INSERT INTO users (hospital_id, login_id, email, password, name, role, is_active) 
       VALUES (?, ?, ?, ?, ?, 'hospital', FALSE)`,
      [hospitalResult.insertId, loginId, email, hashedPassword, ceoName]
    );

    // 인증 데이터 정리
    await conn.query('DELETE FROM email_verifications WHERE email = ?', [email]);

    await conn.commit();
    res.status(201).json({ success: true, message: '회원가입이 완료되었습니다. 관리자 승인 후 이용 가능합니다.' });
  } catch (error) {
    await conn.rollback();
    console.error('회원가입 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  } finally {
    conn.release();
  }
};


// POST /api/auth/find-id 아이디 찾기
exports.findId = async (req, res) => {
  try {
    const { email, ceoName } = req.body;

    // users JOIN hospitals: email + ceo_name 매칭
    const [rows] = await pool.query(
      `SELECT u.id, u.login_id, u.email 
       FROM users u 
       JOIN hospitals h ON u.hospital_id = h.id 
       WHERE u.email = ? AND h.ceo_name = ?`,
      [email, ceoName]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: '일치하는 정보가 없습니다.' });
    }

    // 인증번호 생성 및 발송 (기존 sendCode 로직 재활용)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10분

    await pool.query('DELETE FROM email_verifications WHERE email = ? AND type = ?', [email, 'find_id']);
    await pool.query(
      'INSERT INTO email_verifications (email, code, type, expires_at) VALUES (?, ?, ?, ?)',
      [email, code, 'find_id', expires]
    );

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: '[DI-WAVE] ID 찾기 인증번호',
      html: `
        <div style="max-width:600px; text-align:left; font-family:'Inter',Arial,sans-serif; color:#353535;">
          <p style="font-size:14px; line-height:1.4;">
아이디 찾기를 위한 인증번호가 발급되었습니다.<br/>
아래 인증번호를 사용하여 아이디 확인을 진행해 주세요.
          </p>
          <div style="background-color:#55aba6; padding:12px 48px; display:inline-block; margin:20px 0;">
            <p style="font-family:'Inter',Arial,sans-serif; font-weight:500; font-size:36px; line-height:140%; color:#fff; margin:0; text-align:center;">
              ${code}
            </p>
          </div>
          <p style="font-size:12px; line-height:1.4; color:#353535; margin-bottom:32px;">
           인증번호는 10분 동안 유효합니다. 만료되기 전에 입력해 주시기 바랍니다.<br/>
           누군가가 잘못된 정보를 입력했을 수 있습니다. 이 경우, 이 이메일을 무시하셔도 됩니다. 다른 사람이 귀하의 계정에 접근할 수 없으므로 안심하셔도 됩니다.
          </p>
          <p style="font-size:12px; line-height:1.8; color:#353535; margin-bottom:8px">
          문의사항이 있을 경우 아래 문의처를 이용해 주시기 바랍니다.
          </p>
          <p style="font-size:12px; color:#353535; margin-top:24px;">
디웨이브주식회사<br/>
csadmin@diwave.io<br/>
02-2088-8728 [문의가능시간 : 10:00~17:00 (토 · 일 · 공휴일 휴무)]
          </p>
          <img src="http://osteoage.ai/assets/logo/di_wave_logo_color.png" alt="OsteoAge" style="width:101px; margin-top:16px;" />
        </div>
      `,
    });

    res.json({ success: true, message: '인증번호를 발송했습니다.' });
  } catch (error) {
    console.error('FindId error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// POST /api/auth/find-password 비밀번호 찾기
exports.findPassword = async (req, res) => {
  try {
    const { loginId, email } = req.body;

    // users 테이블에서 login_id + email 매칭
    const [rows] = await pool.query(
      'SELECT id, login_id, email FROM users WHERE login_id = ? AND email = ?',
      [loginId, email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: '일치하는 정보가 없습니다.' });
    }

    // 인증번호 생성 및 발송
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query('DELETE FROM email_verifications WHERE email = ? AND type = ?', [email, 'find_password']);
    await pool.query(
      'INSERT INTO email_verifications (email, code, type, expires_at) VALUES (?, ?, ?, ?)',
      [email, code, 'find_password', expires]
    );

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: '[OsteoAge] 비밀번호 재설정 인증번호 안내',
      html: `
        <div style="max-width:600px; text-align:left; font-family:'Inter',Arial,sans-serif; color:#353535;">
          <p style="font-size:14px; line-height:1.6;">
비밀번호 재설정을 위한 인증번호가 발급되었습니다.<br/>
아래 인증번호를 사용하여 비밀번호를 재설정해 주세요.
          </p>
          <div style="background-color:#55aba6; padding:12px 48px; display:inline-block; margin:20px 0;">
            <p style="font-family:'Inter',Arial,sans-serif; font-weight:500; font-size:36px; line-height:140%; color:#fff; margin:0; text-align:center;">
              ${code}
            </p>
          </div>
          <p style="font-size:12px; line-height:1.4; color:#353535; margin-bottom:32px">
           인증번호는 10분 동안 유효합니다. 만료되기 전에 입력해 주시기 바랍니다.<br/>
           누군가가 잘못된 정보를 입력했을 수 있습니다. 이 경우, 이 이메일을 무시하셔도 됩니다. 다른 사람이 귀하의 계정에 접근할 수 없으므로 안심하셔도 됩니다.
          </p>
          <p style="font-size:12px; color:#353535; margin-top:24px;">
            본 메일은 발신전용으로 회신이 불가능합니다.<br/>
            Copyright © OsteoAge. All rights reserved.
            <br/><br/>
            디웨이브주식회사<br/>
02-2088-8728 [문의가능시간 : 10:00~17:00 (토 · 일 · 공휴일 휴무)]
          </p>
          <img src="http://osteoage.ai/assets/logo/di_wave_logo_color.png" alt="DiwaveLogo" style="width:101px; margin-top:16px;" />
        </div>
      `,
    });

    res.json({ success: true, message: '인증번호를 발송했습니다.' });
  } catch (error) {
    console.error('FindPassword error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};


// POST /api/auth/reset-password 비밀번호 재설정
exports.resetPassword = async (req, res) => {
  try {
    const { loginId, email, newPassword } = req.body;

    // login_id + email 매칭 확인
    const [users] = await pool.query(
      'SELECT id FROM users WHERE login_id = ? AND email = ?',
      [loginId, email]
    );

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    // 인증 완료 여부 확인 (find_password 타입, verified = TRUE)
    const [verified] = await pool.query(
      'SELECT id FROM email_verifications WHERE email = ? AND type = "find_password" AND verified = TRUE',
      [email]
    );

    if (verified.length === 0) {
      return res.status(400).json({ success: false, message: '이메일 인증이 필요합니다.' });
    }

    // 비밀번호 해시화 후 저장
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, users[0].id]);

    // 인증 데이터 정리
    await pool.query('DELETE FROM email_verifications WHERE email = ? AND type = "find_password"', [email]);

    res.json({ success: true, message: '비밀번호가 변경되었습니다.' });
  } catch (error) {
    console.error('ResetPassword error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// POST /api/auth/verify-password 비밀번호 확인
exports.verifyPassword = async (req, res) => {
  try {
    const { currentPassword } = req.body;
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, users[0].password);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: '현재 비밀번호가 올바르지 않습니다.' });
    }

    res.json({ success: true, message: '비밀번호가 확인되었습니다.' });
  } catch (error) {
    console.error('VerifyPassword error:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// GET /api/auth/rejected-info - 반려 사유 + 기존 정보 조회
exports.getRejectedInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const hospitalId = req.user.hospital_id;

    const [rows] = await pool.query(
      `SELECT h.name, h.ceo_name, h.phone, h.address, h.address_detail,
              h.business_number, h.business_license_path, h.status,
              u.login_id, u.email
       FROM hospitals h
       LEFT JOIN users u ON u.hospital_id = h.id AND u.role = 'hospital'
       WHERE h.id = ? AND u.id = ?`,
      [hospitalId, userId]
    );

    if (rows.length === 0 || rows[0].status !== 'rejected') {
      return res.status(400).json({ success: false, message: '반려 상태가 아닙니다.' });
    }

    // 반려 사유 조회 (admin_logs)
    const [logRows] = await pool.query(
      `SELECT details FROM admin_logs
       WHERE hospital_id = ? AND category = '승인상태 변경' AND details LIKE '%반려%'
       ORDER BY created_at DESC LIMIT 1`,
      [hospitalId]
    );

    res.json({
      success: true,
      data: rows[0],
      rejectInfo: logRows.length > 0 ? logRows[0].details : '',
    });
  } catch (error) {
    console.error('GetRejectedInfo error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// PUT /api/auth/reapply - 서류보완 재신청
exports.reapply = async (req, res) => {
  try {
    const userId = req.user.id;
    const hospitalId = req.user.hospital_id;
    const { hospitalName, ceoName, phone, address, addressDetail, businessNumber } = req.body;

    // 반려 상태 확인
    const [check] = await pool.query('SELECT status FROM hospitals WHERE id = ?', [hospitalId]);
    if (check.length === 0 || check[0].status !== 'rejected') {
      return res.status(400).json({ success: false, message: '반려 상태가 아닙니다.' });
    }

    // 사업자등록증 경로
    let licensePath = undefined;
    if (req.file) {
      licensePath = `uploads/business/${req.file.filename}`;
    }

    // hospitals UPDATE
    const updateFields = [];
    const updateParams = [];
    if (hospitalName) { updateFields.push('name = ?'); updateParams.push(hospitalName); }
    if (ceoName) { updateFields.push('ceo_name = ?'); updateParams.push(ceoName); }
    if (phone) { updateFields.push('phone = ?'); updateParams.push(phone); }
    if (address) { updateFields.push('address = ?'); updateParams.push(address); }
    if (addressDetail !== undefined) { updateFields.push('address_detail = ?'); updateParams.push(addressDetail); }
    if (businessNumber) { updateFields.push('business_number = ?'); updateParams.push(businessNumber); }
    if (licensePath) { updateFields.push('business_license_path = ?'); updateParams.push(licensePath); }
    updateFields.push("status = 'pending'");
    updateParams.push(hospitalId);

    await pool.query(
      `UPDATE hospitals SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // users name 동기화
    if (hospitalName) {
      await pool.query('UPDATE users SET name = ? WHERE id = ?', [hospitalName, userId]);
    }

    res.json({ success: true, message: '재신청이 완료되었습니다.' });
  } catch (error) {
    console.error('Reapply error:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

