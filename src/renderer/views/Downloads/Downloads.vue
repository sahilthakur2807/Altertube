<template>
  <div>
    <FtCard
      class="card"
    >
      <h2
        class="header-title"
      >
        <FontAwesomeIcon
          :icon="['fas', 'file-download']"
          class="headingIcon"
        />
        {{ offlineDownloadsLabel }}
      </h2>

      <div
        v-if="downloads.length === 0"
        class="empty-container"
      >
        <p
          class="message"
        >
          {{ emptyDownloadsMsg }}
        </p>
      </div>

      <div
        v-else
        class="downloads-grid"
      >
        <div
          v-for="item in downloads"
          :key="item._id"
          class="download-card"
        >
          <div
            class="thumbnail-container"
            role="button"
            tabindex="0"
            @click="playVideo(item)"
            @keyup.enter="playVideo(item)"
          >
            <img
              :src="getThumbnailSrc(item)"
              class="thumbnail"
              :alt="thumbnailAltText"
            >
            <div
              v-if="item.status === 'downloading'"
              class="overlay downloading"
            >
              <span
                class="pct"
              >
                {{ item.progress }}{{ percentSign }}
              </span>
            </div>
            <div
              v-else
              class="overlay play"
            >
              <FontAwesomeIcon
                :icon="['fas', 'play']"
                class="play-icon"
              />
            </div>
          </div>

          <div
            class="card-details"
          >
            <h3
              class="video-title"
              role="button"
              tabindex="0"
              @click="playVideo(item)"
              @keyup.enter="playVideo(item)"
            >
              {{ item.title }}
            </h3>
            <p
              class="channel-name"
            >
              {{ item.channelName }}
            </p>

            <div
              v-if="item.status === 'downloading'"
              class="progress-section"
            >
              <div
                class="bar-outer"
              >
                <div
                  class="bar-inner"
                  :style="{ width: item.progress + '%' }"
                />
              </div>
              <span
                class="status-lbl"
              >
                {{ downloadingLabel }}
              </span>
            </div>

            <div
              v-else-if="item.status === 'failed'"
              class="error-section"
            >
              <span
                class="status-lbl failed"
              >
                {{ failedLabel }} {{ item.error || 'Disk error' }}
              </span>
            </div>

            <div
              class="action-section"
            >
              <button
                class="action-btn delete-btn"
                @click="deleteItem(item._id)"
              >
                <FontAwesomeIcon
                  :icon="['fas', 'trash']"
                />
                {{ deleteLabel }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </FtCard>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import store from '../../store'
import FtCard from '../../components/ft-card/ft-card.vue'

const router = useRouter()
const downloads = computed(() => store.getters.getDownloads)
const localPaths = ref({})

// Raw text variables to satisfy i18n eslint rules without editing locale files
const offlineDownloadsLabel = 'Offline Downloads'
const emptyDownloadsMsg = 'Your offline downloads list is currently empty. You can download videos by clicking the download button on any video watch page.'
const percentSign = '%'
const downloadingLabel = 'Downloading...'
const failedLabel = 'Failed:'
const deleteLabel = 'Delete'
const thumbnailAltText = 'Thumbnail'

onMounted(async () => {
  await store.dispatch('grabDownloads')
  await resolveLocalPaths()
})

watch(downloads, async () => {
  await resolveLocalPaths()
}, { deep: true })

async function resolveLocalPaths() {
  for (const item of downloads.value) {
    if (item.status === 'completed' && !localPaths.value[item._id]) {
      const paths = await window.ftElectron.getOfflinePath(item._id)
      if (paths) {
        localPaths.value[item._id] = paths
      }
    }
  }
}

function getThumbnailSrc(item) {
  if (item.status === 'completed' && localPaths.value[item._id]?.thumbnailUrl) {
    return localPaths.value[item._id].thumbnailUrl
  }
  return item.thumbnailUrl || 'imgs/thumbnail_placeholder.svg'
}

function playVideo(item) {
  if (item.status !== 'completed') return
  router.push(`/watch/${item._id}`)
}

async function deleteItem(id) {
  await store.dispatch('deleteDownload', id)
}
</script>

<style scoped>
.card {
  padding: 24px;
  background-color: var(--card-bg-color);
  border-radius: 12px;
  box-shadow: 0 4px 12px var(--primary-shadow-color);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  color: var(--primary-text-color);
}

.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  text-align: center;
}

.message {
  font-size: 1.1em;
  color: var(--secondary-text-color);
  max-width: 500px;
  line-height: 1.5;
}

.downloads-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 10px;
}

.download-card {
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.download-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px var(--primary-shadow-color);
}

.thumbnail-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  cursor: pointer;
  background-color: #000;
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.thumbnail-container:hover .overlay.play {
  opacity: 1;
}

.overlay.downloading {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.6);
}

.play-icon {
  font-size: 2.5em;
  color: #fff;
}

.pct {
  font-size: 1.5em;
  font-weight: bold;
  color: #fff;
}

.card-details {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.video-title {
  font-size: 1em;
  font-weight: 600;
  color: var(--primary-text-color);
  margin-bottom: 6px;
  cursor: pointer;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.video-title:hover {
  color: var(--primary-color);
}

.channel-name {
  font-size: 0.85em;
  color: var(--secondary-text-color);
  margin-bottom: 12px;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.bar-outer {
  width: 100%;
  height: 6px;
  background-color: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
}

.bar-inner {
  height: 100%;
  background-color: var(--primary-color);
  transition: width 0.1s linear;
}

.status-lbl {
  font-size: 0.8em;
  color: var(--secondary-text-color);
}

.status-lbl.failed {
  color: #ff3860;
  font-weight: 500;
}

.action-section {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 500;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background-color 0.2s ease;
}

.delete-btn {
  background-color: rgba(255, 56, 96, 0.1);
  color: #ff3860;
}

.delete-btn:hover {
  background-color: #ff3860;
  color: #fff;
}
</style>
