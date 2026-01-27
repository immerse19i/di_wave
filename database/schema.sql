-- DI-WAVE 뼈나이 예측 서비스 DB 스키마
-- MariaDB / MySQL

CREATE DATABASE IF NOT EXISTS di_wave DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE di_wave;

-- 병원 (hospitals)
CREATE TABLE hospitals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    business_number VARCHAR(20) UNIQUE,
    phone VARCHAR(20),
    address VARCHAR(255),
    status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 사용자 (users)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hospital_id INT,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(50),
    role ENUM('admin', 'hospital') DEFAULT 'hospital',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
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
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- 팝업 (popups)
CREATE TABLE popups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200),
    content TEXT,
    image_path VARCHAR(255),
    link_url VARCHAR(255),
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
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

-- 기본 관리자 계정 (비밀번호: admin123 -> bcrypt 해시)
INSERT INTO users (email, password, name, role) VALUES
('admin@diwave.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '관리자', 'admin');
