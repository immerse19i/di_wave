import { createRouter, createWebHistory } from 'vue-router';

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
// Admin Views
const AdminLogin = () => import('@/views/admin/Login.vue');

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
    children: [{ path: '', component: UserList }],
  },
  // Admin Routes
  {
    path: '/admin',
    redirect: '/admin/login',
  },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: AdminLogin,
    meta: { requiresAuth: false },
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
    { path: 'info', component: Info },
  ],
},
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
