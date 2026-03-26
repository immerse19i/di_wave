<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">권한</h2>
      <div class="breadcrumb">권한 &gt; 목록</div>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>관리자명</th>
            <th>로그인ID</th>
            <th>활성화/비활성화</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="admin in adminList" :key="admin.id">
            <td>{{ admin.name }}</td>
            <td>{{ admin.login_id }}</td>
            <td>
              <div
                class="toggle-switch"
                :class="{ active: admin.is_active }"
                @click="handleToggle(admin)"
              >
                <span class="toggle-label">
                  {{ admin.is_active ? '활성화' : '비활성화' }}
                </span>
                <span class="toggle-knob"></span>
              </div>
            </td>
          </tr>
          <tr v-if="adminList.length === 0">
            <td colspan="3" class="empty-row">관리자 계정이 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { adminAPI } from '@/api/admin';
import { UseMessageStore } from '@/store/message';

const message = UseMessageStore();
const adminList = ref([]);

const fetchAdmins = async () => {
  try {
    const res = await adminAPI.getAdmins();
    adminList.value = res.data.data;
  } catch (err) {
    console.error('fetchAdmins error:', err);
  }
};

const handleToggle = (admin) => {
  const action = admin.is_active ? '비활성화' : '활성화';
  message.showConfirm(
    `${admin.name} 계정을 ${action}하시겠습니까?`,
    async () => {
      try {
        const res = await adminAPI.toggleAdmin(admin.id);
        admin.is_active = res.data.data.is_active;
      } catch (err) {
        console.error('toggleAdmin error:', err);
      }
    },
  );
};

onMounted(() => {
  fetchAdmins();
});
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

.table-wrap {
  padding: 12px 16px;
  background: $table-bg;
  border-radius: 12px;
  .data-table {
    width: 100%;
    border-collapse: collapse;
    border-top-right-radius: 8px;
    border-top-left-radius: 8px;
    overflow: hidden;

    th,
    td {
      text-align: center;
      padding: 12px 8px;
      @include font-12-regular;
      color: $dark-text;
    }

    thead tr {
      background: $bg-op;
    }
    th {
      @include font-14-bold;
      color: $gray;
    }

    .empty-row {
      padding: 60px 0;
      color: $dark-text;
    }
  }
}

// 토글 스위치
.toggle-switch {
  display: inline-flex;
  align-items: center;
  width: 68px;
  height: 24px;
  border-radius: 12px;
  background: #a0a0a0;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;

  .toggle-label {
    font-family: $font-family;
    font-size: 10px;
    font-weight: $font-weight-medium;
    line-height: 100%;
    color: $white;
    position: absolute;
    right: 10px;
  }

  .toggle-knob {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: $white;
    position: absolute;
    left: 4px;
    transition: left 0.2s;
  }

  &.active {
    background: $main-color;

    .toggle-label {
      left: 10px;
      right: auto;
    }

    .toggle-knob {
      left: calc(100% - 20px);
    }
  }
}
</style>
