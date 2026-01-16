<script setup lang="ts">
import { pgnService } from '@/services/PgnService'
import { useStudyStore, type StudyChapter } from '@/stores/study.store'
import { useUiStore } from '@/stores/ui.store'
import { nextTick, ref } from 'vue'
import ChapterTemplateModal from './ChapterTemplateModal.vue'

import { pgnParserService } from '@/services/PgnParserService'

const studyStore = useStudyStore()
const uiStore = useUiStore()
const showInput = ref(false)
const showImport = ref(false)
const showTemplateModal = ref(false)
const newChapterName = ref('')
const pgnInput = ref('')
const editingId = ref<string | null>(null)

defineProps<{
  collapsed?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()

const handleImport = () => {
  if (pgnInput.value.trim()) {
    try {
      const { tags, root } = pgnParserService.parse(pgnInput.value);
      let name = tags['Event'] || 'Imported Chapter';
      if (tags['White'] && tags['Black']) {
        name = `${tags['White']} - ${tags['Black']}`;
      }
      const chapterId = studyStore.createChapter(name);
      const chapter = studyStore.chapters.find(c => c.id === chapterId);
      if (chapter) {
        chapter.root = root;
        chapter.tags = tags;
        studyStore.setActiveChapter(chapterId);
      }
      pgnInput.value = '';
      showImport.value = false;
    } catch (e) {
      alert('Failed to parse PGN');
      console.error(e);
    }
  }
}
const editName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)
const editInput = ref<HTMLInputElement | null>(null)

const selectedColor = ref<'white' | 'black'>('white')

const handleCreate = () => {
  if (newChapterName.value.trim()) {
    studyStore.createChapter(newChapterName.value, undefined, selectedColor.value)
    newChapterName.value = ''
    showInput.value = false
  }
}

const toggleCreate = async () => {
  showInput.value = !showInput.value
  if (showInput.value) {
    await nextTick()
    nameInput.value?.focus()
  }
}

const selectChapter = (id: string) => {
  if (editingId.value === id) return
  studyStore.setActiveChapter(id)
}

const startEdit = async (chapter: StudyChapter) => {
  editingId.value = chapter.id
  editName.value = chapter.name
  await nextTick()
  editInput.value?.focus()
}

const finishEdit = () => {
  if (editingId.value && editName.value.trim()) {
    studyStore.updateChapterMetadata(editingId.value, { name: editName.value.trim() })
  }
  editingId.value = null
}

const cancelEdit = () => {
  editingId.value = null
}

const confirmDelete = async (chapter: StudyChapter) => {
  const result = await uiStore.showConfirmation(
    'Delete Chapter',
    `Are you sure you want to delete "${chapter.name}"? This action cannot be undone.`
  )
  if (result === 'confirm') {
    studyStore.deleteChapter(chapter.id)
  }
}

const downloadChapter = (chapter: StudyChapter) => {
  const currentRoot = pgnService.getRootNode();
  const currentPath = pgnService.getCurrentPath();

  pgnService.setRoot(chapter.root);
  const pgn = pgnService.getFullPgn(chapter.tags);

  // Restore
  pgnService.setRoot(currentRoot, currentPath);

  const blob = new Blob([pgn], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${chapter.name.replace(/\s+/g, '_')}.pgn`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="study-sidebar" :class="{ collapsed }">
    <div class="chapters-header">
      <h3>Chapters</h3>
      <div class="header-actions">
        <button @click="emit('toggle')" class="toggle-btn" :title="collapsed ? 'Expand' : 'Collapse'">
          {{ collapsed ? '▼' : '▲' }}
        </button>
        <template v-if="!collapsed">
          <button @click="showTemplateModal = true" class="template-btn" title="Create from Template">📚</button>
          <button @click="showImport = !showImport; showInput = false" class="import-btn" title="Import PGN">📥</button>
          <button @click="toggleCreate(); showImport = false" class="add-btn" title="New Chapter">+</button>
        </template>
      </div>
    </div>

    <ChapterTemplateModal v-if="!collapsed" v-model:show="showTemplateModal" />

    <div v-if="showInput && !collapsed" class="new-chapter-form">
      <input v-model="newChapterName" placeholder="Chapter Name" @keyup.enter="handleCreate" ref="nameInput" />
      <div class="color-selector">
        <button :class="{ active: selectedColor === 'white' }" @click="selectedColor = 'white'"
          title="Repertoire for White">White</button>
        <button :class="{ active: selectedColor === 'black' }" @click="selectedColor = 'black'"
          title="Repertoire for Black">Black</button>
      </div>
      <div class="form-actions">
        <button @click="handleCreate" class="submit-btn highlight">Create</button>
        <button @click="showInput = false" class="cancel-btn">Cancel</button>
      </div>
    </div>

    <div v-if="showImport && !collapsed" class="import-pgn-form">
      <textarea v-model="pgnInput" placeholder="Paste PGN here..." rows="5"></textarea>
      <div class="form-actions">
        <button @click="handleImport" class="submit-btn highlight">Load PGN</button>
        <button @click="showImport = false" class="cancel-btn">Cancel</button>
      </div>
    </div>

    <ul v-if="!collapsed" class="chapter-list">
      <li v-for="(chapter, index) in studyStore.chapters" :key="chapter.id"
        :class="{ active: studyStore.activeChapterId === chapter.id, editing: editingId === chapter.id }"
        @click="selectChapter(chapter.id)">

        <div v-if="editingId === chapter.id" class="edit-wrapper">
          <input v-model="editName" @keyup.enter="finishEdit" @keyup.esc="cancelEdit" @blur="finishEdit"
            ref="editInput" />
        </div>

        <template v-else>
          <div class="chapter-info">
            <span class="chapter-num">{{ index + 1 }}</span>
            <span class="chapter-name" :title="chapter.name">{{ chapter.name }}</span>
          </div>
          <div class="chapter-actions">
            <button @click.stop="downloadChapter(chapter)" class="download-btn" title="Download PGN">💾</button>
            <button @click.stop="startEdit(chapter)" class="edit-btn" title="Rename">✏️</button>
            <button @click.stop="confirmDelete(chapter)" class="delete-btn" title="Delete">×</button>
          </div>
        </template>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.study-sidebar {
  height: auto;
  max-height: 300px;
  display: flex;
  flex-direction: column;
  color: var(--color-text-primary, #ccc);
}

.chapters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--color-border, #444);
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.add-btn,
.test-btn,
.template-btn,
.toggle-btn,
.import-btn {
  background: none;
  border: none;
  color: var(--color-text-primary);
  font-size: 1.2em;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.add-btn:hover,
.test-btn:hover,
.template-btn:hover,
.toggle-btn:hover,
.import-btn:hover {
  opacity: 1;
}

.study-sidebar.collapsed {
  height: auto;
  flex: 0 0 auto;
}

.import-pgn-form {
  padding: 10px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.import-pgn-form textarea {
  width: 100%;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  color: white;
  padding: 8px;
  font-family: monospace;
  font-size: 0.85em;
  resize: vertical;
  margin-bottom: 10px;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.submit-btn,
.cancel-btn {
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  border: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
  color: white;
}

.submit-btn.highlight {
  background: var(--color-accent-primary);
  border-color: var(--color-accent-primary);
}

.test-btn {
  font-size: 1em;
}

.new-chapter-form {
  padding: 5px;
}

.new-chapter-form input {
  width: 100%;
  padding: 4px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  color: white;
  margin-bottom: 8px;
}

.color-selector {
  display: flex;
  gap: 5px;
  margin-bottom: 8px;
}

.color-selector button {
  flex: 1;
  padding: 4px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: white;
  cursor: pointer;
  font-size: 0.8em;
  border-radius: 4px;
}

.color-selector button.active {
  background: var(--color-accent-primary);
  border-color: var(--color-accent-primary);
}

.chapter-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.chapter-list li {
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border-hover, #333);
}

.chapter-list li:hover {
  background-color: var(--color-bg-tertiary, #2a2a2a);
}

.chapter-list li.active {
  background-color: var(--color-accent-primary, #369a3c);
  color: white;
}

.chapter-info {
  display: flex;
  gap: 8px;
  overflow: hidden;
}

.chapter-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chapter-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.chapter-list li:hover .chapter-actions,
.chapter-list li.active .chapter-actions {
  opacity: 1;
}

.delete-btn,
.edit-btn,
.download-btn {
  background: none;
  border: none;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  font-size: 0.9em;
  padding: 2px 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn {
  font-size: 1.2em;
}

.delete-btn:hover,
.edit-btn:hover,
.download-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.edit-wrapper {
  width: 100%;
}

.edit-wrapper input {
  width: 100%;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-accent-primary);
  color: white;
  padding: 2px 4px;
  font-size: 0.9em;
}

.chapter-list li.editing {
  background: var(--color-bg-secondary);
}
</style>
