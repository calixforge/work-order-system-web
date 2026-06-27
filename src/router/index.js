import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getInfo } from '@/api/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'workorder/create',
        name: 'WorkOrderCreate',
        component: () => import('@/views/workorder/WorkOrderCreate.vue'),
        meta: { title: '创建工单', roles: ['SUBMITTER'] },
      },
      {
        path: 'workorder/created',
        name: 'MyCreated',
        component: () => import('@/views/workorder/MyCreated.vue'),
        meta: { title: '我创建的', roles: ['SUBMITTER'] },
      },
      {
        path: 'workorder/review',
        name: 'Review',
        component: () => import('@/views/workorder/Review.vue'),
        meta: { title: '待我审核', roles: ['REVIEWER'] },
      },
      {
        path: 'workorder/dispatch',
        name: 'Dispatch',
        component: () => import('@/views/workorder/Dispatch.vue'),
        meta: { title: '待派单', roles: ['DISPATCHER'] },
      },
      {
        path: 'workorder/assigned',
        name: 'Assigned',
        component: () => import('@/views/workorder/Assigned.vue'),
        meta: { title: '我负责的', roles: ['HANDLER'] },
      },
      {
        path: 'admin/workorders',
        name: 'AdminWorkOrders',
        component: () => import('@/views/admin/AdminWorkOrders.vue'),
        meta: { title: '全部工单', roles: ['ADMIN'] },
      },
      {
        path: 'admin/users',
        name: 'UserManage',
        component: () => import('@/views/admin/UserManage.vue'),
        meta: { title: '用户管理', roles: ['ADMIN'] },
      },
      {
        path: 'admin/departments',
        name: 'DepartmentManage',
        component: () => import('@/views/admin/DepartmentManage.vue'),
        meta: { title: '部门管理', roles: ['ADMIN'] },
      },
      {
        path: 'workorder/:id/edit',
        name: 'WorkOrderEdit',
        component: () => import('@/views/workorder/WorkOrderCreate.vue'),
        meta: { title: '编辑草稿', roles: ['SUBMITTER'] },
      },
      {
        path: 'workorder/:id',
        name: 'WorkOrderDetail',
        component: () => import('@/views/workorder/WorkOrderDetail.vue'),
        meta: { title: '工单详情' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫:鉴权 + 刷新后恢复用户信息 + 角色校验
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.public) {
    // 已登录访问登录页,直接回首页
    if (auth.token && to.name === 'Login') return '/home'
    return true
  }

  if (!auth.token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 刷新后 token 还在但 userInfo 丢了 → 回源拉一次(失败说明登录态已失效)
  if (!auth.userInfo) {
    try {
      auth.setUserInfo(await getInfo())
    } catch {
      auth.clear()
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }

  // 角色不匹配 → 回首页
  if (to.meta.roles && !auth.hasAnyRole(to.meta.roles)) {
    return '/home'
  }

  return true
})

export default router
