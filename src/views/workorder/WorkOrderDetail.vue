<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import {
  getWorkOrder,
  submitWorkOrder,
  withdrawWorkOrder,
  cancelWorkOrder,
  deleteDraft,
  acceptanceWorkOrder,
  reviewWorkOrder,
} from '@/api/workorder'
import { statusTagType, priorityTagType, logTimelineType } from '@/constants/workOrder'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
// 用 computed,组件实例被复用(详情→详情、编辑→编辑)时 id 仍随路由更新
const woId = computed(() => route.params.id)

const loading = ref(false)
const acting = ref(false)
const detail = ref(null)

const status = computed(() => detail.value?.status)
const isSubmitter = computed(() => auth.hasRole('SUBMITTER'))
const isReviewer = computed(() => auth.hasRole('REVIEWER'))

// 提单人侧动作按状态显隐(后端按归属/状态再校验一次)
const canEdit = computed(() => isSubmitter.value && status.value === 'DRAFT')
const canSubmit = computed(() => isSubmitter.value && status.value === 'DRAFT')
const canDelete = computed(() => isSubmitter.value && status.value === 'DRAFT')
const canWithdraw = computed(() => isSubmitter.value && status.value === 'PENDING_REVIEW')
const canCancel = computed(
  () => isSubmitter.value && ['PENDING_REVIEW', 'PENDING_ASSIGN'].includes(status.value),
)
const canAccept = computed(() => isSubmitter.value && status.value === 'COMPLETED')

// 审核人侧
const canReview = computed(() => isReviewer.value && status.value === 'PENDING_REVIEW')

const hasActions = computed(
  () =>
    canEdit.value ||
    canSubmit.value ||
    canDelete.value ||
    canWithdraw.value ||
    canCancel.value ||
    canAccept.value ||
    canReview.value,
)

async function load() {
  loading.value = true
  try {
    detail.value = await getWorkOrder(woId.value)
  } finally {
    loading.value = false
  }
}

// "2026-06-18T10:30:00" → "2026-06-18 10:30:00"
function fmtTime(t) {
  return t ? t.replace('T', ' ') : '-'
}

// 执行动作 → 成功提示 → 刷新详情
async function run(fn, okMsg) {
  acting.value = true
  try {
    await fn()
    ElMessage.success(okMsg)
    await load()
  } finally {
    acting.value = false
  }
}

function onEdit() {
  router.push(`/workorder/${woId.value}/edit`)
}

function onSubmitWo() {
  ElMessageBox.confirm('确定提交审核?', '提示', { type: 'warning' })
    .then(() => run(() => submitWorkOrder(woId.value), '已提交审核'))
    .catch(() => {})
}

function onWithdraw() {
  ElMessageBox.confirm('撤回后工单回到草稿,确定?', '提示', { type: 'warning' })
    .then(() => run(() => withdrawWorkOrder(woId.value), '已撤回'))
    .catch(() => {})
}

function onCancel() {
  ElMessageBox.prompt('请填写取消原因', '取消工单', {
    inputType: 'textarea',
    inputValidator: (v) => (v && v.trim() ? true : '原因不能为空'),
  })
    .then(({ value }) => run(() => cancelWorkOrder(woId.value, { remark: value }), '已取消'))
    .catch(() => {})
}

function onDelete() {
  ElMessageBox.confirm('删除后不可恢复,确定删除该草稿?', '提示', { type: 'warning' })
    .then(async () => {
      acting.value = true
      try {
        await deleteDraft(woId.value)
        ElMessage.success('已删除')
        router.replace('/workorder/created')
      } finally {
        acting.value = false
      }
    })
    .catch(() => {})
}

function onAccept() {
  ElMessageBox.confirm('确认验收通过?通过后工单关闭。', '验收', { type: 'success' })
    .then(() => run(() => acceptanceWorkOrder(woId.value, { event: 'ACCEPT' }), '已验收通过'))
    .catch(() => {})
}

function onRework() {
  ElMessageBox.prompt('请填写退回原因', '退回返工', {
    inputType: 'textarea',
    inputValidator: (v) => (v && v.trim() ? true : '原因不能为空'),
  })
    .then(({ value }) =>
      run(() => acceptanceWorkOrder(woId.value, { event: 'REJECT_REWORK', remark: value }), '已退回返工'),
    )
    .catch(() => {})
}

function onReviewPass() {
  ElMessageBox.confirm('确认审核通过?通过后进入待派单。', '审核', { type: 'success' })
    .then(() => run(() => reviewWorkOrder(woId.value, { event: 'REVIEW_PASS' }), '已通过'))
    .catch(() => {})
}

function onReviewReject() {
  ElMessageBox.prompt('请填写驳回原因', '驳回', {
    inputType: 'textarea',
    inputValidator: (v) => (v && v.trim() ? true : '原因不能为空'),
  })
    .then(({ value }) =>
      run(() => reviewWorkOrder(woId.value, { event: 'REVIEW_REJECT', remark: value }), '已驳回'),
    )
    .catch(() => {})
}

// id 变化(同组件实例复用)时重新拉取
watch(woId, load)
onMounted(load)
</script>

<template>
  <el-card v-loading="loading">
    <template #header>
      <div class="header">
        <el-button link @click="router.back()">
          <el-icon><ArrowLeft /></el-icon>返回
        </el-button>
        <span class="title">工单详情</span>
      </div>
    </template>

    <template v-if="detail">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="工单号">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="标题">{{ detail.title }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTagType(detail.status)">{{ detail.statusDesc }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="优先级">
          <el-tag :type="priorityTagType(detail.priority)">{{ detail.priorityDesc }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建人">{{ detail.creatorName }}</el-descriptions-item>
        <el-descriptions-item label="接单人">{{ detail.assigneeName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ detail.departmentName }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ fmtTime(detail.createTime) }}</el-descriptions-item>
        <el-descriptions-item label="完成时间">{{ fmtTime(detail.completeTime) }}</el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ detail.description || '-' }}</el-descriptions-item>
      </el-descriptions>

      <div v-if="hasActions" class="actions">
        <el-button v-if="canEdit" @click="onEdit">编辑</el-button>
        <el-button v-if="canSubmit" type="primary" :loading="acting" @click="onSubmitWo">提交审核</el-button>
        <el-button v-if="canWithdraw" :loading="acting" @click="onWithdraw">撤回</el-button>
        <el-button v-if="canCancel" type="warning" :loading="acting" @click="onCancel">取消工单</el-button>
        <el-button v-if="canAccept" type="success" :loading="acting" @click="onAccept">验收通过</el-button>
        <el-button v-if="canAccept" type="danger" :loading="acting" @click="onRework">退回返工</el-button>
        <el-button v-if="canReview" type="success" :loading="acting" @click="onReviewPass">审核通过</el-button>
        <el-button v-if="canReview" type="danger" :loading="acting" @click="onReviewReject">驳回</el-button>
        <el-button v-if="canDelete" type="danger" plain :loading="acting" @click="onDelete">删除草稿</el-button>
      </div>

      <el-divider content-position="left">流转日志</el-divider>
      <el-timeline v-if="detail.logs && detail.logs.length">
        <el-timeline-item
          v-for="log in detail.logs"
          :key="log.id"
          :type="logTimelineType(log)"
          :hollow="false"
          :timestamp="fmtTime(log.createTime)"
        >
          <span class="log-op">{{ log.operatorName }}</span>
          <span class="log-event">{{ log.eventDesc }}</span>
          <span v-if="log.fromStatusDesc" class="log-flow">
            {{ log.fromStatusDesc }} → {{ log.toStatusDesc }}
          </span>
          <div v-if="log.remark" class="log-remark">备注:{{ log.remark }}</div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无流转记录" :image-size="80" />
    </template>
  </el-card>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.title {
  font-weight: bold;
}
.actions {
  margin: 20px 0 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.log-op {
  font-weight: 600;
  margin-right: 8px;
}
.log-flow {
  margin-left: 8px;
  color: #8a94a6;
}
.log-remark {
  margin-top: 4px;
  color: #6b7280;
}
</style>
