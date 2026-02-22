import { useBoardStore } from '@/entities/game'
import { useDiamondHunterStore } from '@/features/diamond-hunter'
import type { SoundEvent } from '@/shared/lib/sound/sound.service'
import { soundService } from '@/shared/lib/sound/sound.service'
import type { DrawShape } from '@lichess-org/chessground/draw'
import type { Key } from '@lichess-org/chessground/types'
import { watch } from 'vue'

const ARROW_COLORS = ['green', 'blue', 'yellow']

export function useDiamondHunterUi() {
    const store = useDiamondHunterStore()
    const boardStore = useBoardStore()

    watch(() => store.hints, (hints) => {
        const shapes: DrawShape[] = hints.map((hint, index) => {
            const shape: DrawShape = {
                orig: hint.orig as Key,
            }
            if (hint.dest) {
                shape.dest = hint.dest as Key
            }

            switch (hint.type) {
                case 'arrow':
                    shape.brush = ARROW_COLORS[index] || 'green'
                    if (hint.dist !== undefined) {
                        if (hint.dist <= 3) shape.label = { text: '!', fill: '#00C853' }
                        else if (hint.dist <= 5) shape.label = { text: '!?', fill: '#2196F3' }
                    }
                    break
                case 'blunder':
                    shape.brush = 'red'
                    shape.label = { text: '??', fill: '#D32F2F' }
                    break
                case 'victory':
                    shape.brush = 'purple'
                    shape.label = { text: '!!!', fill: '#9C27B0' }
                    break
                case 'correct':
                    shape.brush = 'green'
                    shape.label = { text: '!', fill: '#00C853' }
                    break
                case 'expected':
                    shape.brush = 'red'
                    shape.label = { text: 'Here!', fill: '#D32F2F' }
                    break
            }

            return shape
        })

        boardStore.setDrawableShapes(shapes)
    }, { deep: true })

    watch(() => store.soundTrigger, (trigger) => {
        if (!trigger) return
        soundService.playSound(trigger as SoundEvent)
        store.clearSoundTrigger()
    })
}
