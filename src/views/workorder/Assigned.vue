<script setup>
import WorkOrderListView from '@/components/WorkOrderListView.vue'
import { getAssigned } from '@/api/workorder'
</script>

<template>
  <el-card>
    <template #header>我负责的工单</template>
    <WorkOrderListView :fetcher="getAssigned" context="assigned" />
  </el-card>
</template>
