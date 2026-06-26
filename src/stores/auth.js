import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const TOKEN_KEY = 'wo_token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const userInfo = ref(null)

  // 当前用户角色编码数组,如 ['SUBMITTER']
  const roleCodes = computed(() => (userInfo.value?.roles || []).map((r) => r.code))

  function hasRole(code) {
    return roleCodes.value.includes(code)
  }

  function hasAnyRole(codes) {
    return codes.some((c) => roleCodes.value.includes(c))
  }

  function setToken(t) {
    token.value = t
    localStorage.setItem(TOKEN_KEY, t)
  }

  function setUserInfo(info) {
    userInfo.value = info
  }

  function clear() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  return { token, userInfo, roleCodes, hasRole, hasAnyRole, setToken, setUserInfo, clear }
})
