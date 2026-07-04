import request from '@/utils/request'

// 知识库问答:后端 /rag/ask 是裸 String 参数(非 @RequestBody),message 必须走 query 参数。
// 单独放宽超时到 60s:大模型生成比普通 CRUD 慢得多,用全局 15s 会误判为超时。
export function askKnowledge(message) {
  return request.post('/rag/ask', null, { params: { message }, timeout: 60000 })
}
