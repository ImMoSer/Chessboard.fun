import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useStudyStore } from '@/entities/study'

export const useReplyTrainingStore = defineStore('reply-training', () => {
  const studyStore = useStudyStore()

  const isReplyTrainingActive = ref(false)

  const isReadyToReply = computed(() => {
    if (!studyStore.activeStudy) return false

    const studyChapters = studyStore.chapters.filter((c) => c.studyId === studyStore.activeStudy?.id)
    if (studyChapters.length === 0) return false

    // Strict rule: all chapters in the study must be repertoire
    return studyChapters.every((c) => c.chapter_type === 'repertoire')
  })

  const sessionStats = ref({
    correct: 0,
    wrong: 0,
    streak: 0,
    startTime: 0
  })

  function resetSession() {
    sessionStats.value = {
      correct: 0,
      wrong: 0,
      streak: 0,
      startTime: Date.now()
    }
  }

  return {
    isReplyTrainingActive,
    isReadyToReply,
    sessionStats,
    resetSession
  }
})
