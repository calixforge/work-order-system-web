<script setup>
import WorkOrderListView from '@/components/WorkOrderListView.vue'
import { getReview } from '@/api/workorder'
</script>

<template>
  <el-card>
    <template #header>待我审核</template>
    <!-- 后端固定按 PENDING_REVIEW 查询,不需要状态筛选 -->
    <WorkOrderListView :fetcher="getReview" :status-filter="false" context="review" />
  </el-card>
</template>
