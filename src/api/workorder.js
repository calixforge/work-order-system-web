import request from '@/utils/request'

// 创建工单(submit=true 直接提交审核,false 存草稿)
export function createWorkOrder(data) {
  return request.post('/workorder/create', data)
}

// 我创建的工单(分页 + keyword/status/priority 筛选)
export function getMyCreated(params) {
  return request.get('/workorder/created', { params })
}

// 待我审核(REVIEWER,后端固定 PENDING_REVIEW + 本部门)
export function getReview(params) {
  return request.get('/workorder/review', { params })
}

// 审核:{ event: 'REVIEW_PASS' | 'REVIEW_REJECT', remark? }(驳回时 remark 必填)
export function reviewWorkOrder(woId, data) {
  return request.put(`/workorder/${woId}/review`, data)
}

// 工单详情(含 description 与流转日志 logs)
export function getWorkOrder(woId) {
  return request.get(`/workorder/${woId}`)
}

// 编辑草稿(仅 DRAFT):{ title, description, priority }
export function updateDraft(woId, data) {
  return request.put(`/workorder/${woId}`, data)
}

// 删除草稿(仅 DRAFT)
export function deleteDraft(woId) {
  return request.delete(`/workorder/${woId}`)
}

// 提交审核(DRAFT → 待审核)
export function submitWorkOrder(woId) {
  return request.put(`/workorder/${woId}/submit`)
}

// 撤回(待审核 → 草稿)
export function withdrawWorkOrder(woId) {
  return request.put(`/workorder/${woId}/withdraw`)
}

// 取消:{ remark } 必填
export function cancelWorkOrder(woId, data) {
  return request.put(`/workorder/${woId}/cancel`, data)
}

// 验收:{ event: 'ACCEPT' | 'REJECT_REWORK', remark? }(返工时 remark 必填)
export function acceptanceWorkOrder(woId, data) {
  return request.put(`/workorder/${woId}/acceptance`, data)
}
