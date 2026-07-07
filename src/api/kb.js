import request from '@/utils/request'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

function dispatchSseEvent(rawEvent, handlers) {
  const lines = rawEvent.split('\n')
  let event = 'message'
  const data = []
  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      const value = line.slice(5)
      data.push(value.startsWith(' ') ? value.slice(1) : value)
    }
  }

  const payload = data.join('\n')
  if (event === 'answer') {
    handlers.onAnswer?.(payload)
  } else if (event === 'sources') {
    handlers.onSources?.(payload ? JSON.parse(payload) : [])
  } else if (event === 'citations') {
    handlers.onCitations?.(payload ? JSON.parse(payload) : [])
  } else if (event === 'done') {
    handlers.onDone?.()
  }
}

// POST SSE:问题放请求体里,避免出现在 URL;前端用 fetch reader 手动解析事件流
export async function askAssistantStream(question, handlers = {}) {
  const auth = useAuthStore()
  const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
  const response = await fetch(`${baseURL}/kb/ask/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
    body: JSON.stringify({ question }),
  })

  if (response.status === 401) {
    auth.clear()
    router.replace('/login')
    throw new Error('登录已失效,请重新登录')
  }
  if (!response.ok || !response.body) {
    throw new Error('智能问答请求失败')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')

    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      if (rawEvent.trim()) dispatchSseEvent(rawEvent, handlers)
      boundary = buffer.indexOf('\n\n')
    }
  }

  if (buffer.trim()) dispatchSseEvent(buffer, handlers)
}

// 知识库目录树(分类 → 条目,含内容与 id)
export function getKbCatalog() {
  return request.get('/kb/catalog')
}
