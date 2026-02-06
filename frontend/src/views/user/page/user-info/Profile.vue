<template>
  <div class="profile">
    <div class="basic_info info">
      <div class="info-tit">
        기본 정보
      </div>
      <div class="row_box">
        <div class="form-group">
          <label for="hosName">병원명</label>
          <input id="hosName" type="text" v-model="profile.hospital_name" readonly>
        </div>
        <div class="form-group">
          <label for="CEOName">대표자명</label>
          <input id="CEOName" type="text" v-model="profile.ceo_name" readonly>
        </div>
      </div>
      <div class="row_box">
        <div class="form-group">
          <label for="identity">ID</label>
          <input id="identity" type="text" v-model="profile.login_id" readonly>
        </div>
        <div class="form-group">
          <label for="phone">연락처</label>
          <input id="phone" type="text" v-model="profile.phone" readonly>
        </div>
      </div>
      <div class="row_box">
        <div class="form-group">
          <label for="hosAdress">병원주소</label>
          <input id="hosAdress" type="text" v-model="profile.address" readonly>
        </div>
        <div class="form-group">
          <label for="email">이메일주소</label>
          <input id="email" type="text" v-model="profile.email" readonly>
        </div>
      </div>
      <div class="row_box">
        <div class="form-group">
          <label for="ad_detail">상세주소</label>
          <input id="ad_detail" type="text" v-model="profile.address_detail" readonly>
        </div>
      </div>
      <div class="row_box">
        <div class="form-group">
          <label for="bis_number">사업자번호</label>
          <input id="bis_number" type="text" v-model="profile.business_number" readonly>
        </div>
      </div>
    </div>
    <div class="account_info">
      <div class="info-tit">
        계정정보 및 관리
      </div>
      <div class="row_box">
        <label for="#bisFile">사업자등록증</label>
        <input id="bisFile" type="file" ref="fileInput" @change="onFileChange">
        <span class="file-name" @click="openFilePicker">{{ fileName == '' ? '선택된 파일이 없습니다.' : fileName }}</span>
        <button class="preview">미리보기</button>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { authAPI } from '@/api/auth';

/**
 * @
 */

const profile = ref({
  hospital_name: '',
  ceo_name: '',
  login_id: '',
  phone: '',
  address: '',
  address_detail: '',
  email: '',
  business_number: ''
});

const fetchProfile = async () => {
  try {
    const response = await authAPI.getMe();
    console.log(response)
    profile.value = response.data;
  } catch (error) {
    console.error('프로필 조회 실패:', error);
  }
};

//인풋 바꾸기
const fileInput = ref(null);
const fileName = ref('');

const openFilePicker = ()=>{
  fileInput.value.click();
} 

const onFileChange = (e)=> {
  const file = e.target.files[0];
  if(file){
    fileName.value = file.name
  }
}



onMounted(() => {
  fetchProfile();
});
</script>
<style scoped lang="scss">
  #bisFile{
    display:none;
  }
  .profile{
    padding:24px;
    color:$white;
    .info{
      margin-bottom:56px;
    }
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
      align-items: center;
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

    // 파일 인풋
    .file-name{
      display:flex;
      align-items: center;
    }

    .preview{
      @include font-14-regular;
      color:$white;
      border:1px solid $sub-color-2;
      padding:12px 8px;
      flex-shrink: 0;
      height:fit-content;
      border-radius: $radius-sm;

    }
  }

</style>