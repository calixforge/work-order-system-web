<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { ArrowDown, ArrowRight, Search } from '@element-plus/icons-vue'
import { getKbCatalog } from '@/api/kb'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const catalog = ref([])
const keyword = ref('')
const activeSectionId = ref('')
const expandedCategory = ref('')

const flatSections = computed(() =>
  catalog.value.flatMap((category) =>
    (category.sections || []).map((section) => ({
      ...section,
      category: category.category,
    })),
  ),
)

const activeSection = computed(() =>
  flatSections.value.find((section) => section.id === activeSectionId.value) || null,
)

const filteredCatalog = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return catalog.value

  return catalog.value
    .map((category) => {
      const categoryMatched = category.category.toLowerCase().includes(kw)
      const sections = (category.sections || []).filter(
        (section) =>
          categoryMatched ||
          section.title.toLowerCase().includes(kw) ||
          section.content.toLowerCase().includes(kw),
      )
      return { ...category, sections }
    })
    .filter((category) => category.sections.length)
})

const renderedContent = computed(() =>
  activeSection.value?.content
    ? DOMPurify.sanitize(marked.parse(activeSection.value.content, { breaks: true, async: false }))
    : '',
)

async function loadCatalog() {
  loading.value = true
  try {
    catalog.value = await getKbCatalog()
    await nextTick()
    selectInitialSection()
  } finally {
    loading.value = false
  }
}

function selectInitialSection() {
  const sectionId = route.query.section
  const target = flatSections.value.find((section) => section.id === sectionId)
  if (target) {
    expandedCategory.value = target.category
    selectSection(target.id, true)
  }
}

function selectSection(sectionId, replace = false) {
  const target = flatSections.value.find((section) => section.id === sectionId)
  if (target) expandedCategory.value = target.category
  activeSectionId.value = sectionId
  const location = { path: '/knowledge', query: { section: sectionId } }
  if (replace) {
    router.replace(location)
  } else {
    router.push(location)
  }
}

function toggleCategory(category) {
  expandedCategory.value = expandedCategory.value === category ? '' : category
}

watch(
  () => route.query.section,
  (sectionId) => {
    if (sectionId && sectionId !== activeSectionId.value) {
      const target = flatSections.value.find((section) => section.id === sectionId)
      if (target) {
        activeSectionId.value = sectionId
        expandedCategory.value = target.category
      }
    }
  },
)

onMounted(loadCatalog)
</script>

<template>
  <div class="knowledge-page" v-loading="loading">
    <aside class="catalog-panel">
      <div class="catalog-header">
        <h2>帮助中心</h2>
        <el-input
          v-model="keyword"
          class="catalog-search"
          clearable
          placeholder="搜索标题或内容"
          :prefix-icon="Search"
        />
      </div>

      <el-scrollbar class="catalog-scroll">
        <div v-if="loading" class="catalog-loading">
          <el-skeleton :rows="8" animated />
        </div>
        <div v-else-if="filteredCatalog.length" class="catalog-list">
          <section v-for="category in filteredCatalog" :key="category.category" class="catalog-group">
            <button type="button" class="category-title" @click="toggleCategory(category.category)">
              <el-icon class="category-arrow">
                <component :is="expandedCategory === category.category ? ArrowDown : ArrowRight" />
              </el-icon>
              <span>{{ category.category }}</span>
            </button>
            <div v-show="expandedCategory === category.category" class="section-list">
              <button
                v-for="section in category.sections"
                :key="section.id"
                type="button"
                class="section-item"
                :class="{ active: section.id === activeSectionId }"
                @click="selectSection(section.id)"
              >
                {{ section.title }}
              </button>
            </div>
          </section>
        </div>
        <el-empty v-else description="暂无匹配内容" :image-size="88" />
      </el-scrollbar>
    </aside>

    <main class="content-panel">
      <div v-if="loading" class="content-loading">
        <el-skeleton :rows="10" animated />
      </div>
      <template v-else-if="activeSection">
        <div class="content-head">
          <span class="section-category">{{ activeSection.category }}</span>
          <h1>{{ activeSection.title }}</h1>
        </div>
        <article class="markdown-body" v-html="renderedContent" />
      </template>
      <el-empty v-else description="请选择左侧条目查看内容" :image-size="108" />
    </main>
  </div>
</template>

<style scoped>
.knowledge-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 312px minmax(0, 1fr);
  gap: 0;
  background: #ffffff;
}

.catalog-panel,
.content-panel {
  min-height: 0;
}

.catalog-panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f7f9fc;
  border-right: 1px solid #e5ebf3;
}

.catalog-header {
  flex: none;
  padding: 22px 20px 18px;
  border-bottom: 1px solid #e8edf3;
}

.catalog-header h2 {
  margin: 0 0 14px;
  color: #172033;
  font-size: 20px;
  line-height: 1.3;
}

.catalog-search {
  width: 100%;
}

.catalog-scroll {
  flex: 1;
}

.catalog-list {
  padding: 14px 12px 22px;
}

.catalog-loading {
  padding: 18px 16px;
}

.catalog-group + .catalog-group {
  margin-top: 12px;
}

.category-title {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #202b3d;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.category-title:hover {
  background: #eef4ff;
  color: #155bd4;
}

.category-arrow {
  flex: none;
  font-size: 14px;
}

.section-list {
  position: relative;
  margin: 2px 0 4px 20px;
  padding: 4px 0 2px 12px;
}

.section-list::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 8px;
  width: 1px;
  background: #d8e1ee;
}

.section-item {
  width: 100%;
  min-height: 36px;
  display: block;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #536174;
  font-size: 13px;
  line-height: 1.45;
  text-align: left;
  cursor: pointer;
}

.section-item:hover {
  background: #eef4ff;
  color: #155bd4;
}

.section-item.active {
  background: #e7f0ff;
  color: #155bd4;
  font-weight: 600;
}

.content-panel {
  height: 100vh;
  overflow: auto;
  padding: 0;
  background: #ffffff;
}

.content-loading {
  max-width: 880px;
  margin: 0 auto;
  padding: 56px 64px 20px;
}

.content-head {
  max-width: 880px;
  padding: 56px 64px 20px;
  margin: 0 auto;
}

.section-category {
  display: block;
  margin-bottom: 10px;
  color: #6b778c;
  font-size: 13px;
  font-weight: 600;
}

.content-head h1 {
  margin: 0;
  color: #172033;
  font-size: 30px;
  line-height: 1.35;
  font-weight: 700;
}

.markdown-body {
  max-width: 880px;
  margin: 0 auto;
  padding: 10px 64px 72px;
  color: #2f3a4a;
  font-size: 16px;
  line-height: 1.9;
}

.markdown-body :deep(p) {
  margin: 0 0 18px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0 0 18px;
  padding-left: 22px;
}

.markdown-body :deep(li) {
  margin: 6px 0;
}

.markdown-body :deep(code) {
  padding: 2px 6px;
  border-radius: 4px;
  background: #f0f3f8;
  font-family: Consolas, Monaco, monospace;
  font-size: 14px;
}

@media (max-width: 900px) {
  .knowledge-page {
    height: auto;
    grid-template-columns: 1fr;
  }

  .catalog-panel {
    max-height: 360px;
  }

  .content-panel {
    min-height: 360px;
  }

  .content-head {
    padding: 28px 22px 16px;
  }

  .markdown-body {
    padding: 6px 22px 36px;
  }
}
</style>
