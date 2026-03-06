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
  .data-table {
    width: 100%;
    border-collapse: collapse;
    border-top-right-radius: 8px;
    border-top-left-radius: 8px;
    overflow: hidden;

    th,
    td {
      text-align: center;
      padding: 14px 8px;
      @include font-14-regular;
    }

    thead tr {
      background: $main-gad;
    }
    th {
      @include font-14-bold;
    }

    tbody tr:nth-child(odd) {
      background: $bg-op;
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
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  background: $dark-line-gray;
  transition: background 0.3s;

  .toggle-label {
    @include font-12-regular;
    color: $dark-text;
    min-width: 42px;
  }

  .toggle-knob {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: $white;
    transition: transform 0.3s;
  }

  &.active {
    background: $main-color;

    .toggle-label {
      color: $white;
    }
  }
}
</style>
