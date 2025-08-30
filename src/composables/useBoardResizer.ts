// src/composables/useBoardResizer.ts
import { ref, onUnmounted, type Ref } from 'vue'

/**
 * Composable функция для управления изменением размера элемента.
 * @param containerRef - Ref на DOM-элемент, чей размер отслеживается.
 * @param initialSize - Начальный размер в пикселях.
 * @param onResizeEnd - Колбэк, вызываемый после завершения изменения размера.
 * @param minSize - Минимальный размер в пикселях.
 * @param maxSize - Максимальный размер в пикселях.
 * @returns Реактивный размер, флаг изменения размера и функция для старта.
 */
export function useBoardResizer(
  containerRef: Ref<HTMLElement | null>,
  initialSize: number,
  onResizeEnd: (newSize: number) => void, // --- ИЗМЕНЕНИЕ: Добавлен колбэк
  minSize: number = 400,
  maxSize: number = 1200,
) {
  const size = ref(initialSize)
  const isResizing = ref(false)

  const startResize = (startEvent: MouseEvent) => {
    startEvent.preventDefault()
    isResizing.value = true

    const startSize = size.value
    const startX = startEvent.clientX
    const startY = startEvent.clientY

    const doResize = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      const delta = Math.max(dx, dy)
      let newSize = startSize + delta

      newSize = Math.max(minSize, Math.min(newSize, maxSize))
      size.value = newSize
    }

    const stopResize = () => {
      isResizing.value = false
      window.removeEventListener('mousemove', doResize)
      window.removeEventListener('mouseup', stopResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      // --- НАЧАЛО ИЗМЕНЕНИЙ: Вызываем колбэк для сохранения размера ---
      onResizeEnd(size.value)
      // --- КОНЕЦ ИЗМЕНЕНИЙ ---
    }

    document.body.style.cursor = 'se-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', doResize)
    window.addEventListener('mouseup', stopResize)
  }

  onUnmounted(() => {
    window.removeEventListener('mousemove', () => { })
    window.removeEventListener('mouseup', () => { })
  })

  return {
    size,
    isResizing,
    startResize,
  }
}

