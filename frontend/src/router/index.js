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
const Inquiry = () => import('@/views/user/page/user-info/Inquiry.vue');
const Credit = () => import('@/views/user/page/user-info/Credit.vue');
const Info = () => import('@/views/user/page/user-info/Info.vue');
const CreditCharge = () => import('@/views/user/page/user-info/CreditCharge.vue');
const Terms = () => import('@/views/user/Terms.vue')

// Admin Views
const AdminLogin = () => import('@/views/admin/Login.vue');
const Register = ()=> import('@/views/user/Register.vue');
const AnalysisResult = () => import('@/views/user/page/AnalysisResult.vue');
const AdminDashboard = () => import('@/views/admin/Approval.vue');
const AdminMain = () => import('@/views/admin/AdminMain.vue')
const AdminTerms = () => import('@/views/admin/AdminTerms.vue')
const AdminTermsHistory = () => import('@/views/admin/AdminTermsHistory.vue')


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
      auth.setUser(res.data.user)
    } catch (e) {
      // 토큰 만료/무효 → 로그아웃
      auth.logout()
      const loginPath = to.path.startsWith('/admin') ? '/admin/login' : '/login'
      return next(loginPath)
    }
  }

  next()
})





export default router;
