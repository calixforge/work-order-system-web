<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const realName = computed(() => auth.userInfo?.realName || '')
</script>

<template>
  <el-card class="welcome">
    <h2 class="welcome-title">
      欢迎使用智能工单系统<template v-if="realName">,{{ realName }}</template>
    </h2>
    <p class="welcome-tip">请从左侧菜单选择功能开始操作。</p>
    <p class="welcome-sub">账号详情可点击右上角头像查看。</p>
  </el-card>
</template>

<style scoped>
.welcome-title {
  margin: 0 0 12px;
  font-size: 20px;
}
.welcome-tip {
  margin: 0 0 6px;
  color: #606266;
}
.welcome-sub {
  margin: 0;
  color: #909399;
  font-size: 13px;
}
</style>
