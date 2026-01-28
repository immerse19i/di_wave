<template>
  <div class="content">
    <div class="content_top">
      <button>신규분석</button>
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
        <thead>
          <tr>
            <th></th>
          </tr>
        </thead>
      </table>
    </div>
  </div>
</template>
<script setup>
import { onMounted, ref } from 'vue';
import { userList } from '../../../mock';
</script>

<style lang="scss" scoped>
.content {
  padding: 42px;
  color: $white;

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
