<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createWorkOrder, getWorkOrder, updateDraft } from '@/api/workorder'
import { PRIORITY_OPTIONS } from '@/constants/workOrder'

const route = useRoute()
const router = useRouter()
// 用 computed,组件实例被复用(新建↔编辑、编辑→编辑)时随路由更新
const woId = computed(() => route.params.id)
const isEdit = computed(() => !!woId.value)

const formRef = ref()
const loading = ref(false)
const form = ref({
  title: '',
  description: '',
  priority: 2,
})

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
}

async function loadForm() {
  if (!isEdit.value) {
    // 切回新建:重置表单
    form.value = { title: '', description: '', priority: 2 }
    return
  }
  const d = await getWorkOrder(woId.value)
  form.value = { title: d.title, description: d.description || '', priority: d.priority }
}

// 进入或 id 变化时(重新)加载;immediate 覆盖首次挂载
watch(woId, loadForm, { immediate: true })

// 新建:asSubmit 决定提交审核/存草稿;编辑:保存草稿
async function onSubmit(asSubmit) {
  // 校验失败直接 return,避免未捕获的 promise rejection
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    if (isEdit.value) {
      await updateDraft(woId.value, {
        title: form.value.title,
        description: form.value.description,
        priority: form.value.priority,
      })
      ElMessage.success('已保存')
      router.push(`/workorder/${woId.value}`)
    } else {
      await createWorkOrder({ ...form.value, submit: asSubmit })
      ElMessage.success(asSubmit ? '已提交审核' : '已保存草稿')
      router.push('/workorder/created')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-card>
    <template #header>{{ isEdit ? '编辑草稿' : '创建工单' }}</template>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" style="max-width: 600px">
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" placeholder="简要描述问题" clearable />
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input v-model="form.description" type="textarea" :rows="4" placeholder="详细说明(可选)" />
      </el-form-item>
      <el-form-item label="优先级" prop="priority">
        <el-select v-model="form.priority" placeholder="请选择">
          <el-option
            v-for="opt in PRIORITY_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <template v-if="isEdit">
          <el-button type="primary" :loading="loading" @click="onSubmit(false)">保存</el-button>
          <el-button @click="router.back()">返回</el-button>
        </template>
        <template v-else>
          <el-button :loading="loading" @click="onSubmit(false)">保存草稿</el-button>
          <el-button type="primary" :loading="loading" @click="onSubmit(true)">提交审核</el-button>
        </template>
      </el-form-item>
    </el-form>
  </el-card>
</template>
