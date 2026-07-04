<script setup>
import { ref } from 'vue'
import { ChatDotRound } from '@element-plus/icons-vue'
import KnowledgeQaPanel from '@/components/KnowledgeQaPanel.vue'
import SimilarWorkorderSearch from '@/components/SimilarWorkorderSearch.vue'

// 全局工单助手:登录后每页可见。两个能力同一入口、底层分开——
// 知识库问答走大模型(RAG),历史案例只走向量检索(不调大模型)。
const open = ref(false)
const tab = ref('qa')
</script>

<template>
  <el-button
    class="assistant-fab"
    type="primary"
    circle
    :icon="ChatDotRound"
    title="工单助手"
    @click="open = true"
  />

  <el-drawer v-model="open" title="工单助手" direction="rtl" size="min(480px, 100vw)">
    <el-tabs v-model="tab">
      <el-tab-pane label="知识库问答" name="qa">
        <KnowledgeQaPanel />
      </el-tab-pane>
      <el-tab-pane label="历史案例" name="similar">
        <SimilarWorkorderSearch />
      </el-tab-pane>
    </el-tabs>
  </el-drawer>
</template>

<style scoped>
.assistant-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 52px;
  height: 52px;
  font-size: 22px;
  box-shadow: 0 4px 12px rgb(22 119 255 / 40%);
  z-index: 2000;
}
</style>
