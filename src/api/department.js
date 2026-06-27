import request from '@/utils/request'

// 部门列表
export function getDepartmentList() {
  return request.get('/department/list')
}

// 部门详情
export function getDepartment(deptId) {
  return request.get(`/department/${deptId}`)
}

// 创建部门
export function createDepartment(data) {
  return request.post('/department', data)
}

// 编辑部门
export function updateDepartment(deptId, data) {
  return request.put(`/department/${deptId}`, data)
}

// 删除部门
export function deleteDepartment(deptId) {
  return request.delete(`/department/${deptId}`)
}
