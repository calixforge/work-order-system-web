import request from '@/utils/request'

// 角色字典
export function getRoleList() {
  return request.get('/role/list')
}

// 给用户分配角色
export function assignRole(data) {
  return request.post('/role/assign', data)
}

// 剥夺用户角色
export function revokeRole(params) {
  return request.delete('/role/revoke', { params })
}
