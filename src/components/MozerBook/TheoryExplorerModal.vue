<script setup lang="ts">
import { CloseOutline, LeafOutline } from '@vicons/ionicons5';
import { NIcon, NModal, NScrollbar, NText } from 'naive-ui';
import { computed } from 'vue';
import WinrateBar from './WinrateBar.vue';
import { type TheoryItemWithChildren } from './types';
import { getNagColor, getNagSymbol } from './utils';

interface Props {
    show: boolean;
    theoryItems: TheoryItemWithChildren[];
    turn: 'white' | 'black';
}

const props = defineProps<Props>();
const emit = defineEmits(['update:show', 'select']);

const internalShow = computed({
    get: () => props.show,
    set: (val) => emit('update:show', val)
});

function handleSelect(uci: string) {
    emit('select', uci);
}

const calculateScore = (item: TheoryItemWithChildren) => {
    const total = item.w + item.d + item.l;
    if (total === 0) return 0;
    // Score always represents White points (1-0)
    const whiteWins = props.turn === 'white' ? item.w : item.l;
    return ((whiteWins + item.d * 0.5) / total) * 100;
};
</script>

<template>
    <n-modal v-model:show="internalShow" transform-origin="center">
        <div class="theory-modal-content">
            <div class="modal-header">
                <div class="header-title">
                    <n-icon size="24" color="#2e7d32">
                        <LeafOutline />
                    </n-icon>
                    <div class="title-text">
                        <div class="main-title">Theoretical Explorer</div>
                        <div class="sub-title">Theoretical continuations for the current position</div>
                    </div>
                </div>
                <n-icon class="modal-close" size="24" @click="internalShow = false">
                    <CloseOutline />
                </n-icon>
            </div>

            <n-scrollbar style="max-height: 70vh" trigger="none">
                <div class="modal-body">
                    <div v-if="theoryItems.length > 0" class="theory-grid">
                        <div v-for="item in theoryItems" :key="item.uci" class="theory-card"
                            @click="handleSelect(item.uci)">
                            <div class="card-main-info">
                                <div class="card-move-header">
                                    <span class="card-eco">{{ item.eco }}</span>
                                    <span class="card-san" :style="{ color: getNagColor(item.nag) }">
                                        {{ item.san }}{{ getNagSymbol(item.nag) }}
                                    </span>
                                    <span class="card-popularity" v-if="item.count > 0">N={{ item.count.toLocaleString()
                                        }}</span>
                                </div>
                                <div class="card-name">{{ item.name }}</div>

                                <div class="card-stats-row" v-if="item.count > 0">
                                    <div class="card-bar-wrapper">
                                        <WinrateBar :w="item.w" :d="item.d" :l="item.l" :turn="turn" :show-score="false"
                                            mini />
                                    </div>
                                    <div class="card-stats-values">
                                        <span class="stat-score">{{ calculateScore(item).toFixed(1) }}%</span>
                                        <span class="stat-sep">|</span>
                                        <span class="stat-draw">{{ ((item.d / item.count) * 100).toFixed(1) }}%
                                            draw</span>
                                        <span class="stat-sep">|</span>
                                        <span class="stat-av">Av: {{ Math.round(item.av) }}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="card-children" v-if="item.children.length > 0">
                                <div v-for="(child, idx) in item.children" :key="child.uci"
                                    class="modal-hierarchy-line">
                                    <span class="marker">{{ idx === item.children.length - 1 ? '└──' : '├──' }}</span>
                                    <span class="child-san">{{ child.san }}</span>
                                    <span class="child-eco">({{ child.eco }})</span>
                                    <span class="child-name">{{ child.name }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="empty-theory-modal">
                        <n-text depth="3">No theoretical data available for this position.</n-text>
                    </div>
                </div>
            </n-scrollbar>
        </div>
    </n-modal>
</template>

<style scoped>
.theory-modal-content {
    width: 90vw;
    max-width: 800px;
    background: rgba(24, 24, 28, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-title {
    display: flex;
    align-items: center;
    gap: 16px;
}

.title-text {
    display: flex;
    flex-direction: column;
}

.main-title {
    font-size: 20px;
    font-weight: bold;
    color: #fff;
}

.sub-title {
    font-size: 13px;
    color: var(--color-text-secondary);
}

.modal-close {
    cursor: pointer;
    opacity: 0.6;
    transition: all 0.2s;
}

.modal-close:hover {
    opacity: 1;
    transform: rotate(90deg);
}

.modal-body {
    padding: 24px;
}

.theory-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
}

.theory-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.theory-card:hover {
    background: rgba(var(--color-accent-rgb), 0.08);
    border-color: var(--color-accent);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.card-move-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
}

.card-eco {
    font-family: 'Fira Code', monospace;
    color: #888;
    font-size: 14px;
}

.card-san {
    font-size: 20px;
    font-weight: 800;
}

.card-popularity {
    font-size: 11px;
    color: #666;
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: auto;
}

.card-name {
    font-size: 14px;
    color: #ccc;
    margin-bottom: 8px;
}

.card-stats-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
}

.card-bar-wrapper {
    width: 100px;
}

.card-stats-values {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-family: 'Fira Code', monospace;
    color: #888;
}

.stat-score {
    color: #fff;
    font-weight: bold;
}

.stat-sep {
    opacity: 0.3;
}

.card-children {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    padding: 12px;
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.modal-hierarchy-line {
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #aaa;
}

.marker {
    color: #444;
    font-weight: bold;
}

.child-san {
    color: #fff;
    font-weight: bold;
    width: 50px;
}

.child-eco {
    color: #666;
    font-size: 11px;
}

.child-name {
    color: #888;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.empty-theory-modal {
    padding: 60px;
    text-align: center;
}
</style>
