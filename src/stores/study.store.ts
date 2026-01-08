import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { pgnService, type PgnNode, pgnTreeVersion } from '@/services/PgnService';
import { useBoardStore } from './board.store';
import { parseFen, makeFen } from 'chessops/fen';
import { studyPersistenceService } from '@/services/StudyPersistenceService';
import { pgnParserService } from '@/services/PgnParserService';

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
    const isInitialized = ref(false);

    const activeChapter = computed(() =>
        chapters.value.find(c => c.id === activeChapterId.value)
    );

    function generateId(): string {
        return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    }

    async function initialize() {
        if (isInitialized.value) return;

        const loadedChapters = await studyPersistenceService.getAllChapters();
        if (loadedChapters.length > 0) {
            chapters.value = loadedChapters;
            // Restore last active chapter from localStorage or just take the first one
            const lastId = localStorage.getItem('lastActiveChapterId');
            if (lastId && chapters.value.some(c => c.id === lastId)) {
                setActiveChapter(lastId);
            } else if (chapters.value.length > 0) {
                setActiveChapter(chapters.value[0]!.id);
            }
        } else {
            // Create default chapter if none exist
            const id = createChapter('Chapter 1');
            setActiveChapter(id);
        }

        isInitialized.value = true;
    }

    function createChapter(name: string = 'New Chapter', startFen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
        let normalizedFen = startFen;
        try {
            const setup = parseFen(startFen).unwrap();
            normalizedFen = makeFen(setup);
        } catch (e) {
            console.error('Invalid FEN for new chapter', e);
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

        // Save immediately
        studyPersistenceService.saveChapter(newChapter);

        // If it's the first chapter or we just created it and want to switch
        if (chapters.value.length === 1) {
            setActiveChapter(id);
        }

        return id;
    }

    function createChapterFromPgn(pgn: string, nameOverride?: string) {
        try {
            const { tags, root } = pgnParserService.parse(pgn);
            
            let name = nameOverride || tags['Event'] || 'Imported Chapter';
            if (!nameOverride && tags['White'] && tags['Black']) {
                 name = `${tags['White']} - ${tags['Black']}`;
            }

            const id = generateId();
            const newChapter: StudyChapter = {
                id,
                name,
                root,
                tags: { ...tags, Event: name },
                savedPath: ''
            };

            chapters.value.push(newChapter);
            studyPersistenceService.saveChapter(newChapter);
            
            setActiveChapter(id);
            return id;
        } catch (e) {
            console.error('Failed to create chapter from PGN', e);
            throw e; 
        }
    }

    async function deleteChapter(id: string) {
        const index = chapters.value.findIndex(c => c.id === id);
        if (index !== -1) {
            chapters.value.splice(index, 1);
            await studyPersistenceService.deleteChapter(id);

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
                // We should also save it to DB to persist the cursor position
                studyPersistenceService.saveChapter(prev);
            }
        }

        // 2. Switch
        const next = chapters.value.find(c => c.id === id);
        if (next) {
            activeChapterId.value = id;
            localStorage.setItem('lastActiveChapterId', id);
            pgnService.setRoot(next.root, next.savedPath);
            boardStore.syncBoardWithPgn();
        }
    }

    function updateChapterMetadata(id: string, metadata: Partial<Omit<StudyChapter, 'id' | 'root' | 'savedPath'>>) {
        const chapter = chapters.value.find(c => c.id === id);
        if (chapter) {
            if (metadata.name) chapter.name = metadata.name;
            if (metadata.tags) chapter.tags = { ...chapter.tags, ...metadata.tags };
            studyPersistenceService.saveChapter(chapter);
        }
    }

    // Auto-save active chapter when tree changes
    watch(pgnTreeVersion, () => {
        if (activeChapter.value) {
            // Update savedPath to current before saving
            activeChapter.value.savedPath = pgnService.getCurrentPath();
            studyPersistenceService.saveChapter(activeChapter.value);
        }
    }, { deep: false });

    return {
        chapters,
        activeChapterId,
        activeChapter,
        isInitialized,
        initialize,
        createChapter,
        createChapterFromPgn,
        deleteChapter,
        setActiveChapter,
        updateChapterMetadata
    };
});

