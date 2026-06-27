<script setup>
import WorkOrderListView from '@/components/WorkOrderListView.vue'
import { getDispatch } from '@/api/workorder'
</script>

<template>
  <el-card>
    <template #header>待派单</template>
    <!-- 后端固定按 PENDING_ASSIGN 查询,不需要状态筛选 -->
    <WorkOrderListView :fetcher="getDispatch" :status-filter="false" context="dispatch" />
  </el-card>
</template>
