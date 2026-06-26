// 侧边菜单配置(分组结构)。
// - 顶层项:有 children 为分组(el-sub-menu),否则为单项(el-menu-item)。
// - roles 为空 → 所有登录用户可见;否则需命中其中任一角色编码。
// - Layout 按当前用户角色过滤;某分组下子项被过滤光时,整组自动隐藏。
// 新增模块在对应分组的 children 里追加一项即可。
import { Document, EditPen, HomeFilled, Stamp, Tickets } from '@element-plus/icons-vue'

export const MENU = [
  { path: '/home', title: '首页', icon: HomeFilled },
  {
    title: '工单',
    icon: Tickets,
    children: [
      { path: '/workorder/create', title: '创建工单', icon: EditPen, roles: ['SUBMITTER'] },
      { path: '/workorder/created', title: '我创建的', icon: Document, roles: ['SUBMITTER'] },
      { path: '/workorder/review', title: '待我审核', icon: Stamp, roles: ['REVIEWER'] },
    ],
  },
]
