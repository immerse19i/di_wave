<template>
  <div class="profile">
    <div class="basic_info info">
      <div class="info-tit">
        기본 정보
      </div>
      <div class="row_box">
        <div class="form-group">
          <label for="#hosName">병원명</label>
          <input id="hosName" type="text">
        </div>
        <div class="form-group">
          <label for="#CEOName">대표자명</label>
          <input id="CEOName" type="text">
        </div>
        

      </div>
      <div class="row_box">
        <div class="form-group">
          <label for="#identity">ID</label>
          <input id="identity" type="text">
        </div>
        <div class="form-group">
          <label for="#phone">연락처</label>
          <input id="phone" type="text">
        </div>
      </div>
      <div class="row_box">
        <div class="form-group">
          <label for="#hosAdress">병원주소</label>
          <input id="hosAdress" type="text">
          <button>검색</button>
        </div>
        <div class="form-group">
          <label for="#email">이메일주소</label>
          <input id="email" type="text">
        </div>
      </div>
      <div class="row_box">
        <div class="form-group">
                    <label for="#ad_detail">상세주소</label>
          <input id="ad_detail" type="text">
        </div>
      
      </div>
      <div class="row_box">
          <div class="form-group">
                    <label for="#bis_number">사업자번호</label>
          <input id="bis_number" type="text">
        </div>
      </div>
    </div>
  </div>

</template>
<script setup>



</script>
<style scoped lang="scss">
  .profile{
    padding:24px;
    color:$white;
    .info-tit{
      @include font-16-bold;
      margin-bottom:12px;

    }

    label{
      min-width:152px;
      color:$white;
      padding:12px 24px;
      background:$bg-op;
      border-radius: $radius-md;
    }
    .row_box{
      display:flex;
      gap:36px;
      margin-bottom:12px;
    }
    .form-group{
      flex:1;
      display:flex;
      gap:16px;
      align-items:center;
      input{
        @include font-16-regular;
        flex:1;
          background: $bg-op;
        border:1px solid $dark-line-gray;
        border-radius: $radius-sm;
        color:$white;
        padding:12px;
      }
      button{
        @include font-14-medium;
        height:calc(100% - 11px);
        color:$white;
        background:$main_gad;
        min-width:96px;
        border-radius:$radius-sm;

      }
    }
  }

</style>