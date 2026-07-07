<script setup>
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { askAssistantStream, getKbCatalog } from '@/api/kb'

const router = useRouter()

const question = ref('')
const loading = ref(false)
const messages = ref([])
const messageListRef = ref(null)
let messageIdSeed = 0

// 引用预览小框:点引用标记先看内容,多个资料可在弹窗顶部切换
const previewVisible = ref(false)
const previewCitations = ref([])
const previewSections = ref([])
const previewActiveIndex = ref(0)

const previewCitation = computed(() => previewCitations.value[previewActiveIndex.value] || null)
const previewSection = computed(() => previewSections.value[previewActiveIndex.value] || null)

// 目录缓存:预览按 sectionId 取条目内容,首次点击拉一次后复用
let catalogPromise = null
function ensureCatalog() {
  if (!catalogPromise) catalogPromise = getKbCatalog()
  return catalogPromise
}

// 模型输出按 Markdown 渲染;LLM 输出视为不可信输入,
// 先 DOMPurify 消毒再 v-html,防止生成的 HTML/脚本注入页面(XSS)。
function uniqueIndexes(indexes) {
  return [...new Set(indexes)]
}

const LINK_ICON_HTML =
  '<svg class="cite-link-icon" viewBox="0 0 1024 1024" aria-hidden="true"><path fill="currentColor" d="M715.648 625.152 670.4 579.904l90.496-90.56c75.008-74.944 85.12-186.368 22.656-248.896-62.528-62.464-173.952-52.352-248.96 22.656L444.16 353.6l-45.248-45.248 90.496-90.496c100.032-99.968 251.968-110.08 339.456-22.656 87.488 87.488 77.312 239.424-22.656 339.456l-90.496 90.496zm-90.496 90.496-90.496 90.496C434.624 906.112 282.688 916.224 195.2 828.8c-87.488-87.488-77.312-239.424 22.656-339.456l90.496-90.496 45.248 45.248-90.496 90.56c-75.008 74.944-85.12 186.368-22.656 248.896 62.528 62.464 173.952 52.352 248.96-22.656l90.496-90.496zm0-362.048 45.248 45.248L398.848 670.4 353.6 625.152z"></path></svg>'

function citationDisplaySuffix(indexes) {
  return indexes.length > 1 ? `<span class="cite-badge-suffix">+${indexes.length}</span>` : ''
}

// 消毒后把连续 [资料n] 原始标注合并成一个可点击引用标记(只注入自有固定标记,n 为纯数字,无注入面)
function renderAnswer(content, messageId) {
  if (!content) return ''
  const safe = DOMPurify.sanitize(marked.parse(content, { breaks: true, async: false }))
  return safe.replace(
    /(?:\[资料\d+\]\s*)+/g,
    (matched) => {
      const indexes = uniqueIndexes([...matched.matchAll(/\[资料(\d+)\]/g)].map((m) => m[1]))
      return `<span class="cite-badge" data-message-id="${messageId}" data-cites="${indexes.join(',')}" title="查看引用资料">${LINK_ICON_HTML}${citationDisplaySuffix(indexes)}</span>`
    },
  )
}

// 事件委托:v-html 内容里的引用标记点击,按编号找到对应引用并弹窗预览
function findCitationBadge(target) {
  let node = target
  while (node && node !== document) {
    if (node.classList?.contains('cite-badge')) {
      return node
    }
    node = node.parentNode
  }
  return null
}

function onAnswerPointerDown(e) {
  const badge = findCitationBadge(e.target)
  if (!badge) return
  e.preventDefault()
  const indexes = (badge.dataset.cites || '')
    .split(',')
    .map((n) => Number(n))
    .filter(Boolean)
  const message = messages.value.find((item) => String(item.id) === String(badge.dataset.messageId))
  if (!message) return
  const selected = indexes
    .map((index) => message.citations.find((c) => c.index === index) || message.sources.find((c) => c.index === index))
    .filter(Boolean)
  if (!selected.length && message.loading) {
    ElMessage.info('引用资料正在加载')
    return
  }
  if (selected.length) openCitations(selected.map((item) => ({ ...item })))
}

function scrollToBottom() {
  nextTick(() => {
    const el = messageListRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

async function onAsk() {
  const q = question.value.trim()
  if (!q || loading.value) return
  const userMessage = {
    id: ++messageIdSeed,
    role: 'user',
    content: q,
  }
  const assistantMessage = {
    id: ++messageIdSeed,
    role: 'assistant',
    content: '',
    sources: [],
    citations: [],
    loading: true,
  }
  messages.value.push(userMessage, assistantMessage)
  const assistantIndex = messages.value.length - 1
  question.value = ''
  scrollToBottom()
  loading.value = true
  try {
    await askAssistantStream(q, {
      onAnswer: (delta) => {
        messages.value[assistantIndex].content += delta
        scrollToBottom()
      },
      onSources: (items) => {
        messages.value[assistantIndex].sources = items || []
      },
      onCitations: (items) => {
        messages.value[assistantIndex].citations = items || []
      },
    })
  } catch (error) {
    if (!messages.value[assistantIndex].content) {
      ElMessage.error(error?.message || '回答生成失败,请稍后重试')
    } else {
      ElMessage.warning('回答中断,已保留当前生成内容')
    }
  } finally {
    messages.value[assistantIndex].loading = false
    loading.value = false
  }
}

// 点引用 → 弹预览小框(不打断当前对话);完整文档走新标签页
async function openCitations(selectedCitations) {
  previewCitations.value = selectedCitations
  previewSections.value = []
  previewActiveIndex.value = 0
  previewVisible.value = true
  try {
    const catalog = (await ensureCatalog()) || []
    const sections = catalog.flatMap((c) => c.sections || [])
    previewSections.value = selectedCitations.map((citation) =>
      citation.sectionId ? sections.find((s) => s.id === citation.sectionId) || null : null,
    )
  } catch {
    previewSections.value = selectedCitations.map(() => null)
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
  <div class="qa-chat">
    <div ref="messageListRef" class="message-list">
      <div v-if="!messages.length" class="chat-empty">
        <img class="empty-avatar" src="/favicon.ico" alt="" />
        <div class="empty-title">工单助手</div>
        <div class="empty-desc">可查询 IT / OA 流程和常见问题</div>
      </div>

      <div
        v-for="message in messages"
        :key="message.id"
        class="message-row"
        :class="`message-${message.role}`"
      >
        <img v-if="message.role === 'assistant'" class="message-avatar assistant-avatar" src="/favicon.ico" alt="" />
        <div class="message-content">
          <template v-if="message.role === 'user'">
            <div class="message-bubble user-bubble">{{ message.content }}</div>
          </template>
          <template v-else>
            <div class="assistant-name">工单助手</div>
            <div class="message-bubble assistant-bubble">
              <div
                v-if="message.content"
                class="answer"
                v-html="renderAnswer(message.content, message.id)"
                @pointerdown="onAnswerPointerDown"
              />
              <div v-else class="thinking-loader" aria-label="思考中">
                <span />
                <span />
                <span />
              </div>
            </div>
            <div v-if="message.citations.length" class="citations">
              <span class="citations-label">引用资料:</span>
              <el-tag
                v-for="c in message.citations"
                :key="c.index"
                class="citation-tag"
                type="info"
                effect="plain"
                @click="openCitations([c])"
              >
                {{ c.title }}
              </el-tag>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="composer">
      <el-input
        v-model="question"
        class="composer-input"
        type="textarea"
        :rows="2"
        maxlength="200"
        show-word-limit
        resize="none"
        placeholder="输入你的问题,例如:VPN 连不上怎么办"
        @keydown.enter.exact.prevent="onAsk"
      />
      <button class="send-button" type="button" :disabled="loading || !question.trim()" @click="onAsk">
        <span v-if="loading" class="send-loading" />
        <span v-else class="send-arrow">↑</span>
      </button>
    </div>

    <!-- 引用预览:先看条目内容,完整文档新标签打开(不丢当前对话) -->
    <el-dialog
      v-model="previewVisible"
      title="引用资料"
      width="min(560px, calc(100vw - 32px))"
      append-to-body
    >
      <div v-if="previewCitations.length > 1" class="preview-tabs">
        <button
          v-for="(c, i) in previewCitations"
          :key="c.index"
          type="button"
          class="preview-tab"
          :class="{ active: i === previewActiveIndex }"
          @click="previewActiveIndex = i"
        >
          {{ c.title }}
        </button>
      </div>
      <div v-else-if="previewCitation" class="preview-title">{{ previewCitation.title }}</div>
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
.qa-chat {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}
.message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 14px;
  border: 1px solid #e8edf5;
  border-radius: 8px;
  background: #f7f9fc;
}
.chat-empty {
  height: 100%;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8a94a6;
  text-align: center;
}
.empty-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 0 1px #e8edf5;
}
.empty-title {
  margin-top: 10px;
  color: #303846;
  font-size: 16px;
  font-weight: 600;
}
.empty-desc {
  margin-top: 4px;
  font-size: 13px;
}
.message-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  align-items: flex-start;
}
.message-user {
  justify-content: flex-end;
}
.message-assistant {
  justify-content: flex-start;
}
.message-avatar {
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 50%;
  object-fit: cover;
}
.assistant-avatar {
  box-shadow: 0 0 0 1px #e8edf5;
}
.message-content {
  max-width: min(760px, 82%);
}
.message-user .message-content {
  display: flex;
  justify-content: flex-end;
}
.assistant-name {
  margin: 0 0 4px;
  color: #7b8794;
  font-size: 12px;
  line-height: 16px;
}
.message-bubble {
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}
.user-bubble {
  background: #1677ff;
  color: #fff;
  border-top-right-radius: 3px;
}
.assistant-bubble {
  background: #fff;
  border: 1px solid #e8edf5;
  color: #333;
  border-top-left-radius: 3px;
}
.composer {
  position: relative;
  flex: none;
  padding: 6px 44px 6px 10px;
  border: 1px solid #e8edf5;
  border-radius: 8px;
  background: #fff;
}
.composer-input {
  width: 100%;
}
.composer-input :deep(.el-textarea__inner) {
  padding-right: 36px;
  box-shadow: none;
}
.send-button {
  position: absolute;
  right: 10px;
  bottom: 8px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: #1677ff;
  color: #fff;
  cursor: pointer;
  transition:
    background 0.15s ease,
    opacity 0.15s ease;
}
.send-button:hover:not(:disabled) {
  background: #0f63d8;
}
.send-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.send-arrow {
  transform: translateY(-1px);
  font-size: 17px;
  font-weight: 700;
  line-height: 1;
}
.send-loading {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: send-spin 0.8s linear infinite;
}
@keyframes send-spin {
  to {
    transform: rotate(360deg);
  }
}
.answer {
  line-height: 1.7;
  font-size: 14px;
  color: #333;
}
.thinking-loader {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
}
.thinking-loader span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9aa6b2;
  animation: thinking-bounce 1s infinite ease-in-out;
}
.thinking-loader span:nth-child(2) {
  animation-delay: 0.15s;
}
.thinking-loader span:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes thinking-bounce {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
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
/* 行内引用入口:参考阿里云 AI 助手的 link badge,多资料时显示 +N */
.answer :deep(.cite-badge) {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  height: 16px;
  margin: 0 2px;
  padding: 0 5px;
  border: 1px solid #d5e6ff;
  border-radius: 9px;
  background: #f0f7ff;
  color: #2f6fdd;
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  cursor: pointer;
  user-select: none;
  vertical-align: text-bottom;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}
.answer :deep(.cite-badge:hover) {
  border-color: #9ec5ff;
  background: #e2f0ff;
  color: #165dcc;
}
.answer :deep(.cite-link-icon) {
  width: 13px;
  height: 13px;
  display: block;
  flex: none;
  pointer-events: none;
}
.answer :deep(.cite-link-icon *) {
  pointer-events: none;
}
.answer :deep(.cite-badge-suffix) {
  color: inherit;
  font-size: 11px;
  line-height: 16px;
  pointer-events: none;
}
.preview-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.preview-tab {
  max-width: 100%;
  padding: 5px 10px;
  border: 1px solid #d8e1f0;
  border-radius: 6px;
  background: #fff;
  color: #5f6b7a;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}
.preview-tab:hover,
.preview-tab.active {
  border-color: #1677ff;
  background: #ecf3ff;
  color: #1677ff;
}
.preview-title {
  margin-bottom: 12px;
  color: #303846;
  font-size: 14px;
  font-weight: 600;
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
