<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">가입계정목록</h2>
      <div class="breadcrumb">가입계정목록 &gt; 목록</div>
    </div>

    <div class="detail-content" v-if="account">
      <!-- 뒤로가기 -->
      <button class="btn-back" @click="handleBack">&lt;&nbsp; 뒤로가기</button>

      <h1 class="hospital-name">{{ account.name }}</h1>
      <p class="join-date">{{ formatShortDate(account.created_at) }} 가입</p>

      <!-- 기본 정보 -->
      <div class="section-title">기본 정보</div>
      <div class="info-form">
        <div class="form-row">
          <div class="form-field">
            <span class="field-label">병원명</span>
            <input v-model="form.name" />
          </div>
          <div class="form-field">
            <span class="field-label">대표자명</span>
            <input v-model="form.ceo_name" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <span class="field-label">ID</span>
            <input :value="account.login_id" disabled class="disabled" />
          </div>
          <div class="form-field">
            <span class="field-label">연락처</span>
            <input v-model="form.phone" @input="onlyNumber($event, 'phone')" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <span class="field-label">병원주소</span>
            <div class="address-wrap">
              <input
                :value="form.address"
                readonly
                class="address-input"
                @click="openAddress"
              />
              <button class="btn-address" @click="openAddress">검색</button>
            </div>
          </div>
          <div class="form-field">
            <span class="field-label">이메일주소</span>
            <input v-model="form.email" />
          </div>
        </div>
        <div class="form-row full">
          <div class="form-field">
            <span class="field-label">상세주소</span>
            <input v-model="form.address_detail" />
          </div>
        </div>
        <div class="form-row full">
          <div class="form-field">
            <span class="field-label">사업자번호</span>
            <input
              v-model="form.business_number"
              @input="onlyNumber($event, 'business_number')"
            />
          </div>
        </div>
      </div>

      <!-- 저장 버튼 -->
      <div class="save-area">
        <span class="save-msg" v-if="showSaveMsg">저장되었습니다.</span>
        <button class="btn-save" @click="handleSave">저장</button>
      </div>

      <!-- 계정정보 및 관리 -->
      <div class="section-title">계정정보 및 관리</div>
      <div class="management-area">
        <!-- 사업자등록증 -->
        <div class="mgmt-row">
          <span class="mgmt-label">사업자등록증</span>
          <div class="mgmt-value">
            <a
              v-if="account.business_license_path"
              class="file-link"
              :href="fileUrl"
              target="_blank"
            >
              {{ licenseName }}
            </a>
            <span v-else>-</span>
            <button
              class="btn-outline"
              @click="previewLicense"
              v-if="account.business_license_path"
            >
              미리보기
            </button>
            <button class="btn-outline" @click="$refs.licenseInput.click()">
              변경
            </button>
            <input
              type="file"
              ref="licenseInput"
              accept=".pdf"
              hidden
              @change="handleLicenseUpload"
            />
          </div>
        </div>

        <!-- 계정상태 -->
        <div class="mgmt-row">
          <span class="mgmt-label">계정상태</span>
          <div class="mgmt-value">
            <span>{{ accountStatusLabel }}</span>
            <button class="btn-outline" @click="openStatusChange">
              계정상태변경
            </button>
            <button
              :class="['btn-outline', { active: isLocked }]"
              :disabled="!isLocked"
              @click="handleUnlock"
            >
              로그인 제한 해제
            </button>
          </div>
        </div>

        <!-- 크레딧 -->
        <div class="mgmt-row">
          <span class="mgmt-label">크레딧</span>
          <div class="mgmt-value">
            <span>{{ account.credit_balance }}</span>
            <button class="btn-outline" @click="goToCreditHistory">
              크레딧 조회
            </button>
            <button class="btn-primary" @click="openCreditManage">관리</button>
          </div>
        </div>

        <!-- 계정기록 -->
        <div class="mgmt-row">
          <span class="mgmt-label">계정기록</span>
          <div class="mgmt-value">
            <button class="btn-primary" @click="goToAccountLog">
              기록보기
            </button>
          </div>
        </div>
      </div>
      <!-- 계정상태변경 팝업 -->
      <div
        class="popup-overlay"
        v-if="showStatusPopup"
        @click.self="closeStatusPopup"
      >
        <div class="popup-box">
          <h3 class="popup-title">계정상태변경</h3>
          <p class="popup-hospital">{{ account.name }}</p>

          <div class="status-radios">
            <label :class="{ selected: statusForm.status === 'active' }">
              <input type="radio" v-model="statusForm.status" value="active" />
              정상
            </label>
            <label :class="{ selected: statusForm.status === 'suspended' }">
              <input
                type="radio"
                v-model="statusForm.status"
                value="suspended"
              />
              정지
            </label>
            <label :class="{ selected: statusForm.status === 'withdrawn' }">
              <input
                type="radio"
                v-model="statusForm.status"
                value="withdrawn"
              />
              탈퇴
            </label>
          </div>

          <p class="reason-label">사유를 작성해 주세요</p>
          <textarea
            v-model="statusForm.reason"
            class="reason-textarea"
            placeholder=""
          ></textarea>

          <div class="popup-buttons">
            <button class="btn-cancel" @click="closeStatusPopup">취소</button>
            <button class="btn-confirm" @click="handleStatusChange">
              확인
            </button>
          </div>
        </div>
      </div>
      <!-- 기록보기 팝업 -->
      <div
        class="popup-overlay"
        v-if="showLogPopup"
        @click.self="closeLogPopup"
      >
        <div class="log-popup-box">
          <h3 class="log-popup-title">
            <strong>{{ account.name }}({{ account.login_id }})</strong> 계정
            기록 내역
          </h3>
          <table class="log-table">
            <colgroup>
              <col style="width: 20%" />
              <col style="width: 22%" />
              <col style="width: 44%" />
              <col style="width: 14%" />
            </colgroup>
            <thead>
              <tr>
                <th>일시</th>
                <th>구분</th>
                <th>상세내역</th>
                <th>작업자</th>
              </tr>
            </thead>
          </table>
          <div class="log-body" ref="logBodyRef">
            <table class="log-table">
              <colgroup>
                <col style="width: 20%" />
                <col style="width: 22%" />
                <col style="width: 44%" />
                <col style="width: 14%" />
              </colgroup>
              <tbody>
                <tr v-for="log in currentPageLogs" :key="log.id">
                  <td>{{ formatLogDate(log.created_at) }}</td>
                  <td>{{ log.category }}</td>
                  <td
                    class="detail-cell"
                    v-html="formatDetails(log.details)"
                  ></td>
                  <td>{{ log.operator }}</td>
                </tr>
                <tr v-if="currentPageLogs.length === 0">
                  <td colspan="4" class="empty-message">기록이 없습니다.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pagination" v-if="logTotalPages > 1">
            <button
              class="page-btn"
              :disabled="logPage <= 1"
              @click="logPage = 1"
            >
              &laquo;
            </button>
            <button
              class="page-btn"
              :disabled="logPage <= 1"
              @click="logPage--"
            >
              &lt;
            </button>
            <button
              v-for="p in logVisiblePages"
              :key="p"
              :class="['page-btn', { active: p === logPage }]"
              @click="logPage = p"
            >
              {{ p }}
            </button>
            <button
              class="page-btn"
              :disabled="logPage >= logTotalPages"
              @click="logPage++"
            >
              &gt;
            </button>
            <button
              class="page-btn"
              :disabled="logPage >= logTotalPages"
              @click="logPage = logTotalPages"
            >
              &raquo;
            </button>
          </div>

          <button class="btn-log-confirm" @click="closeLogPopup">확인</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from 'vue';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import { adminAPI } from '@/api/admin';
import { UseMessageStore } from '@/store/message';

const props = defineProps({ id: [String, Number] });
const router = useRouter();
const message = UseMessageStore();

// 상태변경 팝업
const showStatusPopup = ref(false);
const statusForm = ref({ status: 'active', reason: '' });

const account = ref(null);
const form = ref({
  name: '',
  ceo_name: '',
  phone: '',
  email: '',
  address: '',
  address_detail: '',
  business_number: '',
});
const originalForm = ref({});
const showSaveMsg = ref(false);

// 변경 감지
const hasChanges = computed(
  () => JSON.stringify(form.value) !== JSON.stringify(originalForm.value),
);

// 계정 상태 라벨
const accountStatusLabel = computed(() => {
  if (!account.value) return '';
  const s = account.value.status;
  if (s === 'approved') return '정상';
  if (s === 'suspended') return '정지';
  if (s === 'withdrawn') return '탈퇴';
  return '정상';
});

// 잠금 상태
const isLocked = computed(() => {
  if (!account.value?.locked_until) return false;
  return new Date(account.value.locked_until) > new Date();
});

// 사업자등록증 파일명
const licenseName = computed(() => {
  if (!account.value?.business_license_path) return '';
  return account.value.business_license_path.split('/').pop();
});

const fileUrl = computed(() => {
  if (!account.value?.business_license_path) return '';
  return `${import.meta.env.VITE_API_URL || ''}${account.value.business_license_path}`;
});

// 데이터 로드
const fetchDetail = async () => {
  try {
    const res = await adminAPI.getAccountDetail(props.id);
    account.value = res.data.data;
    const d = res.data.data;
    form.value = {
      name: d.name || '',
      ceo_name: d.ceo_name || '',
      phone: d.phone || '',
      email: d.email || '',
      address: d.address || '',
      address_detail: d.address_detail || '',
      business_number: d.business_number || '',
    };
    originalForm.value = { ...form.value };
  } catch (e) {
    console.error('상세 조회 실패:', e);
  }
};

// 숫자만 입력
const onlyNumber = (e, field) => {
  form.value[field] = e.target.value.replace(/[^0-9]/g, '');
};

// 주소 검색
const openAddress = () => {
  new daum.Postcode({
    oncomplete: (data) => {
      form.value.address = data.roadAddress;
    },
  }).open();
};

// 기본 정보 저장
const handleSave = async () => {
  try {
    await adminAPI.updateAccountInfo(props.id, form.value);
    originalForm.value = { ...form.value };
    showSaveMsg.value = true;
    setTimeout(() => {
      showSaveMsg.value = false;
    }, 3000);
  } catch (e) {
    message.showAlert('저장에 실패했습니다.');
  }
};

// 뒤로가기 (변경 감지)
const handleBack = () => {
  if (hasChanges.value) {
    message.showConfirm(
      '저장하지 않은 변경사항이 있습니다.\n이동하시겠습니까?',
      () => {
        router.push('/admin/accounts');
      },
    );
  } else {
    router.push('/admin/accounts');
  }
};

// 라우터 이탈 방지
onBeforeRouteLeave((to, from, next) => {
  if (hasChanges.value) {
    message.showConfirm(
      '저장하지 않은 변경사항이 있습니다.\n이동하시겠습니까?',
      () => next(),
      () => next(false),
    );
  } else {
    next();
  }
});

// beforeunload 이탈 방지
const beforeUnload = (e) => {
  if (hasChanges.value) {
    e.preventDefault();
    e.returnValue = '';
  }
};
onMounted(() => {
  fetchDetail();
  window.addEventListener('beforeunload', beforeUnload);
});
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));

// 사업자등록증 업로드 (즉시)
const handleLicenseUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await adminAPI.uploadBusinessLicense(props.id, formData);
    account.value.business_license_path = res.data.data.path;
    message.showAlert('사업자등록증이 변경되었습니다.');
  } catch (err) {
    message.showAlert('업로드에 실패했습니다.');
  }
  e.target.value = '';
};

// 미리보기
const previewLicense = () => {
  window.open(fileUrl.value, '_blank');
};

// 로그인 제한 해제
const handleUnlock = async () => {
  message.showConfirm('로그인 제한을 해제하시겠습니까?', async () => {
    try {
      await adminAPI.unlockAccount(props.id);
      account.value.locked_until = null;
      account.value.login_attempts = 0;
      message.showAlert('로그인 제한이 해제되었습니다.');
    } catch (e) {
      message.showAlert('해제에 실패했습니다.');
    }
  });
};

const openStatusChange = () => {
  // 현재 상태를 기본값으로
  const s = account.value.status;
  statusForm.value = {
    status:
      s === 'approved'
        ? 'active'
        : s === 'suspended'
          ? 'suspended'
          : 'withdrawn',
    reason: '',
  };
  showStatusPopup.value = true;
};

const closeStatusPopup = () => {
  showStatusPopup.value = false;
};
const handleStatusChange = async () => {
  try {
    await adminAPI.changeAccountStatus(props.id, statusForm.value);
    // 로컬 상태 즉시 반영
    const statusMap = {
      active: 'approved',
      suspended: 'suspended',
      withdrawn: 'withdrawn',
    };
    account.value.status = statusMap[statusForm.value.status];
    account.value.is_active = statusForm.value.status === 'active';
    showStatusPopup.value = false;
    message.showAlert('계정상태가 변경되었습니다.');
  } catch (e) {
    message.showAlert('상태 변경에 실패했습니다.');
  }
};

// TODO: 크레딧 조회 이동
const goToCreditHistory = () => {};

// TODO: 크레딧 관리 팝업
const openCreditManage = () => {};

// TODO: 계정기록 이동
// 기록보기
const showLogPopup = ref(false);
const logList = ref([]);
const logPage = ref(1);
const logPages = ref([]);
const logBodyRef = ref(null);

const logTotalPages = computed(() => logPages.value.length);
const currentPageLogs = computed(() => logPages.value[logPage.value - 1] || []);

const logVisiblePages = computed(() => {
  const total = logTotalPages.value;
  const current = logPage.value;
  let start = Math.max(1, current - 4);
  let end = Math.min(total, start + 9);
  start = Math.max(1, end - 9);
  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

const goToAccountLog = async () => {
  try {
    const res = await adminAPI.getAccountLogs(props.id);
    logList.value = res.data.data;
    showLogPopup.value = true;
    logPage.value = 1;
    await nextTick();
    splitLogPages();
  } catch (e) {
    message.showAlert('기록 조회에 실패했습니다.');
  }
};

const splitLogPages = () => {
  const MAX_HEIGHT = 366;
  const pages = [];
  let currentPage = [];
  let currentHeight = 0;

  const container = document.createElement('div');
  container.style.cssText =
    'position:absolute;visibility:hidden;width:' +
    (logBodyRef.value?.offsetWidth || 800) +
    'px;';
  document.body.appendChild(container);

  const table = document.createElement('table');
  table.className = 'log-table';
  table.style.width = '100%';
  container.appendChild(table);

  logList.value.forEach((log) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="width:20%;padding:12px 8px">${formatLogDate(log.created_at)}</td>
      <td style="width:22%;padding:12px 8px">${log.category}</td>
      <td style="width:44%;padding:12px 8px;white-space:pre-line">${log.details || '-'}</td>
      <td style="width:14%;padding:12px 8px">${log.operator}</td>
    `;
    table.appendChild(tr);
    const rowHeight = tr.offsetHeight;
    table.removeChild(tr);

    if (currentHeight + rowHeight > MAX_HEIGHT && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }
    currentPage.push(log);
    currentHeight += rowHeight;
  });

  if (currentPage.length > 0) pages.push(currentPage);
  document.body.removeChild(container);

  logPages.value = pages.length > 0 ? pages : [[]];
};

const closeLogPopup = () => {
  showLogPopup.value = false;
};

const formatLogDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const formatDetails = (details) => {
  if (!details || details === '-') return '-';
  return details.replace(/\n/g, '<br>');
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};
</script>

<style lang="scss" scoped>
.page-wrap {
  padding: 32px 42px;
  color: $white;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  .page-title {
    @include font-20-bold;
  }
  .breadcrumb {
    @include font-12-regular;
    color: $dark-text;
  }
}

.btn-back {
  background: none;
  color: $dark-text;
  @include font-14-regular;
  cursor: pointer;
  margin-bottom: 16px;
  &:hover {
    color: $white;
  }
}

.hospital-name {
  @include font-20-bold;
  margin-bottom: 4px;
}

.join-date {
  @include font-12-regular;
  color: $dark-text;
  margin-bottom: 32px;
}

.section-title {
  @include font-16-bold;
  margin-bottom: 16px;
  margin-top: 32px;
}

// 기본 정보 폼
.info-form {
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;

    &.full {
      grid-template-columns: 1fr;
    }
  }

  .form-field {
    display: flex;
    align-items: center;
    gap: 0;

    .field-label {
      min-width: 120px;
      padding: 12px 16px;
      background: $main-gad;
      @include font-14-medium;
      border-radius: $radius-sm 0 0 $radius-sm;
      white-space: nowrap;
    }

    input {
      flex: 1;
      padding: 12px 16px;
      background: $dark-input;
      border: 1px solid $dark-line-gray;
      border-radius: 0 $radius-sm $radius-sm 0;
      color: $white;
      @include font-14-regular;

      &:focus {
        border-color: $main-color;
      }

      &.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  .address-wrap {
    flex: 1;
    display: flex;

    .address-input {
      flex: 1;
      border-radius: 0;
      cursor: pointer;
    }

    .btn-address {
      padding: 12px 20px;
      background: $main-gad;
      color: $white;
      @include font-14-medium;
      border-radius: 0 $radius-sm $radius-sm 0;
      cursor: pointer;
      white-space: nowrap;
    }
  }
}

// 저장 영역
.save-area {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  margin-top: 16px;

  .save-msg {
    @include font-12-regular;
    color: $dark-text;
  }

  .btn-save {
    padding: 10px 32px;
    background: $main-gad;
    color: $white;
    border-radius: $radius-sm;
    @include font-14-medium;
    cursor: pointer;
    &:hover {
      opacity: 0.9;
    }
  }
}

// 계정정보 및 관리
.management-area {
  .mgmt-row {
    display: flex;
    align-items: center;
    padding: 14px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    .mgmt-label {
      min-width: 120px;
      padding: 10px 16px;
      background: $main-gad;
      @include font-14-medium;
      border-radius: $radius-sm;
      margin-right: 16px;
      white-space: nowrap;
    }

    .mgmt-value {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;

      .file-link {
        color: $white;
        text-decoration: underline;
        @include font-14-regular;
        cursor: pointer;
      }
    }
  }
}

.btn-outline {
  padding: 8px 16px;
  background: none;
  border: 1px solid $dark-line-gray;
  color: $white;
  border-radius: $radius-sm;
  @include font-14-medium;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: $main-color;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &.active {
    border-color: $main-color;
    background: $main-color;
  }
}

.btn-primary {
  padding: 8px 16px;
  background: $main-color;
  color: $white;
  border-radius: $radius-sm;
  @include font-14-medium;
  cursor: pointer;
  &:hover {
    background: $sub-color;
  }
}
// 상태변경 팝업
.popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.popup-box {
  background: $dark-bg;
  border: 1px solid $dark-line-gray;
  border-radius: $radius-md;
  padding: 32px 40px;
  min-width: 480px;
  max-width: 560px;
}

.popup-title {
  @include font-16-bold;
  text-align: center;
  margin-bottom: 8px;
}

.popup-hospital {
  @include font-14-regular;
  text-align: center;
  color: $dark-text;
  margin-bottom: 24px;
}

.status-radios {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 24px;

  label {
    display: flex;
    align-items: center;
    gap: 6px;
    @include font-14-regular;
    cursor: pointer;
    color: $dark-text;

    &.selected {
      color: $white;
    }

    input[type='radio'] {
      accent-color: $main-color;
    }
  }
}

.reason-label {
  @include font-14-medium;
  color: $main-color;
  margin-bottom: 8px;
}

.reason-textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px 16px;
  background: $dark-input;
  border: 1px solid $dark-line-gray;
  border-radius: $radius-sm;
  color: $white;
  @include font-14-regular;
  resize: vertical;

  &:focus {
    border-color: $main-color;
    outline: none;
  }
}

.popup-buttons {
  display: flex;
  gap: 12px;
  margin-top: 24px;

  .btn-cancel,
  .btn-confirm {
    flex: 1;
    padding: 12px;
    border-radius: $radius-sm;
    @include font-14-medium;
    cursor: pointer;
  }

  .btn-cancel {
    background: $dark-input;
    color: $white;
    border: 1px solid $dark-line-gray;
  }

  .btn-confirm {
    background: $main-color;
    color: $white;
  }
}

// 기록보기 팝업
.log-popup-box {
  background: $dark-bg;
  border: 1px solid $dark-line-gray;
  border-radius: $radius-md;
  padding: 32px 40px;
  width: 900px;
  max-width: 90vw;
}

.log-popup-title {
  @include font-16-bold;
  margin-bottom: 20px;
  color: $dark-text;
  strong {
    color: $white;
  }
}

.log-body {
  max-height: 366px;
  overflow: hidden;
}

.log-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 12px 8px;
    @include font-12-regular;
    text-align: center;
    vertical-align: top;
  }

  thead tr {
    background: $main-gad;
    th {
      @include font-14-bold;
    }
  }

  tbody tr:nth-child(odd) {
    background: $bg-op;
  }

  .detail-cell {
    white-space: pre-line;
    text-align: center;
    line-height: 1.6;
  }

  .empty-message {
    padding: 60px 0;
    color: $dark-text;
  }
}

.btn-log-confirm {
  display: block;
  margin: 20px auto 0;
  padding: 12px 60px;
  background: $main-color;
  color: $white;
  border-radius: $radius-sm;
  @include font-14-medium;
  cursor: pointer;
}
</style>
