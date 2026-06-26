<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowRight, Lock, User } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { login, getInfo } from '@/api/user'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const formRef = ref()
const loading = ref(false)
const form = ref({
  username: '',
  password: '',
})

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function onSubmit() {
  // 校验失败直接 return,避免未捕获的 promise rejection
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    // 登录返回的 data 是 token 字符串本身
    const token = await login(form.value)
    auth.setToken(token)
    // 拉一次用户信息存起来
    const info = await getInfo()
    auth.setUserInfo(info)
    ElMessage.success('登录成功')
    router.replace(route.query.redirect || '/home')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <div class="login-shell">
      <section class="brand-panel">
        <div class="brand-head">
          <img class="brand-logo" src="/favicon.ico" alt="" />
          <div>
            <div class="brand-kicker">WORK ORDER SYSTEM</div>
            <h1>智能工单系统</h1>
          </div>
        </div>
        <div class="flow-preview" aria-hidden="true">
          <div class="flow-row">
            <span class="flow-dot is-blue" />
            <span class="flow-line is-long" />
            <span class="flow-pill" />
          </div>
          <div class="flow-row">
            <span class="flow-dot is-amber" />
            <span class="flow-line" />
            <span class="flow-pill is-muted" />
          </div>
          <div class="flow-row">
            <span class="flow-dot is-green" />
            <span class="flow-line is-mid" />
            <span class="flow-pill" />
          </div>
        </div>
      </section>

      <section class="form-panel">
        <div class="form-head">
          <h2>账号登录</h2>
          <p>请输入账号和密码进入系统</p>
        </div>
        <el-form ref="formRef" :model="form" :rules="rules" @keyup.enter="onSubmit">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              size="large"
              placeholder="账号"
              autocomplete="username"
              clearable
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              size="large"
              type="password"
              placeholder="密码"
              autocomplete="current-password"
              show-password
              clearable
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button class="login-button" type="primary" size="large" :loading="loading" @click="onSubmit">
              <span>登录</span>
              <el-icon v-if="!loading"><ArrowRight /></el-icon>
            </el-button>
          </el-form-item>
        </el-form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: grid;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background:
    linear-gradient(135deg, rgb(235 241 248 / 96%), rgb(248 250 252 / 94%) 48%, rgb(237 247 241 / 92%)),
    linear-gradient(90deg, rgb(15 31 46 / 6%) 1px, transparent 1px),
    linear-gradient(0deg, rgb(15 31 46 / 5%) 1px, transparent 1px);
  background-size: auto, 36px 36px, 36px 36px;
}

.login-shell {
  width: min(960px, 100%);
  min-height: 560px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  overflow: hidden;
  border: 1px solid #dce5ef;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 24px 70px rgb(24 39 75 / 14%);
}

.brand-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 48px;
  color: #fff;
  background:
    linear-gradient(145deg, rgb(10 27 43 / 96%), rgb(18 50 70 / 96%)),
    linear-gradient(90deg, rgb(255 255 255 / 8%) 1px, transparent 1px);
}

.brand-panel::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(120deg, transparent 0 46%, rgb(255 255 255 / 7%) 46% 47%, transparent 47%),
    linear-gradient(150deg, transparent 0 63%, rgb(65 180 125 / 16%) 63% 64%, transparent 64%);
  pointer-events: none;
}

.brand-head,
.flow-preview {
  position: relative;
  z-index: 1;
}

.brand-head {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand-logo {
  width: 48px;
  height: 48px;
  display: block;
  border-radius: 8px;
  box-shadow: 0 12px 28px rgb(15 23 42 / 14%);
  object-fit: contain;
}

.brand-kicker {
  margin-bottom: 6px;
  color: #8fd2b2;
  font-size: 12px;
}

.brand-head h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
}

.flow-preview {
  width: min(360px, 100%);
  padding: 22px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 8px;
  background: rgb(255 255 255 / 8%);
  backdrop-filter: blur(8px);
}

.flow-row {
  height: 44px;
  display: grid;
  grid-template-columns: 12px 1fr 54px;
  align-items: center;
  gap: 14px;
}

.flow-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.is-blue {
  background: #3b82f6;
}

.is-amber {
  background: #f59e0b;
}

.is-green {
  background: #22c55e;
}

.flow-line,
.flow-pill {
  height: 8px;
  border-radius: 999px;
  background: rgb(255 255 255 / 52%);
}

.flow-line {
  width: 72%;
}

.flow-line.is-long {
  width: 92%;
}

.flow-line.is-mid {
  width: 82%;
}

.flow-pill {
  width: 100%;
  background: rgb(143 210 178 / 72%);
}

.flow-pill.is-muted {
  background: rgb(255 255 255 / 34%);
}

.form-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px;
}

.form-head {
  margin-bottom: 28px;
}

.form-head h2 {
  margin: 0 0 8px;
  color: #172033;
  font-size: 24px;
  font-weight: 700;
}

.form-head p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.login-button {
  width: 100%;
  margin-top: 4px;
}

.login-button :deep(.el-button__content) {
  gap: 8px;
}

:deep(.el-input__wrapper) {
  min-height: 44px;
  border-radius: 6px;
}

@media (max-width: 820px) {
  .login-wrap {
    padding: 18px;
  }

  .login-shell {
    min-height: auto;
    grid-template-columns: 1fr;
  }

  .brand-panel {
    min-height: 220px;
    padding: 28px;
  }

  .flow-preview {
    display: none;
  }

  .form-panel {
    padding: 30px 24px 28px;
  }
}
</style>
