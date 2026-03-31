import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/store/auth'
import { authAPI } from '@/api/auth'
import ReportViewer from '../views/user/page/ReportViewer.vue'

// User Views
const Login = () => import('@/views/user/Login.vue');
const UserMain = () => import('@/views/user/UserMain.vue');
const UserList = () => import('@/views/user/page/UserList.vue');
const UserInfo = () => import('@/views/user/page/UserInfo.vue');
const Profile = () => import('@/views/user/page/user-info/Profile.vue');
const PasswordChange = () => import('@/views/user/page/user-info/PasswordChange.vue');
const Notice = () => import('@/views/user/page/user-info/Notice.vue');
const NoticeDetail = () => import('@/views/user/page/user-info/NoticeDetail.vue');
const Inquiry = () => import('@/views/user/page/user-info/Inquiry.vue');
const Credit = () => import('@/views/user/page/user-info/Credit.vue');
const Info = () => import('@/views/user/page/user-info/Info.vue');
const CreditCharge = () => import('@/views/user/page/user-info/CreditCharge.vue');
const Terms = () => import('@/views/user/Terms.vue')
const AdminNoticeWrite = () => import('@/views/admin/AdminNoticeWrite.vue')

// Admin Views
const AdminLogin = () => import('@/views/admin/Login.vue');
const Register = ()=> import('@/views/user/Register.vue');
const Reapply = () => import('@/views/user/Reapply.vue');
const AnalysisResult = () => import('@/views/user/page/AnalysisResult.vue');
const AdminDashboard = () => import('@/views/admin/Approval.vue');
const AdminMain = () => import('@/views/admin/AdminMain.vue')
const AdminTerms = () => import('@/views/admin/AdminTerms.vue')
const AdminTermsHistory = () => import('@/views/admin/AdminTermsHistory.vue')
const ApprovalDetail = () => import('@/views/admin/ApprovalDetail.vue')
const AccountList = () => import('@/views/admin/AccountList.vue')
const AccountDetail = () => import('@/views/admin/AccountDetail.vue')
const AdminNotice = () => import('@/views/admin/AdminNotice.vue')
const AdminPopup = () => import('@/views/admin/AdminPopup.vue')
const AdminPopupWrite = () => import('@/views/admin/AdminPopupWrite.vue')
const AdminInfoEdit = () => import('@/views/admin/AdminInfoEdit.vue')
const UsageLog = () => import('@/views/admin/UsageLog.vue')
const UsageLogDetail = () => import('@/views/admin/UsageLogDetail.vue')
const Permission = () => import('@/views/admin/Permission.vue')
const AdminInquiry = () => import('@/views/admin/AdminInquiry.vue')
const AdminInquiryDetail = () => import('@/views/admin/AdminInquiryDetail.vue')
const AccountAdd = () => import('@/views/admin/AccountAdd.vue')

const routes = [
  // User Routes
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false },
  },
{
  path: '/main',
  name: 'main',
  component: UserMain,
  meta: { requiresAuth: true },
  children: [
    { path: '', component: UserList },
    { path: 'analysis/:id', component: AnalysisResult, props: true },
    { path: 'analysis/:id/report', component: ReportViewer, props: true },
  ],
},
  
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: AdminLogin,
    meta: { requiresAuth: false },
  },
{
  path: '/admin/dashboard',
  component: AdminMain,
  meta: { requiresAuth: true },
  children: [
    { path: ''},
  ],
},
{
  path: '/admin',
  component: AdminMain,
  meta: { requiresAuth: true },
  redirect: '/admin/approval',
  children: [
    { path: 'approval', component: AdminDashboard },
    { path: 'terms', component: AdminTerms },
    { path: 'terms/history/:type', component: AdminTermsHistory },
    { path: 'approval/:id', component: ApprovalDetail, props: true },  // ← 추가
    { path: 'accounts', component: AccountList },
    { path: 'accounts/add', component: AccountAdd },
    { path: 'accounts/:id', component: AccountDetail, props: true },
    { path: 'notices', component: AdminNotice },
    { path: 'notices/write', component: AdminNoticeWrite },
{ path: 'notices/:id', component: AdminNoticeWrite, props: true },
{ path: 'popups', component: AdminPopup },
{ path: 'popups/write', component: AdminPopupWrite },
{ path: 'popups/:id', component: AdminPopupWrite, props: true },
{ path: 'info', component: AdminInfoEdit },
{ path: 'logs', component: UsageLog },
{ path: 'logs/:id', component: UsageLogDetail, props: true },
{ path: 'permissions', component: Permission },
{ path: 'inquiries', component: AdminInquiry },
{ path: 'inquiries/:id', component: AdminInquiryDetail, props: true },
  ],
},
  // routes 배열에 추가 (/main 라우트 아래에)
{
  path: '/user-info',
  name: 'UserInfo',
  component: UserInfo,
  meta: { requiresAuth: true },
  children: [
    { path: '', redirect: '/user-info/profile' },
    { path: 'profile', component: Profile },
    { path: 'password-change', component: PasswordChange },
    { path: 'notice', component: Notice },
    { path: 'notice/:id', component: NoticeDetail, props: true },
    { path: 'inquiry', component: Inquiry },
    { path: 'credit', component: Credit },
    { path: 'credit-charge', component: CreditCharge },
    { path: 'info', component: Info },
  ],
},
{
  path: '/register',
  name: 'Register',
  component: Register,
  meta: { requiresAuth: false },
},
{
  path: '/reapply',
  name: 'Reapply',
  component: Reapply,
  meta: { requiresAuth: false },
},
//약관 페이지
{
  path: '/terms',
  name: 'Terms',
  component: Terms,
  meta: { requiresAuth: false },
},
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});



// 라우터 가드 - 인증 체크 + user 데이터 자동 복원
router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()

  // 인증 불필요 페이지는 통과
  if (to.meta.requiresAuth === false) {
    return next()
  }

  // 토큰 없으면 로그인으로
  if (!auth.token) {
    const loginPath = to.path.startsWith('/admin') ? '/admin/login' : '/login'
    return next(loginPath)
  }

  // 토큰 있는데 user 없으면 getMe로 복원
  if (!auth.user) {
    try {
      const res = await authAPI.getMe()
      auth.setUser(res.data)
    } catch (e) {
      // 토큰 만료/무효 → 로그아웃
      auth.logout()
      const loginPath = to.path.startsWith('/admin') ? '/admin/login' : '/login'
      return next(loginPath)
    }
  }

  // 반려 상태 유저는 서류보완 페이지로 강제 이동
  if (auth.user?.hospital_status === 'rejected' && to.path !== '/reapply') {
    return next('/reapply')
  }

  // 관리자 페이지는 admin role만 접근 가능
  if (to.path.startsWith('/admin') && auth.user?.role !== 'admin') {
    return next('/main')
  }

  // 유저 페이지는 hospital role만 접근 가능
  if ((to.path.startsWith('/main') || to.path.startsWith('/user-info')) && auth.user?.role === 'admin') {
    return next('/admin')
  }

  next()
})





export default router;
