// 工单状态 / 优先级 / 流转事件的字典与标签配色。
// 以 docs/前端联调契约.md 第 7 节「枚举字典」为准:
//   - 行内展示用后端的 statusDesc / priorityDesc / eventDesc,不在此写死中文;
//   - 这里的「编码全集」只服务筛选下拉,「建议色」是纯前端配色(可调)。

// 状态编码 → 中文,用于筛选下拉
export const STATUS_OPTIONS = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'PENDING_REVIEW', label: '待审核' },
  { value: 'PENDING_ASSIGN', label: '待派单' },
  { value: 'ACCEPTED', label: '已接单' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CLOSED', label: '已关闭' },
  { value: 'CANCELED', label: '已取消' },
]

// el-tag type:状态配色
const STATUS_TAG = {
  DRAFT: 'info',
  PENDING_REVIEW: 'warning',
  PENDING_ASSIGN: 'warning',
  ACCEPTED: 'primary',
  COMPLETED: 'success',
  CLOSED: 'info',
  CANCELED: 'danger',
}

export function statusTagType(status) {
  return STATUS_TAG[status] || 'info'
}

// 优先级:1 高 / 2 中 / 3 低
export const PRIORITY_OPTIONS = [
  { value: 1, label: '高' },
  { value: 2, label: '中' },
  { value: 3, label: '低' },
]

const PRIORITY_TAG = { 1: 'danger', 2: 'warning', 3: 'info' }

export function priorityTagType(priority) {
  return PRIORITY_TAG[priority] || 'info'
}

// 流转日志节点配色:先按事件语义,认不出的事件回退到目标状态,保证节点不发灰。
// 契约第 7 节共 10 个事件(⚠️ 无 CREATE,创建草稿不落日志)。
// el-timeline-item 的 type 取值:primary / success / warning / danger / info
const EVENT_TYPE = {
  SUBMIT: 'primary',
  REVIEW_PASS: 'success',
  REVIEW_REJECT: 'danger',
  ASSIGN: 'primary',
  TRANSFER: 'warning',
  COMPLETE: 'success',
  ACCEPT: 'success',
  REJECT_REWORK: 'danger',
  CANCEL: 'danger',
  WITHDRAW: 'warning',
}

const STATUS_TIMELINE_TYPE = {
  DRAFT: 'warning',
  PENDING_REVIEW: 'primary',
  PENDING_ASSIGN: 'primary',
  ACCEPTED: 'primary',
  COMPLETED: 'success',
  CLOSED: 'success',
  CANCELED: 'danger',
}

export function logTimelineType(log) {
  return EVENT_TYPE[log.event] || STATUS_TIMELINE_TYPE[log.toStatus] || 'primary'
}
