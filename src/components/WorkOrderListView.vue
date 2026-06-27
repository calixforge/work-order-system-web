<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  statusTagType,
  priorityTagType,
} from '@/constants/workOrder'

const props = defineProps({
  // 取数函数:(params) => Promise<{ list, total }>
  fetcher: { type: Function, required: true },
  // 是否显示状态筛选(review/dispatch 后端固定状态,无需此筛选)
  statusFilter: { type: Boolean, default: true },
  // 入口上下文(created/review/dispatch/assigned/admin):详情页据此决定显示哪组动作
  context: { type: String, default: '' },
})

const router = useRouter()
const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = ref({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  status: '',
  priority: '',
})

async function load() {
  loading.value = true
  try {
    // 只带上有值的筛选项
    const params = { pageNum: query.value.pageNum, pageSize: query.value.pageSize }
    if (query.value.keyword) params.keyword = query.value.keyword
    if (props.statusFilter && query.value.status) params.status = query.value.status
    if (query.value.priority) params.priority = query.value.priority
    const res = await props.fetcher(params)
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function onSearch() {
  query.value.pageNum = 1
  load()
}

function onReset() {
  query.value = { pageNum: 1, pageSize: 10, keyword: '', status: '', priority: '' }
  load()
}

function onPageChange(p) {
  query.value.pageNum = p
  load()
}

function goDetail(id) {
  router.push({ path: `/workorder/${id}`, query: props.context ? { from: props.context } : undefined })
}

// "2026-06-18T10:30:00" → "2026-06-18 10:30:00"
function fmtTime(t) {
  return t ? t.replace('T', ' ') : '-'
}

// 供父组件在动作完成后刷新列表
defineExpose({ reload: load })

onMounted(load)
</script>

<template>
  <div>
    <el-form :inline="true" :model="query" class="filter">
      <el-form-item>
        <el-input v-model="query.keyword" placeholder="标题关键字" clearable @keyup.enter="onSearch" />
      </el-form-item>
      <el-form-item v-if="statusFilter">
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 120px">
          <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-select v-model="query.priority" placeholder="优先级" clearable style="width: 120px">
          <el-option v-for="o in PRIORITY_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="工单号" width="80" />
      <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)">{{ row.statusDesc }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="优先级" width="90">
        <template #default="{ row }">
          <el-tag :type="priorityTagType(row.priority)">{{ row.priorityDesc }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="creatorName" label="创建人" width="100" />
      <el-table-column prop="assigneeName" label="接单人" width="100">
        <template #default="{ row }">{{ row.assigneeName || '-' }}</template>
      </el-table-column>
      <el-table-column prop="departmentName" label="部门" width="120" />
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ fmtTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="goDetail(row.id)">详情</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无工单数据" :image-size="92" />
      </template>
    </el-table>

    <el-pagination
      v-if="total > 0"
      class="pager"
      layout="prev, pager, next, total"
      :total="total"
      :current-page="query.pageNum"
      :page-size="query.pageSize"
      @current-change="onPageChange"
    />
  </div>
</template>

<style scoped>
.filter {
  margin-bottom: 8px;
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
