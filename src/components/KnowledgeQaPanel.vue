<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { askKnowledge, getKbCatalog } from '@/api/kb'

const router = useRouter()

const question = ref('')
const loading = ref(false)
const answer = ref('')
const citations = ref([])
const asked = ref(false)

// 引用预览小框:点角标/标签先看内容,再决定是否新标签打开完整文档
const previewVisible = ref(false)
const previewCitation = ref(null)
const previewSection = ref(null)

// 目录缓存:预览按 sectionId 取条目内容,首次点击拉一次后复用
let catalogPromise = null
function ensureCatalog() {
  if (!catalogPromise) catalogPromise = getKbCatalog()
  return catalogPromise
}

// 模型输出按 Markdown 渲染;LLM 输出视为不可信输入,
// 先 DOMPurify 消毒再 v-html,防止生成的 HTML/脚本注入页面(XSS)。
// 消毒后把 [资料n] 原始标注替换成可点击的引用角标(只注入自有固定标记,n 为纯数字,无注入面)
const renderedAnswer = computed(() => {
  if (!answer.value) return ''
  const safe = DOMPurify.sanitize(marked.parse(answer.value, { breaks: true, async: false }))
  return safe.replace(
    /\[资料(\d+)\]/g,
    (_, n) => `<sup class="cite-badge" data-cite="${n}" title="查看引用资料">${n}</sup>`,
  )
})

// 事件委托:v-html 内容里的角标点击,按编号找到对应引用并跳转
function onAnswerClick(e) {
  const badge = e.target.closest('.cite-badge')
  if (!badge) return
  const index = Number(badge.dataset.cite)
  const citation = citations.value.find((c) => c.index === index)
  if (citation) openCitation(citation)
}

async function onAsk() {
  const q = question.value.trim()
  if (!q) return
  loading.value = true
  try {
    // 后端返回 { answer(含[资料n]标注), citations: [{index,title,sectionId}] }
    const res = await askKnowledge(q)
    answer.value = res?.answer || ''
    citations.value = res?.citations || []
    asked.value = true
  } finally {
    loading.value = false
  }
}

// 点引用 → 弹预览小框(不打断当前对话);完整文档走新标签页
async function openCitation(citation) {
  previewCitation.value = citation
  previewSection.value = null
  previewVisible.value = true
  if (!citation.sectionId) return
  try {
    const catalog = (await ensureCatalog()) || []
    previewSection.value =
      catalog.flatMap((c) => c.sections || []).find((s) => s.id === citation.sectionId) || null
  } catch {
    previewSection.value = null
  }
}

const renderedPreview = computed(() =>
  previewSection.value?.content
    ? DOMPurify.sanitize(marked.parse(previewSection.value.content, { breaks: true, async: false }))
    : '',
)

// 新标签页打开完整文档:保留当前对话,知识库页按 ?section= 定位
function openFullDoc() {
  const id = previewCitation.value?.sectionId
  if (!id) return
  const href = router.resolve({ path: '/knowledge', query: { section: id } }).href
  window.open(href, '_blank')
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
      <template v-if="answer">
        <div class="answer" v-html="renderedAnswer" @click="onAnswerClick" />
        <div v-if="citations.length" class="citations">
          <span class="citations-label">引用资料:</span>
          <el-tag
            v-for="c in citations"
            :key="c.index"
            class="citation-tag"
            type="info"
            effect="plain"
            @click="openCitation(c)"
          >
            [{{ c.index }}] {{ c.title }}
          </el-tag>
        </div>
      </template>
      <el-empty v-else-if="asked" description="没有得到回答" :image-size="80" />
      <el-empty v-else description="基于知识库文档回答你的问题" :image-size="80" />
    </div>

    <!-- 引用预览:先看条目内容,完整文档新标签打开(不丢当前对话) -->
    <el-dialog
      v-model="previewVisible"
      :title="previewCitation?.title || '引用资料'"
      width="min(560px, calc(100vw - 32px))"
      append-to-body
    >
      <div v-if="renderedPreview" class="preview-body" v-html="renderedPreview" />
      <el-empty v-else description="内容加载中或该条目不存在" :image-size="72" />
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" :disabled="!previewCitation?.sectionId" @click="openFullDoc">
          在新标签页打开完整文档 ↗
        </el-button>
      </template>
    </el-dialog>
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
.citations {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.citations-label {
  color: #8a94a6;
  font-size: 13px;
}
.citation-tag {
  cursor: pointer;
}
.citation-tag:hover {
  color: #1677ff;
  border-color: #1677ff;
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
/* 行内引用角标:蓝色上标小胶囊,和下方"引用资料"标签同一套编号 */
.answer :deep(.cite-badge) {
  display: inline-block;
  min-width: 16px;
  margin: 0 2px;
  padding: 0 4px;
  border-radius: 8px;
  background: #ecf3ff;
  color: #1677ff;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
  cursor: pointer;
  user-select: none;
}
.answer :deep(.cite-badge:hover) {
  background: #1677ff;
  color: #fff;
}
.preview-body {
  max-height: 50vh;
  overflow-y: auto;
  line-height: 1.8;
  font-size: 14px;
  color: #303846;
  white-space: normal;
}
.preview-body :deep(p) {
  margin: 0 0 10px;
}
.preview-body :deep(ol),
.preview-body :deep(ul) {
  margin: 4px 0 10px;
  padding-left: 20px;
}
.preview-body :deep(code) {
  background: #eef1f6;
  padding: 1px 5px;
  border-radius: 3px;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
}
</style>
