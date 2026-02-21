// src/stores/theme.store.ts
import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import logger from '@/shared/lib/logger'

// --- Типы и интерфейсы ---
export interface BoardTheme {
  name: string
  imageFile: string
  thumbnailFile: string
}

export interface PieceSet {
  name: string
  previewPieceFile: string
}

// --- НАЧАЛО ИЗМЕНЕНИЙ: Добавлено свойство boardSize ---
export interface AppTheme {
  board: string
  pieces: string
  animationDuration: number
  boardSize: number
}
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

// --- Константы ---
// --- ИЗМЕНЕНИЕ: Обновлен ключ хранилища для новой структуры ---
const THEME_STORAGE_KEY = 'user_app_theme_v4'
const DYNAMIC_STYLE_ELEMENT_ID = 'dynamic-chessboard-styles'

const AVAILABLE_BOARDS: BoardTheme[] = [
  { name: 'blue-marble', imageFile: 'blue-marble.jpg', thumbnailFile: 'blue-marble.thumbnail.jpg' },
  { name: 'blue', imageFile: 'blue.png', thumbnailFile: 'blue.thumbnail.png' },
  { name: 'blue2', imageFile: 'blue2.jpg', thumbnailFile: 'blue2.thumbnail.jpg' },
  { name: 'blue3', imageFile: 'blue3.jpg', thumbnailFile: 'blue3.thumbnail.jpg' },
  { name: 'brown', imageFile: 'brown.png', thumbnailFile: 'brown.thumbnail.png' },
  { name: 'canvas2', imageFile: 'canvas2.jpg', thumbnailFile: 'canvas2.thumbnail.jpg' },
  {
    name: 'green-plastic',
    imageFile: 'green-plastic.png',
    thumbnailFile: 'green-plastic.thumbnail.png',
  },
  { name: 'green', imageFile: 'green.png', thumbnailFile: 'green.thumbnail.png' },
  { name: 'grey', imageFile: 'grey.jpg', thumbnailFile: 'grey.thumbnail.jpg' },
  { name: 'horsey', imageFile: 'horsey.jpg', thumbnailFile: 'horsey.thumbnail.jpg' },
  { name: 'ic', imageFile: 'ic.png', thumbnailFile: 'ic.thumbnail.png' },
  { name: 'leather', imageFile: 'leather.jpg', thumbnailFile: 'leather.thumbnail.jpg' },
  { name: 'maple', imageFile: 'maple.jpg', thumbnailFile: 'maple.thumbnail.jpg' },
  { name: 'maple2', imageFile: 'maple2.jpg', thumbnailFile: 'maple2.thumbnail.jpg' },
  { name: 'marble', imageFile: 'marble.jpg', thumbnailFile: 'marble.thumbnail.jpg' },
  { name: 'metal', imageFile: 'metal.jpg', thumbnailFile: 'metal.thumbnail.jpg' },
  { name: 'olive', imageFile: 'olive.jpg', thumbnailFile: 'olive.thumbnail.jpg' },
  {
    name: 'pink-pyramid',
    imageFile: 'pink-pyramid.png',
    thumbnailFile: 'pink-pyramid.thumbnail.png',
  },
  { name: 'purple', imageFile: 'purple.png', thumbnailFile: 'purple.thumbnail.png' },
  { name: 'wood', imageFile: 'wood.jpg', thumbnailFile: 'wood.thumbnail.jpg' },
  { name: 'wood2', imageFile: 'wood2.jpg', thumbnailFile: 'wood2.thumbnail.jpg' },
  { name: 'wood3', imageFile: 'wood3.jpg', thumbnailFile: 'wood3.thumbnail.jpg' },
  { name: 'wood4', imageFile: 'wood4.jpg', thumbnailFile: 'wood4.thumbnail.jpg' },
]

const AVAILABLE_PIECE_SETS: PieceSet[] = [
  { name: 'alpha', previewPieceFile: '/piece/alpha/wN.svg' },
  { name: 'caliente', previewPieceFile: '/piece/caliente/wN.svg' },
  { name: 'california', previewPieceFile: '/piece/california/wN.svg' },
  { name: 'cardinal', previewPieceFile: '/piece/cardinal/wN.svg' },
  { name: 'cburnett', previewPieceFile: '/piece/cburnett/wN.svg' },
  { name: 'celtic', previewPieceFile: '/piece/celtic/wN.svg' },
  { name: 'chess7', previewPieceFile: '/piece/chess7/wN.svg' },
  { name: 'chessnut', previewPieceFile: '/piece/chessnut/wN.svg' },
  { name: 'companion', previewPieceFile: '/piece/companion/wN.svg' },
  { name: 'cooke', previewPieceFile: '/piece/cooke/wN.svg' },
  { name: 'dubrovny', previewPieceFile: '/piece/dubrovny/wN.svg' },
  { name: 'fantasy', previewPieceFile: '/piece/fantasy/wN.svg' },
  { name: 'gioco', previewPieceFile: '/piece/gioco/wN.svg' },
  { name: 'governor', previewPieceFile: '/piece/governor/wN.svg' },
  { name: 'icpieces', previewPieceFile: '/piece/icpieces/wN.svg' },
  { name: 'kosal', previewPieceFile: '/piece/kosal/wN.svg' },
  { name: 'leipzig', previewPieceFile: '/piece/leipzig/wN.svg' },
  { name: 'maestro', previewPieceFile: '/piece/maestro/wN.svg' },
  { name: 'merida', previewPieceFile: '/piece/merida/wN.svg' },
  { name: 'monarchy', previewPieceFile: '/piece/monarchy/wN.svg' },
  { name: 'rhosgfx', previewPieceFile: '/piece/rhosgfx/wN.svg' },
  { name: 'spatial', previewPieceFile: '/piece/spatial/wN.svg' },
  { name: 'staunty', previewPieceFile: '/piece/staunty/wN.svg' },
  { name: 'tatiana', previewPieceFile: '/piece/tatiana/wN.svg' },
  { name: 'xkcd', previewPieceFile: '/piece/xkcd/wN.svg' },
]

const PIECE_ROLES = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king']
const PIECE_COLORS = ['white', 'black']
const PIECE_FILES: { [key: string]: { w: string; b: string } } = {
  pawn: { w: 'wP.svg', b: 'bP.svg' },
  knight: { w: 'wN.svg', b: 'bN.svg' },
  bishop: { w: 'wB.svg', b: 'bB.svg' },
  rook: { w: 'wR.svg', b: 'bR.svg' },
  queen: { w: 'wQ.svg', b: 'bQ.svg' },
  king: { w: 'wK.svg', b: 'bK.svg' },
}

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = reactive<AppTheme>(loadTheme())
  const availableBoards = ref<BoardTheme[]>(AVAILABLE_BOARDS)
  const availablePieceSets = ref<PieceSet[]>(AVAILABLE_PIECE_SETS)

  function loadTheme(): AppTheme {
    // --- НАЧАЛО ИЗМЕНЕНИЙ: Добавлен boardSize в значения по умолчанию ---
    const defaults: AppTheme = {
      board: 'wood4',
      pieces: 'alpha',
      animationDuration: 200,
      boardSize: 600,
    }
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
      if (savedTheme) {
        const parsed = JSON.parse(savedTheme)
        // --- ИЗМЕНЕНИЕ: Проверяем наличие всех свойств, включая boardSize ---
        if (
          parsed.board &&
          parsed.pieces &&
          'animationDuration' in parsed &&
          'boardSize' in parsed
        ) {
          return { ...defaults, ...parsed }
        }
      }
    } catch (error) {
      logger.error('[ThemeStore] Failed to load or parse theme from localStorage:', error)
    }
    return defaults
  }

  function saveTheme() {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(currentTheme))
    } catch (error) {
      logger.error('[ThemeStore] Failed to save theme to localStorage:', error)
    }
  }

  function applyTheme() {
    const board = AVAILABLE_BOARDS.find((b) => b.name === currentTheme.board)
    const pieceSet = AVAILABLE_PIECE_SETS.find((p) => p.name === currentTheme.pieces)

    if (!board || !pieceSet) {
      logger.error('[ThemeStore] Cannot apply theme, board or piece set not found.', currentTheme)
      return
    }

    const boardPath = `/board/jpg_png/${board.imageFile}`

    let css = `cg-board { background-image: url('${boardPath}'); }`

    PIECE_ROLES.forEach((role) => {
      PIECE_COLORS.forEach((color) => {
        const roleFiles = PIECE_FILES[role]
        if (roleFiles) {
          const pieceFile = roleFiles[color === 'white' ? 'w' : 'b']
          const piecePath = `/piece/${pieceSet.name}/${pieceFile}`
          css += ` piece.${role}.${color} { background-image: url('${piecePath}'); }`
        }
      })
    })

    let styleEl = document.getElementById(DYNAMIC_STYLE_ELEMENT_ID) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = DYNAMIC_STYLE_ELEMENT_ID
      document.head.appendChild(styleEl)
    }
    if (styleEl) {
      styleEl.textContent = css
    }
    logger.info('[ThemeStore] Dynamic styles applied.')
  }

  function setBoard(boardName: string) {
    if (currentTheme.board !== boardName) {
      currentTheme.board = boardName
      applyTheme()
      saveTheme()
    }
  }

  function setPieceSet(pieceSetName: string) {
    if (currentTheme.pieces !== pieceSetName) {
      currentTheme.pieces = pieceSetName
      applyTheme()
      saveTheme()
    }
  }

  function setAnimationDuration(duration: number) {
    const newDuration = Math.max(0, Math.min(500, duration))
    if (currentTheme.animationDuration !== newDuration) {
      currentTheme.animationDuration = newDuration
      saveTheme()
    }
  }

  // --- НАЧАЛО ИЗМЕНЕНИЙ: Новый метод для сохранения размера доски ---
  function setBoardSize(size: number) {
    if (currentTheme.boardSize !== size) {
      currentTheme.boardSize = size
      saveTheme()
      logger.info(`[ThemeStore] Board size saved: ${size}px`)
    }
  }
  // --- КОНЕЦ ИЗМЕНЕНИЙ ---

  applyTheme()

  return {
    currentTheme,
    availableBoards,
    availablePieceSets,
    setBoard,
    setPieceSet,
    applyTheme,
    setAnimationDuration,
    setBoardSize, // --- ИЗМЕНЕНИЕ: Экспортируем новый метод ---
  }
})
