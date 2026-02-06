<template>
  <footer>
    <div class="footer_inner">
      <div class="logo">
        <img src="/assets/logo/di_wave_logo.svg" alt="di_wave_logo">
      </div>
      <ul class="company_info">
        <li class="comp_name">
          디웨이브주식회사

        </li>
        <li class="ceo_name">
          대표이사 : 우건철

        </li>
        <li class="comp_adr">

          서울특별시 강남구 강남대로 354, 혜천빌딩 707호
        </li>
        <li class="bis_num">
          사업자 등록번호: 162-87-02006

        </li>
        <li class="ph_mail">

          csadmin@diwave.io | 02-2088-8728
        </li>
      </ul>
      <div class="terms_copy">
          <button class="terms">
            약관 및 정책
          </button>
          <div class="copy">
            © DiWAVE Inc. 2026 All Right Reserved
          </div>
      </div>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
  footer{
    width: calc(100% - 88px);
    border-top: 1px solid $dark-gray;
    margin:auto;
    height: 157px;
    .footer_inner{
      padding:36px;
      display:flex;
      justify-content: center;;
      width:100%;
      height:100%;
      gap:40px;
      .logo{
        max-width:89px;
        img{
          width:100%;
        }
      }
      .company_info{
        @include font-12-regular;
        color:$dark-input-gray;
        line-height:1.4;
      }
      .terms_copy{
        @include font-12-bold;
        color: $dark-input-gray;
        line-height:1.4;
        
        .terms{
          color: $dark-input-gray;
          margin-bottom:12px;
          text-decoration:underline;
        }

      }
    }
  }
  
</style>