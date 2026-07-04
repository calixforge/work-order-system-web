<script setup>
import { ref, watch, onMounted } from 'vue'
import { searchSimilar } from '@/api/workorder'

const props = defineProps({
  // 外部传入的初始关键词(如详情页当前工单标题):有值则挂载时自动搜一次
  initialQuery: { type: String, default: '' },
})

const query = ref('')
const loading = ref(false)
const searched = ref(false)
const results = ref([])

async function onSearch() {
  const q = query.value.trim()
  if (!q) return
  loading.value = true
  try {
    results.value = (await searchSimilar({ query: q })) || []
    searched.value = true
  } finally {
    loading.value = false
  }
}

// 用初始词预填并自动搜(弹框每次打开靠 v-if 重新挂载触发)
function applyInitial() {
  query.value = (props.initialQuery || '').slice(0, 100)
  results.value = []
  searched.value = false
  if (query.value.trim()) onSearch()
}

watch(() => props.initialQuery, applyInitial)
onMounted(applyInitial)

// "2026-06-18T10:30:00" → "2026-06-18 10:30:00"
function fmtTime(t) {
  return t ? t.replace('T', ' ') : '-'
}
function fmtScore(s) {
  return s == null ? '-' : `${Math.round(s * 100)}%`
}
</script>

<template>
  <div>
    <div class="search-row">
      <el-input
        v-model="query"
        maxlength="100"
        show-word-limit
        clearable
        placeholder="用一句话描述问题,如:打印机连不上网"
        @keyup.enter="onSearch"
      />
      <el-button type="primary" :loading="loading" @click="onSearch">搜索</el-button>
    </div>

    <div v-loading="loading" class="results">
      <template v-if="results.length">
        <div v-for="item in results" :key="item.workorderId" class="item">
          <div class="item-head">
            <span class="item-title">{{ item.title }}</span>
            <el-tag size="small" type="success">相似度 {{ fmtScore(item.score) }}</el-tag>
          </div>
          <div v-if="item.description" class="item-desc">{{ item.description }}</div>
          <div class="item-resolution">
            <span class="label">当时的解决方案:</span>{{ item.resolutionSummary || '-' }}
          </div>
          <div class="item-meta">完成于 {{ fmtTime(item.completeTime) }}</div>
        </div>
      </template>
      <el-empty v-else-if="searched" description="没有找到相似的历史工单" :image-size="80" />
      <el-empty v-else description="输入关键词,搜索已解决的历史工单" :image-size="80" />
    </div>
  </div>
</template>

<style scoped>
.search-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.results {
  min-height: 160px;
}
.item {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-bottom: 10px;
}
.item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.item-title {
  font-weight: 600;
}
.item-desc {
  margin-top: 6px;
  color: #6b7280;
  font-size: 13px;
  white-space: pre-wrap;
}
.item-resolution {
  margin-top: 8px;
  padding: 8px 10px;
  background: #f0f9eb;
  border-radius: 4px;
  font-size: 13px;
  white-space: pre-wrap;
  line-height: 1.6;
}
.item-resolution .label {
  font-weight: 600;
  color: #529b2e;
}
.item-meta {
  margin-top: 6px;
  color: #8a94a6;
  font-size: 12px;
}
</style>
