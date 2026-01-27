import { createRouter, createWebHistory } from 'vue-router';

// User Views
const Login = () => import('@/views/user/Login.vue');
const UserMain = () => import('@/views/user/UserMain.vue');
const UserList = () => import('@/views/user/page/UserList.vue');

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
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
