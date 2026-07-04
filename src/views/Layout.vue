<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, Expand, Fold, UserFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { logout } from '@/api/user'
import { MENU } from '@/config/menu'
import AccountDialog from '@/components/AccountDialog.vue'
import PasswordDialog from '@/components/PasswordDialog.vue'
import WorkOrderAssistant from '@/components/WorkOrderAssistant.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const collapsed = ref(false)
const profileVisible = ref(false)
const passwordVisible = ref(false)

const realName = computed(() => auth.userInfo?.realName || '未登录')
const avatarText = computed(() => realName.value.slice(0, 1))
const asideWidth = computed(() => (collapsed.value ? '64px' : '208px'))
const breadcrumbs = computed(() =>
  route.matched
    .filter((item) => item.meta?.title && item.path !== '/home')
    .map((item) => ({ title: item.meta.title, path: item.path })),
)

// 按角色过滤菜单:分组保留可见子项,子项被过滤光的分组整组隐藏
const menus = computed(() =>
  MENU.map((m) => {
    if (!m.children) {
      return !m.roles || auth.hasAnyRole(m.roles) ? m : null
    }
    const children = m.children.filter((c) => !c.roles || auth.hasAnyRole(c.roles))
    return children.length ? { ...m, children } : null
  }).filter(Boolean),
)

function toggleCollapsed() {
  collapsed.value = !collapsed.value
}

function onUserCommand(command) {
  if (command === 'profile') {
    profileVisible.value = true
  } else if (command === 'password') {
    passwordVisible.value = true
  } else if (command === 'logout') {
    onLogout()
  }
}

async function onLogout() {
  try {
    await ElMessageBox.confirm('确定退出登录?', '提示', { type: 'warning' })
  } catch {
    return
  }
  // 后端登出失败(如 token 已失效)也继续清本地态,避免未处理的 rejection
  try {
    await logout()
  } catch {
    // 忽略后端登出错误
  }
  auth.clear()
  ElMessage.success('已退出')
  router.replace('/login')
}
</script>

<template>
  <el-container class="layout">
    <el-aside :width="asideWidth" class="aside">
      <div class="logo" :class="{ collapsed }">
        <img class="logo-mark" src="/favicon.ico" alt="" />
        <span v-show="!collapsed" class="logo-text">智能工单</span>
      </div>
      <el-menu
        router
        class="side-menu"
        :collapse="collapsed"
        :collapse-transition="false"
        :default-active="$route.path"
        background-color="#001529"
        text-color="#b7c4d5"
        active-text-color="#fff"
      >
        <template v-for="item in menus" :key="item.path || item.title">
          <el-sub-menu v-if="item.children" :index="item.title">
            <template #title>
              <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
              <span>{{ item.title }}</span>
            </template>
            <el-menu-item v-for="c in item.children" :key="c.path" :index="c.path">
              <el-icon v-if="c.icon"><component :is="c.icon" /></el-icon>
              <template #title>{{ c.title }}</template>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="item.path">
            <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <el-button class="collapse-btn" text @click="toggleCollapsed">
          <el-icon><component :is="collapsed ? Expand : Fold" /></el-icon>
        </el-button>
        <el-breadcrumb separator="/" class="breadcrumb">
          <el-breadcrumb-item to="/home">首页</el-breadcrumb-item>
          <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
            {{ item.title }}
          </el-breadcrumb-item>
        </el-breadcrumb>
        <div class="spacer" />
        <el-dropdown @command="onUserCommand">
          <span class="user">
            <el-avatar :size="32" class="avatar" :icon="UserFilled">
              {{ avatarText }}
            </el-avatar>
            <span class="user-name">{{ realName }}</span>
            <el-icon class="arrow"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">账号详情</el-dropdown-item>
              <el-dropdown-item command="password">修改密码</el-dropdown-item>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main class="main">
        <router-view />
        <AccountDialog v-model="profileVisible" />
        <PasswordDialog v-model="passwordVisible" />
      </el-main>
    </el-container>

    <!-- 全局工单助手:登录后每页右下角悬浮 -->
    <WorkOrderAssistant />
  </el-container>
</template>

<style scoped>
.layout {
  height: 100vh;
  background: #f5f7fb;
}
.aside {
  background: #001529;
  box-shadow: 2px 0 8px rgb(0 21 41 / 8%);
  transition: width 0.2s ease;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  white-space: nowrap;
}
.logo.collapsed {
  justify-content: center;
  padding: 0;
}
.logo-mark {
  width: 28px;
  height: 28px;
  display: block;
  border-radius: 4px;
  object-fit: contain;
}
.logo-text {
  overflow: hidden;
}
.side-menu {
  border-right: 0;
}
.header {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 20px 0 12px;
  background: #fff;
  border-bottom: 1px solid #e8edf3;
}
.collapse-btn {
  width: 36px;
  height: 36px;
  margin-right: 8px;
  font-size: 18px;
}
.breadcrumb {
  min-width: 0;
}
.spacer {
  flex: 1;
}
.user {
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #333;
  outline: none;
}
.avatar {
  background: #1677ff;
}
.user-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.arrow {
  color: #8a94a6;
}
.main {
  padding: 20px;
  background: #f5f7fb;
}
</style>
