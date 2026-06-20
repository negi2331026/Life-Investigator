<template>
  <Teleport to="body">
    <div v-if="visible" class="clue-panel-overlay" @click.self="$emit('close')">
      <div class="clue-panel">
        <div class="clue-panel-header">
          <h2>线索详情（{{ discoveredClueIds.length }}/{{ totalClues }}）</h2>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>
        <div class="clue-panel-list" v-if="discoveredClueIds.length > 0">
          <div
            v-for="clueId in discoveredClueIds"
            :key="clueId"
            class="clue-detail-card"
            :class="{ 'active': selectedClueId === clueId }"
            @click="toggleClue(clueId)"
          >
            <div class="clue-detail-header">
              <span class="clue-detail-name">{{ getClueName(clueId) }}</span>
              <span v-if="isKeyClue(clueId)" class="key-badge">关键</span>
              <span class="clue-category">{{ getClueCategory(clueId) }}</span>
            </div>
            <p v-if="selectedClueId === clueId" class="clue-detail-desc">{{ getClueDescription(clueId) }}</p>
          </div>
        </div>
        <div v-else class="clue-panel-empty">
          <p>尚未发现任何线索</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CaseData } from '@/types/case'

const props = defineProps<{
  visible: boolean
  caseData: CaseData
  discoveredClueIds: string[]
}>()

defineEmits<{
  'close': []
}>()

const selectedClueId = ref('')

const totalClues = computed(() => props.caseData.clues?.length || 0)

const toggleClue = (clueId: string) => {
  selectedClueId.value = selectedClueId.value === clueId ? '' : clueId
}

const getClueName = (clueId: string) => {
  const clue = props.caseData.clues?.find(c => c.clueId === clueId)
  return clue ? clue.name : '未知线索'
}

const isKeyClue = (clueId: string) => {
  const clue = props.caseData.clues?.find(c => c.clueId === clueId)
  return clue?.isKeyClue || false
}

const getClueCategory = (clueId: string) => {
  const clue = props.caseData.clues?.find(c => c.clueId === clueId)
  return clue?.category || ''
}

const getClueDescription = (clueId: string) => {
  const clue = props.caseData.clues?.find(c => c.clueId === clueId)
  return clue?.description || ''
}
</script>

<style scoped>
.clue-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.clue-panel {
  background: rgba(20, 20, 40, 0.98);
  border: 2px solid #533483;
  border-radius: 16px;
  width: 90%;
  max-width: 560px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
}

.clue-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid rgba(83, 52, 131, 0.4);
  position: sticky;
  top: 0;
  background: rgba(20, 20, 40, 0.98);
  z-index: 1;
}

.clue-panel-header h2 {
  color: #e0e0ff;
  font-size: 1.3rem;
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: #a0a0cc;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  color: #ffc2cb;
  background: rgba(255, 194, 203, 0.1);
}

.clue-panel-list {
  padding: 0.8rem 1.5rem 1.5rem;
}

.clue-detail-card {
  background: rgba(26, 26, 46, 0.8);
  border: 1px solid rgba(83, 52, 131, 0.3);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 0.6rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clue-detail-card:hover {
  border-color: #8af5c3;
}

.clue-detail-card.active {
  border-color: #8af5c3;
  box-shadow: 0 0 12px rgba(138, 245, 195, 0.2);
}

.clue-detail-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.clue-detail-name {
  color: #e0e0ff;
  font-weight: 600;
  font-size: 1rem;
}

.key-badge {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 8px;
}

.clue-category {
  color: #606080;
  font-size: 0.8rem;
  margin-left: auto;
}

.clue-detail-desc {
  color: #a0a0cc;
  font-size: 0.9rem;
  margin-top: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px solid rgba(83, 52, 131, 0.2);
  line-height: 1.5;
}

.clue-panel-empty {
  padding: 2rem;
  text-align: center;
  color: #606080;
}
</style>
