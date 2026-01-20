<script setup lang="ts">
import { pgnService } from '@/services/PgnService'
import { useStudyStore, type StudyChapter } from '@/stores/study.store'
import { useUiStore } from '@/stores/ui.store'
import { nextTick, ref } from 'vue'
import ChapterTemplateModal from './ChapterTemplateModal.vue'


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

const handleImport = (color: 'white' | 'black') => {
  if (pgnInput.value.trim()) {
    try {
      studyStore.createChapterFromPgn(pgnInput.value, undefined, color)
      pgnInput.value = ''
      showImport.value = false
    } catch (e) {
      alert('Failed to parse PGN')
      console.error(e)
    }
  }
}
const editName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)
const editInput = ref<HTMLInputElement | null>(null)

const selectedColor = ref<'white' | 'black'>('white')

const handleCreateManual = () => {
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
      <h3 v-if="!collapsed">Chapters</h3>
      <div class="header-actions">
        <button @click="emit('toggle')" class="toggle-btn" :title="collapsed ? 'Expand' : 'Collapse'">
          {{ collapsed ? '▼' : '▲' }}
        </button>
        <template v-if="!collapsed">
          <button @click="showTemplateModal = true" class="template-btn" title="Create from Template">📚</button>
          <button @click="showImport = !showImport; showInput = false" class="import-btn" title="Import PGN">📥</button>
          <button @click="toggleCreate(); showImport = false" class="add-btn" title="New Chapter">
            <span class="plus-icon">＋</span>
          </button>
        </template>
      </div>
    </div>

    <ChapterTemplateModal v-if="!collapsed" v-model:show="showTemplateModal" />

    <div v-if="showInput && !collapsed" class="new-chapter-form">
      <input v-model="newChapterName" placeholder="Chapter Name" @keyup.enter="handleCreateManual" ref="nameInput" />
      <div class="color-selector">
        <button :class="{ active: selectedColor === 'white' }" @click="selectedColor = 'white'"
          title="Repertoire for White" class="white-btn">White</button>
        <button :class="{ active: selectedColor === 'black' }" @click="selectedColor = 'black'"
          title="Repertoire for Black" class="black-btn">Black</button>
      </div>
      <div class="form-actions">
        <button @click="handleCreateManual" class="submit-btn highlight">Create</button>
        <button @click="showInput = false" class="cancel-btn">Cancel</button>
      </div>
    </div>

    <div v-if="showImport && !collapsed" class="import-pgn-form">
      <textarea v-model="pgnInput" placeholder="Paste PGN here..." rows="4"></textarea>
      <div class="form-actions import-actions">
        <button @click="handleImport('white')" class="submit-btn white-style">Import for White</button>
        <button @click="handleImport('black')" class="submit-btn black-style">Import for Black</button>
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
            <span class="color-indicator" :class="chapter.color || 'none'"
              :title="chapter.color ? `Repertoire for ${chapter.color}` : 'No color set'"></span>
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
  max-height: 400px;
  display: flex;
  flex-direction: column;
  color: var(--color-text-primary, #ccc);
  background: rgba(20, 20, 20, 0.4);
  border-radius: 8px;
  overflow: hidden;
}

.chapters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid var(--color-border, #444);
  background: rgba(255, 255, 255, 0.03);
}

.chapters-header h3 {
  margin: 0;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.8;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.add-btn {
  background: #2e7d32 !important;
  /* Green */
  color: white !important;
  width: 28px;
  height: 28px;
  border-radius: 50% !important;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(46, 125, 50, 0.4);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  padding: 0 !important;
  opacity: 1 !important;
}

.add-btn:hover {
  transform: scale(1.1);
  background: #388e3c !important;
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.6);
}

.plus-icon {
  font-size: 1.4em;
  line-height: 1;
}

.template-btn,
.toggle-btn,
.import-btn {
  background: none;
  border: none;
  color: var(--color-text-primary);
  font-size: 1.1em;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

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
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--color-border);
}

.import-pgn-form textarea {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 8px;
  font-family: monospace;
  font-size: 0.8em;
  resize: vertical;
  margin-bottom: 10px;
  border-radius: 4px;
}

.import-actions {
  flex-wrap: wrap;
  gap: 8px;
}

.white-style {
  background: #eee !important;
  color: #222 !important;
  font-weight: 600;
}

.black-style {
  background: #333 !important;
  color: #eee !important;
  font-weight: 600;
  border-color: #555 !important;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.submit-btn,
.cancel-btn {
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: var(--color-bg-tertiary);
  color: white;
  transition: all 0.2s;
}

.submit-btn.highlight {
  background: var(--color-accent-primary);
  border-color: var(--color-accent-primary);
}

.new-chapter-form {
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--color-border);
}

.new-chapter-form input {
  width: 100%;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  margin-bottom: 10px;
  border-radius: 4px;
}

.color-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.color-selector button {
  flex: 1;
  padding: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  font-size: 0.85em;
  border-radius: 4px;
  transition: all 0.2s;
}

.color-selector button.active.white-btn {
  background: #eee;
  color: #222;
}

.color-selector button.active.black-btn {
  background: #333;
  color: #eee;
  border-color: #555;
}

.chapter-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.chapter-list li {
  padding: 10px 15px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  transition: background 0.2s;
}

.chapter-list li:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.chapter-list li.active {
  background-color: rgba(76, 175, 80, 0.15);
  border-left: 3px solid #4CAF50;
}

.chapter-info {
  display: flex;
  gap: 10px;
  align-items: center;
  overflow: hidden;
}

.color-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.color-indicator.white {
  background: #eee;
}

.color-indicator.black {
  background: #333;
}

.color-indicator.none {
  background: transparent;
  border-style: dashed;
}

.chapter-num {
  font-size: 0.8em;
  opacity: 0.5;
  font-family: monospace;
}

.chapter-name {
  font-size: 0.9em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.chapter-actions {
  display: flex;
  gap: 8px;
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
  opacity: 0.5;
  cursor: pointer;
  font-size: 0.9em;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.delete-btn:hover {
  color: #f44336;
  opacity: 1;
}

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
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid #4CAF50;
  color: white;
  padding: 4px 8px;
  font-size: 0.9em;
  border-radius: 4px;
}
</style>
