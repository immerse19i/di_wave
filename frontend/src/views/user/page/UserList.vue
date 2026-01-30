<template>
  <div class="content">
    <div class="content_top">
      <button @click="modal.open('new_analysis', 'page')">신규분석</button>
      <div class="search_bar">
        <span class="search_icon">
          <img src="/assets/icons/search.svg" alt="search_icon" />
        </span>
        <input type="text" placeholder="환자명 또는 환자ID를 입력해 주세요" />
      </div>
      <button>검색</button>
    </div>
    <div class="content_list">
      <table>
        <colgroup>
          <col style="width: auto" />
          <col style="width: 220px" />
          <col style="width: 112px" />
          <col style="width: 60px" />
          <col style="width: 112px" />
          <col style="width: 88px" />
          <col style="width: 88px" />
          <col style="width: 88px" />
          <col style="width: 88px" />
          <col style="width: 88px" />
          <col style="width: 60px" />
        </colgroup>
        <thead>
          <tr>
            <th>환자ID</th>
            <th>환자명</th>
            <th>생년월일</th>
            <th>성별</th>
            <th>분석일</th>
            <th>나이</th>
            <th>뼈나이</th>
            <th>예측키</th>
            <th>몸무게</th>
            <th>담당주치의</th>
            <th>Report</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in userList" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.birth }}</td>
            <td>{{ item.male }}</td>
            <td>{{ item.analyzeDate }}</td>
            <td>{{ item.age }}</td>
            <td>{{ item.boneAge }}</td>
            <td>{{ item.prdHeight }}</td>
            <td>{{ item.weight }}</td>
            <td>{{ item.physician }}</td>
            <td>
              <a :href="item.report" download class="btn-report">
                <img src="/assets/icons/pdf_down.svg" alt="download_icon" />
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script setup>
import { userList } from '../../../mock';
import { useModalStore } from '@/store/modal';

const modal = useModalStore();
</script>

<style lang="scss" scoped>
.content {
  padding: 42px;
  color: $white;

  .content_list {
    table {
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
      }

      thead tr {
        background: $main-gad;
        padding: 0 11.5px;
      }

      th {
        @include font-14-bold;
        // border-bottom: 1px solid $dark-line-gray;
      }

      td {
        // border-bottom: 1px solid $dark-gray-dark;
      }
      tbody tr:nth-child(odd) {
        background: $bg-op;
      }
      tbody tr:hover {
        // background-color: rgba(255, 255, 255, 0.05);
      }

      .btn-report {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0.8;
        transition: opacity $transition-fast;

        &:hover {
          opacity: 1;
        }
      }
    }
  }

  .content_top {
    display: flex;
    // background: $main-gad;
    gap: $spacing-xl;
    margin-bottom: 24px;
    button {
      color: $white;
      background: $main-gad;
      min-width: 136px;
      padding: 7.5px;
      border-radius: $radius-sm;
    }
    .search_bar {
      flex: 1;
      display: flex;
      padding: 4px 12px;
      position: relative;
      border-radius: $radius-sm;
      background: $bg-op;
      border: 1px solid;

      border-image-source: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.09) 0%,
        rgba(255, 255, 255, 0.06) 100%
      );

      input {
        width: 100%;
        background: none;
        border: none;
        color: $white;
      }
      // input 포커스 시 border 변경
      &:has(input:focus) {
        border-image-source: none;
        border-color: $main-color;
      }
      .search_icon {
        width: 24px;
        height: 24px;
        margin-right: 12px;
        img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      }
    }
  }
}
</style>
