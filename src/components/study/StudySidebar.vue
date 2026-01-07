<script setup lang="ts">
import { useStudyStore } from '@/stores/study.store'
import { ref } from 'vue'

const studyStore = useStudyStore()
const showInput = ref(false)
const newChapterName = ref('')

const handleCreate = () => {
    if (newChapterName.value.trim()) {
        studyStore.createChapter(newChapterName.value)
        newChapterName.value = ''
        showInput.value = false
    }
}

const selectChapter = (id: string) => {
    studyStore.setActiveChapter(id)
}
</script>

<template>
    <div class="study-sidebar">
        <div class="chapters-header">
            <h3>Chapters</h3>
            <button @click="showInput = !showInput" class="add-btn" title="New Chapter">+</button>
        </div>

        <div v-if="showInput" class="new-chapter-form">
            <input v-model="newChapterName" placeholder="Chapter Name" @keyup.enter="handleCreate" ref="nameInput"
                autofocus />
        </div>

        <ul class="chapter-list">
            <li v-for="(chapter, index) in studyStore.chapters" :key="chapter.id"
                :class="{ active: studyStore.activeChapterId === chapter.id }" @click="selectChapter(chapter.id)">
                <div class="chapter-info">
                    <span class="chapter-num">{{ index + 1 }}</span>
                    <span class="chapter-name">{{ chapter.name }}</span>
                </div>
                <div class="chapter-actions">
                    <button @click.stop="studyStore.deleteChapter(chapter.id)" class="delete-btn">×</button>
                </div>
            </li>
        </ul>
    </div>
</template>

<style scoped>
.study-sidebar {
    height: 100%;
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

.add-btn {
    background: none;
    border: none;
    color: var(--color-text-primary);
    font-size: 1.5em;
    cursor: pointer;
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

.delete-btn {
    background: none;
    border: none;
    color: inherit;
    opacity: 0.5;
    cursor: pointer;
    font-size: 1.2em;
}

.delete-btn:hover {
    opacity: 1;
}
</style>
