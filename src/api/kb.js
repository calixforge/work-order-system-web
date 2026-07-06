import request from '@/utils/request'

// 知识库问答:单独放宽超时到 60s,大模型生成比普通 CRUD 慢得多
export function askKnowledge(question) {
  return request.post('/kb/ask', { question }, { timeout: 60000 })
}

// 知识库目录树(分类 → 条目,含内容与 id)
export function getKbCatalog() {
  return request.get('/kb/catalog')
}
