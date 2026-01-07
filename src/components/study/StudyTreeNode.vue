<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import type { PgnNode } from '@/services/PgnService'
import { pgnService, pgnTreeVersion } from '@/services/PgnService'
import { useBoardStore } from '@/stores/board.store'

const props = withDefaults(defineProps<{
  node: PgnNode
  forceNumber?: boolean
  depth?: number
  mode?: 'all' | 'san' | 'continuation'
}>(), {
  depth: 0,
  mode: 'all'
})

const boardStore = useBoardStore()

const isActive = computed(() => {
  const v = pgnTreeVersion.value
  return pgnService.getCurrentNode() === props.node
})

const depthClass = computed(() => {
  const d = props.depth
  if (d === 0) return 'pgn-lvl-main'
  if (d === 1) return 'pgn-lvl-2'
  if (d === 2) return 'pgn-lvl-3'
  return 'pgn-lvl-4'
})

const moveNumber = computed(() => {
  const ply = props.node.ply
  const moveNum = Math.ceil(ply / 2)
  const isWhite = ply % 2 === 1

  if (isWhite) return `${moveNum}.`
  if (props.forceNumber) return `${moveNum}...`
  return ''
})

const children = computed(() => {
  const v = pgnTreeVersion.value
  return [...props.node.children]
})
const mainlineChild = computed(() => children.value[0])
const variations = computed(() => children.value.slice(1))

const activateNode = () => {
  pgnService.navigateToNode(props.node)
  boardStore.syncBoardWithPgn()
}

// --- context menu logic ---
const showDropdown = ref(false)
const x = ref(0)
const y = ref(0)

const dropdownOptions = computed(() => [
  {
    label: 'Promote Variation',
    key: 'promote-variant',
    disabled: !props.node.parent || props.node.parent.children[0] === props.node
  },
  {
    label: 'Make Mainline',
    key: 'promote-mainline',
    disabled: isOnLevelZero.value
  },
  {
    label: 'Comment',
    key: 'comment'
  },
  {
    label: 'Delete',
    key: 'delete',
    disabled: props.node.id === '__ROOT__'
  }
])

const isOnLevelZero = computed(() => {
  let current: PgnNode | undefined = props.node
  while (current && current.parent) {
    if (current.parent.children[0] !== current) return false
    current = current.parent
  }
  return true
})

const handleContextMenu = (e: MouseEvent) => {
  if (props.node.id === '__ROOT__') return
  e.preventDefault()
  e.stopPropagation()
  showDropdown.value = false
  nextTick().then(() => {
    showDropdown.value = true
    x.value = e.clientX
    y.value = e.clientY
  })
}

const handleSelect = (key: string) => {
  showDropdown.value = false
  if (key === 'promote-variant') {
    pgnService.promoteToVariantMainline(props.node)
  } else if (key === 'promote-mainline') {
    pgnService.promoteToMainline(props.node)
  } else if (key === 'delete') {
    pgnService.deleteNode(props.node)
    boardStore.syncBoardWithPgn()
  } else if (key === 'comment') {
    openCommentModal()
  }
}

// --- comment modal logic ---
const showCommentModal = ref(false)
const commentText = ref('')

const openCommentModal = () => {
  commentText.value = props.node.comment || ''
  showCommentModal.value = true
}

const saveComment = () => {
  pgnService.updateNode(props.node, { comment: commentText.value })
}
</script>

<script lang="ts">
export default {
  name: 'StudyTreeNode'
}
</script>

<template>
  <div class="study-node">
    <n-dropdown trigger="manual" :show="showDropdown" :options="dropdownOptions" :x="x" :y="y"
      @clickoutside="showDropdown = false" @select="handleSelect" />

    <!-- 1. The move itself (SAN) -->
    <template v-if="node.id !== '__ROOT__' && mode !== 'continuation'">
      <span class="move-san" :class="[depthClass, { active: isActive, 'has-comment': !!node.comment }]"
        @click.stop="activateNode" @contextmenu="handleContextMenu">
        <span v-if="moveNumber" class="move-index">{{ moveNumber }}</span>
        <span class="san-text">{{ node.san }}</span>
        <span v-if="node.comment" class="comment-indicator" :title="node.comment">💬</span>
        <span v-if="node.eval" class="eval-tag">{{ node.eval }}</span>
      </span>
    </template>

    <!-- 2. Children section (Next moves) -->
    <template v-if="mode !== 'san' && mainlineChild">
      <!-- A. Render the next move's SAN -->
      <StudyTreeNode :node="mainlineChild" mode="san" :depth="depth" />

      <!-- B. Render alternatives to that next move -->
      <div v-if="variations.length > 0" class="variations-container">
        <div v-for="variant in variations" :key="variant.id" class="variation-line">
          <span class="variation-brace">(</span>
          <StudyTreeNode :node="variant" mode="all" :depth="depth + 1" :force-number="true" />
          <span class="variation-brace">)</span>
        </div>
      </div>

      <!-- C. Render the continuation of the next move -->
      <StudyTreeNode :node="mainlineChild" mode="continuation" :depth="depth"
        :force-number="variations.length > 0 || !!mainlineChild.comment" />
    </template>

    <n-modal v-model:show="showCommentModal" preset="dialog" title="Edit Comment" positive-text="Save"
      negative-text="Cancel" @positive-click="saveComment">
      <n-input v-model:value="commentText" type="textarea" placeholder="Enter comment..." />
    </n-modal>
  </div>
</template>

<style scoped>
.study-node {
  display: inline;
}

.move-san {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  margin-right: 2px;
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  color: var(--color-text-primary, #e0e0e0);
}

.pgn-lvl-main {
  font-size: var(--font-size-pgn_mainline);
  color: var(--color-pgn_mainline);
}

.pgn-lvl-2 {
  font-size: var(--font-size-pgn_secondline);
  color: var(--color-pgn_secondline);
}

.pgn-lvl-3 {
  font-size: var(--font-size-pgn_thirdline);
  color: var(--color-pgn_thirdline);
}

.pgn-lvl-4 {
  font-size: var(--font-size-pgn_fourthline);
  color: var(--color-pgn_fourthline);
}

.move-san:hover {
  background-color: var(--color-bg-tertiary, #3a3a3a);
}

.move-san.active {
  background-color: var(--color-accent-primary, #369a3c);
  color: white;
  font-weight: bold;
}

.move-index {
  color: var(--color-text-secondary, #888);
  font-size: 0.9em;
  margin-right: 2px;
}

.move-san.active .move-index {
  color: rgba(255, 255, 255, 0.8);
}

.variations-container {
  display: flex;
  flex-direction: column;
  margin-top: 4px;
  margin-bottom: 4px;
  padding-left: 8px;
  border-left: 2px solid var(--color-border-hover, #444);
  margin-left: 4px;
}

.variation-line {
  margin-bottom: 4px;
}

.variation-brace {
  opacity: 0.5;
  margin: 0 2px;
  font-weight: normal;
}

.comment-indicator {
  font-size: 0.8em;
  opacity: 0.7;
}

.eval-tag {
  font-size: 0.7em;
  background: #444;
  padding: 1px 3px;
  border-radius: 2px;
}
</style>
