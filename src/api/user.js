import request from '@/utils/request'

// 登录,返回 data 是 token 字符串本身
export function login(data) {
  return request.post('/user/login', data)
}

// 当前登录用户信息
export function getInfo() {
  return request.get('/user/info')
}

// 登出
export function logout() {
  return request.post('/user/logout')
}

// 修改自己的密码,成功后后端会失效当前登录态
export function changePassword(data) {
  return request.put('/user/password', data)
}

// 派单候选人(启用且拥有 HANDLER 角色)
export function getHandlers(params) {
  return request.get('/user/handlers', { params })
}

// 管理员查询用户列表
export function getUserList(params) {
  return request.get('/user/list', { params })
}

// 管理员创建用户
export function createUser(data) {
  return request.post('/user', data)
}

// 管理员查询用户详情
export function getUser(userId) {
  return request.get(`/user/${userId}`)
}

// 管理员编辑用户基础信息
export function updateUser(userId, data) {
  return request.put(`/user/${userId}`, data)
}

// 管理员停用用户
export function disableUser(userId) {
  return request.put(`/user/${userId}/disable`)
}

// 管理员启用用户
export function enableUser(userId) {
  return request.put(`/user/${userId}/enable`)
}

// 管理员重置用户密码
export function resetUserPassword(userId, data) {
  return request.put(`/user/${userId}/reset-password`, data)
}
