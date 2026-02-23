// src/widgets/game-layout/model/useTopInfo.ts
import { type TopInfoDisplay } from '@/entities/puzzle'
import { useDiamondHunterStore } from '@/features/diamond-hunter'
import { useFinishHimStore } from '@/features/finish-him'
import { usePracticalChessStore } from '@/features/practical-chess'
import { useTheoryEndingsStore } from '@/features/theory-endings'
import { useTornadoStore } from '@/features/tornado'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

export function useTopInfo() {
    const route = useRoute()
    const tornadoStore = useTornadoStore()
    const finishHimStore = useFinishHimStore()
    const theoryStore = useTheoryEndingsStore()
    const practicalStore = usePracticalChessStore()
    const diamondHunterStore = useDiamondHunterStore()

    const displayInfo = computed<TopInfoDisplay>(() => {
        const routeName = route.name?.toString() || ''

        if (routeName === 'tornado') return tornadoStore.topInfoDisplay
        if (routeName === 'diamond-hunter') return diamondHunterStore.topInfoDisplay
        if (routeName.startsWith('finish-him')) return finishHimStore.topInfoDisplay
        if (routeName.startsWith('theory-endings')) return theoryStore.topInfoDisplay
        if (routeName.startsWith('practical-chess')) return practicalStore.topInfoDisplay

        // Default fallback
        return {
            title: '',
            badges: [],
            stats: []
        }
    })

    return {
        displayInfo
    }
}
