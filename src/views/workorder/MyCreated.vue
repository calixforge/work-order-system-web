<script setup>
import WorkOrderListView from '@/components/WorkOrderListView.vue'
import { getMyCreated } from '@/api/workorder'
</script>

<template>
  <el-card>
    <template #header>我创建的工单</template>
    <WorkOrderListView :fetcher="getMyCreated" />
  </el-card>
</template>
