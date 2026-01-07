import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { pgnService, type PgnNode } from '@/services/PgnService';
import { useBoardStore } from './board.store';
import { parseFen, makeFen } from 'chessops/fen';

export interface StudyChapter {
    id: string;
    name: string;
    root: PgnNode; // The reference to the tree
    tags: Record<string, string>;
    savedPath: string; // To restore cursor location
}

export const useStudyStore = defineStore('study', () => {
    const boardStore = useBoardStore();

    const chapters = ref<StudyChapter[]>([]);
    const activeChapterId = ref<string | null>(null);

    const activeChapter = computed(() =>
        chapters.value.find(c => c.id === activeChapterId.value)
    );

    function generateId(): string {
        return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    }

    function createChapter(name: string = 'New Chapter', startFen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
        let normalizedFen = startFen;
        try {
            const setup = parseFen(startFen).unwrap();
            normalizedFen = makeFen(setup);
        } catch (e) {
            console.error('Invalid FEN for new chapter', e);
            // Fallback to initial if failed (though param default is safe)
        }

        const root: PgnNode = {
            id: '__ROOT__',
            ply: 0,
            fenBefore: '',
            fenAfter: normalizedFen,
            san: '',
            uci: '',
            children: []
        };

        const id = generateId();
        const newChapter: StudyChapter = {
            id,
            name,
            root,
            tags: {
                Event: name,
                Site: 'Chess App Study',
                Date: new Date().toISOString().split('T')[0] ?? '',
                White: 'Player',
                Black: 'Opponent'
            },
            savedPath: ''
        };

        chapters.value.push(newChapter);

        // If it's the first chapter, select it automatically
        if (chapters.value.length === 1) {
            setActiveChapter(id);
        }

        return id;
    }

    function deleteChapter(id: string) {
        const index = chapters.value.findIndex(c => c.id === id);
        if (index !== -1) {
            chapters.value.splice(index, 1);
            if (activeChapterId.value === id) {
                if (chapters.value.length > 0) {
                    const next = chapters.value[0];
                    if (next) setActiveChapter(next.id);
                } else {
                    activeChapterId.value = null;
                    createChapter(); // Always ensure at least one chapter
                }
            }
        }
    }

    function setActiveChapter(id: string) {
        // 1. Save state of current chapter (cursor position)
        if (activeChapterId.value) {
            const prev = chapters.value.find(c => c.id === activeChapterId.value);
            if (prev) {
                prev.savedPath = pgnService.getCurrentPath();
            }
        }

        // 2. Switch
        const next = chapters.value.find(c => c.id === id);
        if (next) {
            activeChapterId.value = id;
            pgnService.setRoot(next.root, next.savedPath);
            boardStore.syncBoardWithPgn();

            // Ensure board orientation/settings might need update?
            // For now keep board settings (flip) independent of chapter unless stored.
        }
    }

    // Update the name/tags of the active chapter
    function updateChapterMetadata(id: string, metadata: Partial<Omit<StudyChapter, 'id' | 'root' | 'savedPath'>>) {
        const chapter = chapters.value.find(c => c.id === id);
        if (chapter) {
            if (metadata.name) chapter.name = metadata.name;
            if (metadata.tags) chapter.tags = { ...chapter.tags, ...metadata.tags };
        }
    }

    // Initialize with one chapter if empty
    if (chapters.value.length === 0) {
        createChapter('Chapter 1');
    }

    return {
        chapters,
        activeChapterId,
        activeChapter,
        createChapter,
        deleteChapter,
        setActiveChapter,
        updateChapterMetadata
    };
});
