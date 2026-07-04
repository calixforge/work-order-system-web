<script setup>
import { computed, ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { askKnowledge } from '@/api/rag'

const question = ref('')
const loading = ref(false)
const answer = ref('')
const asked = ref(false)

// 模型输出按 Markdown 渲染;LLM 输出视为不可信输入,
// 先 DOMPurify 消毒再 v-html,防止生成的 HTML/脚本注入页面(XSS)
const renderedAnswer = computed(() =>
  answer.value
    ? DOMPurify.sanitize(marked.parse(answer.value, { breaks: true, async: false }))
    : '',
)

async function onAsk() {
  const q = question.value.trim()
  if (!q) return
  loading.value = true
  try {
    // request 拦截器已解包 Result,直接拿到答案字符串(尾部含后端拼接的引用来源)
    answer.value = await askKnowledge(q)
    asked.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <div class="ask-row">
      <el-input
        v-model="question"
        type="textarea"
        :rows="2"
        maxlength="200"
        show-word-limit
        placeholder="基于知识库文档提问,如:打印机连不上网怎么办"
      />
      <el-button type="primary" :loading="loading" @click="onAsk">提问</el-button>
    </div>

    <div v-loading="loading" class="answer-area">
      <div v-if="answer" class="answer" v-html="renderedAnswer" />
      <el-empty v-else-if="asked" description="没有得到回答" :image-size="80" />
      <el-empty v-else description="基于知识库文档回答你的问题" :image-size="80" />
    </div>
  </div>
</template>

<style scoped>
.ask-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.answer-area {
  min-height: 160px;
}
.answer {
  line-height: 1.7;
  font-size: 14px;
  color: #333;
  background: #f7f9fc;
  border-radius: 6px;
  padding: 12px;
}
/* v-html 内容不吃 scoped 样式,用 :deep() 给渲染出的 Markdown 标签定样式 */
.answer :deep(p) {
  margin: 0 0 8px;
}
.answer :deep(p:last-child) {
  margin-bottom: 0;
}
.answer :deep(ol),
.answer :deep(ul) {
  margin: 4px 0 8px;
  padding-left: 20px;
}
.answer :deep(li) {
  margin: 2px 0;
}
.answer :deep(code) {
  background: #eef1f6;
  padding: 1px 5px;
  border-radius: 3px;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
}
.answer :deep(strong) {
  font-weight: 600;
}
</style>
