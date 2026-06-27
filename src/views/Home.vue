<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Avatar,
  CircleCheck,
  Document,
  List,
  OfficeBuilding,
  Promotion,
  Stamp,
  Tickets,
  UserFilled,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { getWorkOrderStats } from '@/api/workorder'
import { getAdminStats } from '@/api/admin'

const auth = useAuthStore()
const router = useRouter()
const realName = computed(() => auth.userInfo?.realName || '')
const isAdmin = computed(() => auth.hasRole('ADMIN'))
// 是否拥有操作角色(决定要不要拉 /workorder/stats 待办统计)
const hasTodoRole = computed(() =>
  auth.hasAnyRole(['SUBMITTER', 'REVIEWER', 'DISPATCHER', 'HANDLER']),
)
const loading = ref(false)

const stats = ref({
  pendingReview: 0,
  pendingAssign: 0,
  assigned: 0,
  pendingAcceptance: 0,
  created: 0,
})
const adminStats = ref({
  workorderTotal: 0,
  pendingReview: 0,
  pendingAssign: 0,
  enabledUsers: 0,
  disabledUsers: 0,
  departmentCount: 0,
})

// 操作角色的待办卡片(按当前用户角色过滤)
const roleCards = computed(() =>
  [
    { title: '我的待审核', value: stats.value.pendingReview || 0, roles: ['REVIEWER'], path: '/workorder/review', type: 'warning', icon: Stamp },
    { title: '待派单', value: stats.value.pendingAssign || 0, roles: ['DISPATCHER'], path: '/workorder/dispatch', type: 'primary', icon: Promotion },
    { title: '我的待处理', value: stats.value.assigned || 0, roles: ['HANDLER'], path: '/workorder/assigned', type: 'success', icon: List },
    { title: '我的待验收', value: stats.value.pendingAcceptance || 0, roles: ['SUBMITTER'], path: '/workorder/created', type: 'danger', icon: CircleCheck },
    { title: '我创建的工单', value: stats.value.created || 0, roles: ['SUBMITTER'], path: '/workorder/created', type: 'info', icon: Document },
  ].filter((card) => auth.hasAnyRole(card.roles)),
)

// 管理员的系统概览卡片(点击直达对应管理页)
const adminCards = computed(() =>
  isAdmin.value
    ? [
        { title: '全部工单', value: adminStats.value.workorderTotal || 0, path: '/admin/workorders', type: 'primary', icon: Tickets },
        { title: '待审核', value: adminStats.value.pendingReview || 0, path: '/admin/workorders', type: 'warning', icon: Stamp },
        { title: '待派单', value: adminStats.value.pendingAssign || 0, path: '/admin/workorders', type: 'warning', icon: Promotion },
        { title: '启用用户', value: adminStats.value.enabledUsers || 0, path: '/admin/users', type: 'success', icon: UserFilled },
        { title: '停用用户', value: adminStats.value.disabledUsers || 0, path: '/admin/users', type: 'info', icon: Avatar },
        { title: '部门数', value: adminStats.value.departmentCount || 0, path: '/admin/departments', type: 'info', icon: OfficeBuilding },
      ]
    : [],
)

const visibleCards = computed(() => [...roleCards.value, ...adminCards.value])

async function loadStats() {
  loading.value = true
  try {
    const tasks = []
    if (hasTodoRole.value) tasks.push(getWorkOrderStats().then((d) => (stats.value = d)))
    if (isAdmin.value) tasks.push(getAdminStats().then((d) => (adminStats.value = d)))
    await Promise.all(tasks)
  } finally {
    loading.value = false
  }
}

function go(path) {
  router.push(path)
}

onMounted(loadStats)
</script>

<template>
  <el-card class="welcome" v-loading="loading">
    <h2 class="welcome-title">
      欢迎使用智能工单系统<template v-if="realName">,{{ realName }}</template>
    </h2>
    <p class="welcome-tip">这里汇总与你相关的待办与统计,点击卡片可直达对应页面。</p>

    <div v-if="visibleCards.length" class="stats-grid">
      <button
        v-for="card in visibleCards"
        :key="card.title"
        class="stat-card"
        :class="`stat-${card.type}`"
        type="button"
        @click="go(card.path)"
      >
        <span class="stat-icon"><el-icon><component :is="card.icon" /></el-icon></span>
        <span class="stat-body">
          <span class="stat-title">{{ card.title }}</span>
          <span class="stat-value">{{ card.value }}</span>
        </span>
      </button>
    </div>
    <el-empty v-else description="暂无待办统计" :image-size="92" />
  </el-card>
</template>

<style scoped>
.welcome-title {
  margin: 0 0 10px;
  font-size: 20px;
}
.welcome-tip {
  margin: 0 0 22px;
  color: #909399;
  font-size: 14px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 256px));
  gap: 16px;
  justify-content: start;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid #eaeef5;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}
.stat-card:hover {
  border-color: var(--c);
  box-shadow: 0 10px 24px rgb(31 45 61 / 10%);
  transform: translateY(-2px);
}
.stat-icon {
  width: 46px;
  height: 46px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 22px;
  background: var(--cbg);
  color: var(--c);
}
.stat-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.stat-title {
  color: #8a94a6;
  font-size: 13px;
  white-space: nowrap;
}
.stat-value {
  margin-top: 2px;
  font-size: 28px;
  line-height: 1.15;
  font-weight: 700;
  color: #1f2d3d;
}
.stat-warning {
  --c: #e6a23c;
  --cbg: #fdf6ec;
}
.stat-primary {
  --c: #1677ff;
  --cbg: #ecf3ff;
}
.stat-success {
  --c: #67c23a;
  --cbg: #f0f9eb;
}
.stat-danger {
  --c: #f56c6c;
  --cbg: #fef0f0;
}
.stat-info {
  --c: #909399;
  --cbg: #f4f4f5;
}
</style>
