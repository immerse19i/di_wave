-- DI-WAVE 뼈나이 예측 서비스 DB 스키마
-- MariaDB / MySQL

CREATE DATABASE IF NOT EXISTS di_wave DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE di_wave;

-- 병원 (hospitals)
CREATE TABLE hospitals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    ceo_name VARCHAR(50),
    business_number VARCHAR(20) UNIQUE,
    phone VARCHAR(20),
    address VARCHAR(255),
    address_detail VARCHAR(255),
    business_license_path VARCHAR(255),
    status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 사용자 (users)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hospital_id INT,
    login_id VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(50),
    role ENUM('admin', 'hospital') DEFAULT 'hospital',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL
);

-- 환자 (patients)
CREATE TABLE patients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hospital_id INT NOT NULL,
    patient_code VARCHAR(50),
    name VARCHAR(50),
    birth_date DATE,
    gender ENUM('M', 'F'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- 분석 기록 (analyses)
CREATE TABLE analyses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hospital_id INT NOT NULL,
    patient_id INT NOT NULL,
    user_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    bone_age_years INT,
    bone_age_months INT,
    chronological_age_years INT,
    chronological_age_months INT,
    height DECIMAL(5,1),
    weight DECIMAL(5,1),
    physician VARCHAR(50),
    result_json TEXT,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 크레딧 (credits)
CREATE TABLE credits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hospital_id INT NOT NULL UNIQUE,
    balance INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- 크레딧 거래 내역 (credit_transactions)
CREATE TABLE credit_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hospital_id INT NOT NULL,
    type ENUM('charge', 'use', 'refund') NOT NULL,
    amount INT NOT NULL,
    balance_after INT NOT NULL,
    description VARCHAR(255),
    analysis_id INT,
    payment_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- 결제 (payments)
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hospital_id INT NOT NULL,
    amount INT NOT NULL,
    credit_amount INT NOT NULL,
    pg_provider VARCHAR(50),
    pg_transaction_id VARCHAR(100),
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- 공지사항 (notices)
CREATE TABLE notices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    status ENUM('published', 'draft', 'private', 'deleted') DEFAULT 'draft',
    is_pinned BOOLEAN DEFAULT FALSE,
    has_attachment BOOLEAN DEFAULT FALSE,
    author_id INT,
    author_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME DEFAULT NULL,
    deleted_at DATETIME DEFAULT NULL
);

-- 공지사항 첨부파일 (notice_attachments)
CREATE TABLE notice_attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    notice_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INT DEFAULT 0,
    file_type VARCHAR(50),
    sort_order INT DEFAULT 0,
    FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE
);

-- 고객문의 (inquiries)
CREATE TABLE inquiries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hospital_id INT,
    user_id INT,
    title VARCHAR(200),
    content TEXT,
    status ENUM('pending', 'answered', 'closed') DEFAULT 'pending',
    answer TEXT,
    answered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL
);

-- 안내팝업 (popups)
CREATE TABLE popups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    status ENUM('published', 'draft', 'deleted') DEFAULT 'draft',
    display_start DATE DEFAULT NULL,
    display_end DATE DEFAULT NULL,
    is_always BOOLEAN DEFAULT FALSE,
    popup_width INT DEFAULT 500,
    popup_height INT DEFAULT 400,
    author_id INT,
    author_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at DATETIME DEFAULT NULL,
    deleted_at DATETIME DEFAULT NULL
);

-- 관리자 로그 (admin_logs)
CREATE TABLE admin_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hospital_id INT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id INT NULL,
    category VARCHAR(100) NOT NULL,
    details TEXT,
    operator VARCHAR(50) DEFAULT '-',
    actor_type ENUM('admin', 'user', 'system') DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 사용 기록 로그 (usage_logs)
CREATE TABLE usage_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    hospital_id INT,
    action VARCHAR(50),
    description VARCHAR(255),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX idx_users_hospital ON users(hospital_id);
CREATE INDEX idx_patients_hospital ON patients(hospital_id);
CREATE INDEX idx_analyses_hospital ON analyses(hospital_id);
CREATE INDEX idx_analyses_patient ON analyses(patient_id);
CREATE INDEX idx_analyses_status ON analyses(status);
CREATE INDEX idx_credit_transactions_hospital ON credit_transactions(hospital_id);
CREATE INDEX idx_usage_logs_hospital ON usage_logs(hospital_id);
CREATE INDEX idx_usage_logs_created ON usage_logs(created_at);
CREATE INDEX idx_notice_attachments_notice ON notice_attachments(notice_id);
CREATE INDEX idx_notices_status ON notices(status);
CREATE INDEX idx_popups_status ON popups(status);
CREATE INDEX idx_admin_logs_hospital ON admin_logs(hospital_id);
CREATE INDEX idx_admin_logs_target ON admin_logs(target_type, target_id);

-- 기본 관리자 계정 (비밀번호: admin123 -> bcrypt 해시)
INSERT INTO users (email, password, name, role) VALUES
('admin@diwave.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '관리자', 'admin');


-- 이용약관 (terms)
CREATE TABLE terms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type VARCHAR(50) NOT NULL,
    group_type ENUM('signup', 'credit') NOT NULL,
    name VARCHAR(200) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    version INT DEFAULT 1,
    is_current BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_terms_type ON terms(type);
CREATE INDEX idx_terms_current ON terms(is_current);

-- 초기 데이터 (약관 6종, 파일 미등록 상태)
INSERT INTO terms (type, group_type, name, file_name, file_path, version, is_current, is_public) VALUES
('terms_of_service', 'signup', '서비스 이용약관', '', '', 0, TRUE, TRUE),
('privacy_collection', 'signup', '서비스 이용을 위한 개인정보 수집 및 이용동의', '', '', 0, TRUE, TRUE),
('privacy_consignment', 'signup', '개인정보 처리 위탁 동의', '', '', 0, TRUE, TRUE),
('paid_service', 'credit', '유료서비스 이용약관', '', '', 0, TRUE, TRUE),
('third_party', 'credit', '개인정보 제3자 제공동의', '', '', 0, TRUE, TRUE),
('refund_policy', 'credit', '결제 상품 확인 및 취소/환불 규정', '', '', 0, TRUE, TRUE);
