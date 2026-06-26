<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const visible = defineModel({ type: Boolean })
const auth = useAuthStore()
const info = computed(() => auth.userInfo || {})
const roles = computed(() => info.value.roles || [])
</script>

<template>
  <el-dialog v-model="visible" title="账号详情" width="min(420px, calc(100vw - 32px))">
    <div class="account-head">
      <el-avatar :size="64" class="account-avatar">
        {{ (info.realName || '?').slice(0, 1) }}
      </el-avatar>
      <div class="account-name">{{ info.realName || '-' }}</div>
    </div>
    <el-descriptions :column="1" border>
      <el-descriptions-item label="用户名">{{ info.username || '-' }}</el-descriptions-item>
      <el-descriptions-item label="部门">{{ info.departmentName || '未分配' }}</el-descriptions-item>
      <el-descriptions-item label="手机">{{ info.phone || '-' }}</el-descriptions-item>
      <el-descriptions-item label="角色">
        <template v-if="roles.length">
          <el-tag v-for="r in roles" :key="r.id" class="role-tag">{{ r.name }}</el-tag>
        </template>
        <span v-else>-</span>
      </el-descriptions-item>
    </el-descriptions>
  </el-dialog>
</template>

<style scoped>
.account-head {
  text-align: center;
  margin-bottom: 16px;
}
.account-avatar {
  background: #1677ff;
  font-size: 24px;
}
.account-name {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 600;
}
.role-tag {
  margin: 0 6px 4px 0;
}
</style>
