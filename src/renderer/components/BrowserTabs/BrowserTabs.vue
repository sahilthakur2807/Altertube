<template>
  <div
    ref="tabsBar"
    class="browserTabsBar"
    role="tablist"
    :aria-label="t('Browser Tabs')"
  >
    <div class="tabsList">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="tab"
        :class="{ activeTab: tab.id === activeTabId }"
        role="tab"
        :aria-selected="tab.id === activeTabId"
        :title="tab.title"
        @click="handleTabClick(tab.id)"
        @mousedown.middle.prevent="handleMiddleClick(tab)"
        @keydown.enter.space.prevent="handleTabClick(tab.id)"
        tabindex="0"
      >
        <FontAwesomeIcon
          v-if="tab.icon"
          :icon="tab.icon"
          class="tabIcon"
          aria-hidden="true"
        />
        <span class="tabTitle">{{ tab.title }}</span>
        <button
          v-if="tab.closeable"
          class="tabCloseBtn"
          :aria-label="t('Close Tab')"
          :title="t('Close Tab')"
          @click.stop="handleCloseTab(tab.id)"
          @keydown.enter.space.prevent.stop="handleCloseTab(tab.id)"
          tabindex="-1"
        >
          <FontAwesomeIcon :icon="['fas', 'times']" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import store from '../../store/index'

const { t } = useI18n()

const tabsBar = ref(null)

const tabs = computed(() => store.getters.getTabs)
const activeTabId = computed(() => store.getters.getActiveTabId)

/**
 * @param {string} id
 */
function handleTabClick(id) {
  if (id !== activeTabId.value) {
    store.dispatch('switchToTab', id)
  }
}

/**
 * @param {{ id: string, closeable: boolean }} tab
 */
function handleMiddleClick(tab) {
  if (tab.closeable) {
    store.dispatch('closeTab', tab.id)
  }
}

/**
 * @param {string} id
 */
function handleCloseTab(id) {
  store.dispatch('closeTab', id)
}

// Scroll the active tab into view when it changes
watch(activeTabId, async (newId) => {
  await nextTick()
  const barEl = tabsBar.value
  if (!barEl) { return }
  const activeEl = barEl.querySelector('.activeTab')
  if (activeEl) {
    activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }
})
</script>

<style scoped src="./BrowserTabs.css" />
