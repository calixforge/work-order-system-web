<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { getHandlers } from '@/api/user'
import {
  getWorkOrder,
  submitWorkOrder,
  withdrawWorkOrder,
  cancelWorkOrder,
  deleteDraft,
  acceptanceWorkOrder,
  reviewWorkOrder,
  assignWorkOrder,
  transferWorkOrder,
  completeWorkOrder,
} from '@/api/workorder'
import { statusTagType, priorityTagType, logTimelineType, PRIORITY_OPTIONS } from '@/constants/workOrder'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
// 用 computed,组件实例被复用(详情→详情、编辑→编辑)时 id 仍随路由更新
const woId = computed(() => route.params.id)
// 入口上下文:决定显示哪一组动作。多角色账号下,从派单池进来只该看到派单,
// 从"我创建的"进来才看到取消/撤回等提单人动作,避免跨入口越权显示。
const from = computed(() => route.query.from)

const loading = ref(false)
const acting = ref(false)
const detail = ref(null)
const assignVisible = ref(false)
const assignLoading = ref(false)
const handlers = ref([])
const assignFormRef = ref()
const assignForm = ref({
  assigneeId: '',
  priority: '',
})

const status = computed(() => detail.value?.status)
const isSubmitter = computed(() => auth.hasRole('SUBMITTER'))
const isReviewer = computed(() => auth.hasRole('REVIEWER'))
const isDispatcher = computed(() => auth.hasRole('DISPATCHER'))
const isHandler = computed(() => auth.hasRole('HANDLER'))

// 归属判断:多角色账号下,提单人动作只对“本人创建”的工单开放,
// 接单人动作只对“派给本人”的工单开放(后端按归属再校验一次)。
// 文档当前只列出 creatorName/assigneeName;若后端返回 id,优先用 id 比对。
const myId = computed(() => auth.userInfo?.id)
const myName = computed(() => auth.userInfo?.realName)
const isCreator = computed(() => {
  if (!detail.value) return false
  if (detail.value.creatorId != null && myId.value != null) {
    return Number(detail.value.creatorId) === Number(myId.value)
  }
  return Boolean(detail.value.creatorName && detail.value.creatorName === myName.value)
})
const isAssignee = computed(() => {
  if (!detail.value) return false
  if (detail.value.assigneeId != null && myId.value != null) {
    return Number(detail.value.assigneeId) === Number(myId.value)
  }
  return Boolean(detail.value.assigneeName && detail.value.assigneeName === myName.value)
})

// 提单人侧动作:仅"我创建的"入口 + 本人创建 + 对应状态(后端按归属/状态再校验一次)
const canEdit = computed(
  () => from.value === 'created' && isSubmitter.value && isCreator.value && status.value === 'DRAFT',
)
const canSubmit = computed(
  () => from.value === 'created' && isSubmitter.value && isCreator.value && status.value === 'DRAFT',
)
const canDelete = computed(
  () => from.value === 'created' && isSubmitter.value && isCreator.value && status.value === 'DRAFT',
)
const canWithdraw = computed(
  () =>
    from.value === 'created' &&
    isSubmitter.value &&
    isCreator.value &&
    ['PENDING_REVIEW', 'PENDING_ASSIGN'].includes(status.value),
)
const canCancel = computed(
  () =>
    from.value === 'created' &&
    isSubmitter.value &&
    isCreator.value &&
    ['PENDING_REVIEW', 'PENDING_ASSIGN'].includes(status.value),
)
const canAccept = computed(
  () =>
    from.value === 'created' && isSubmitter.value && isCreator.value && status.value === 'COMPLETED',
)

// 审核人侧:仅"待我审核"入口
const canReview = computed(
  () => from.value === 'review' && isReviewer.value && status.value === 'PENDING_REVIEW',
)
// 派单人侧:仅"待派单"入口
const canAssign = computed(
  () => from.value === 'dispatch' && isDispatcher.value && status.value === 'PENDING_ASSIGN',
)
// 接单人侧:仅"我负责的"入口 + 派给本人 + ACCEPTED
const canTransfer = computed(
  () =>
    from.value === 'assigned' && isHandler.value && isAssignee.value && status.value === 'ACCEPTED',
)
const canComplete = computed(
  () =>
    from.value === 'assigned' && isHandler.value && isAssignee.value && status.value === 'ACCEPTED',
)

const hasActions = computed(
  () =>
    canEdit.value ||
    canSubmit.value ||
    canDelete.value ||
    canWithdraw.value ||
    canCancel.value ||
    canAccept.value ||
    canReview.value ||
    canAssign.value ||
    canTransfer.value ||
    canComplete.value,
)

const assignRules = {
  assigneeId: [{ required: true, message: '请选择接单人', trigger: 'change' }],
}

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

// 执行动作 → 成功提示 → 刷新详情。
// 若动作后当前用户会失去该工单查看权(派单/转派),传 afterPath 跳到对应列表,
// 避免 reload 再次 GET 详情触发 403。
async function run(fn, okMsg, afterPath) {
  acting.value = true
  try {
    await fn()
    ElMessage.success(okMsg)
    if (afterPath) {
      router.replace(afterPath)
    } else {
      await load()
    }
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

async function loadHandlers(keyword = '') {
  assignLoading.value = true
  try {
    const res = await getHandlers({ pageNum: 1, pageSize: 20, keyword })
    handlers.value = res.list || []
  } catch {
    handlers.value = []
  } finally {
    assignLoading.value = false
  }
}

function openAssign() {
  assignForm.value = {
    assigneeId: '',
    priority: detail.value?.priority || '',
  }
  assignVisible.value = true
  loadHandlers()
}

async function onAssignSubmit() {
  const valid = await assignFormRef.value.validate().catch(() => false)
  if (!valid) return
  const payload = { assigneeId: assignForm.value.assigneeId }
  if (assignForm.value.priority) payload.priority = assignForm.value.priority
  try {
    // 派单后工单离开派单池,派单员失去查看权 → 跳回派单池
    await run(() => assignWorkOrder(woId.value, payload), '已派单', '/workorder/dispatch')
    assignVisible.value = false
  } catch {
    // request 拦截器已提示错误,弹窗保留方便用户调整后重试
  }
}

function onTransfer() {
  ElMessageBox.prompt('请填写转派原因', '转派工单', {
    inputType: 'textarea',
    inputValidator: (v) => (v && v.trim() ? true : '原因不能为空'),
  })
    .then(({ value }) =>
      run(() => transferWorkOrder(woId.value, { remark: value }), '已转回待派单', '/workorder/assigned'),
    )
    .catch(() => {})
}

function onComplete() {
  ElMessageBox.confirm('确认该工单已处理完成?', '完成工单', { type: 'success' })
    .then(() => run(() => completeWorkOrder(woId.value), '已标记完成'))
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
        <el-button v-if="canAssign" type="primary" :loading="acting" @click="openAssign">派单</el-button>
        <el-button v-if="canComplete" type="success" :loading="acting" @click="onComplete">完成</el-button>
        <el-button v-if="canTransfer" type="warning" :loading="acting" @click="onTransfer">转派</el-button>
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

    <el-dialog v-model="assignVisible" title="派单" width="min(520px, calc(100vw - 32px))">
      <el-form ref="assignFormRef" :model="assignForm" :rules="assignRules" label-width="90px">
        <el-form-item label="接单人" prop="assigneeId">
          <el-select
            v-model="assignForm.assigneeId"
            filterable
            remote
            reserve-keyword
            clearable
            placeholder="搜索接单人"
            :remote-method="loadHandlers"
            :loading="assignLoading"
            style="width: 100%"
          >
            <el-option
              v-for="user in handlers"
              :key="user.id"
              :label="`${user.realName} (${user.username})`"
              :value="user.id"
            >
              <span>{{ user.realName }}</span>
              <span class="handler-meta">{{ user.username }} / {{ user.departmentName || '未分配' }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="assignForm.priority" clearable placeholder="保持当前" style="width: 100%">
            <el-option
              v-for="opt in PRIORITY_OPTIONS"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignVisible = false">取消</el-button>
        <el-button type="primary" :loading="acting" @click="onAssignSubmit">确定派单</el-button>
      </template>
    </el-dialog>
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
.handler-meta {
  float: right;
  color: #8a94a6;
  font-size: 12px;
}
</style>
