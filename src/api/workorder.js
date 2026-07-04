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

// 待派单工单(DISPATCHER,后端固定 PENDING_ASSIGN)
export function getDispatch(params) {
  return request.get('/workorder/dispatch', { params })
}

// 我负责的工单(HANDLER)
export function getAssigned(params) {
  return request.get('/workorder/assigned', { params })
}

// 首页工单统计(按当前用户角色返回相关待办数量)
export function getWorkOrderStats() {
  return request.get('/workorder/stats')
}

// 管理员查询全部工单
export function getAllWorkOrders(params) {
  return request.get('/workorder/list', { params })
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

// 派单:{ assigneeId, priority? }
export function assignWorkOrder(woId, data) {
  return request.put(`/workorder/${woId}/assign`, data)
}

// 转派:{ remark }
export function transferWorkOrder(woId, data) {
  return request.put(`/workorder/${woId}/transfer`, data)
}

// 接单人完成工单
export function completeWorkOrder(woId, data) {
  return request.put(`/workorder/${woId}/complete`, data)
}

// 相似历史工单搜索:{ query }(≤100字;返回已验收关闭的工单及当时的解决方案)
export function searchSimilar(data) {
  return request.post('/workorder/similar', data)
}
