import request from '@/utils/request'

// 管理员首页统计(全部工单/待审/待派/启用用户/停用用户/部门数)
export function getAdminStats() {
  return request.get('/admin/stats')
}
