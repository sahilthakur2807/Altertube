import router, { setSkipTabInterception } from '../../router/index'

/**
 * @param {string} path
 * @returns {{ icon: string[], label: string }}
 */
function getTabMeta(path) {
  if (path.startsWith('/watch/')) {
    return { icon: ['fas', 'play'], label: 'Video' }
  } else if (path.startsWith('/search/')) {
    const query = decodeURIComponent(path.replace('/search/', ''))
    return { icon: ['fas', 'search'], label: query || 'Search' }
  } else if (path.startsWith('/channel/')) {
    return { icon: ['fas', 'user'], label: 'Channel' }
  } else if (path.startsWith('/playlist/')) {
    return { icon: ['fas', 'list'], label: 'Playlist' }
  } else if (path.startsWith('/hashtag/')) {
    return { icon: ['fas', 'hashtag'], label: decodeURIComponent(path.replace('/hashtag/', '')) || 'Hashtag' }
  } else if (path.startsWith('/post/')) {
    return { icon: ['fas', 'file-alt'], label: 'Post' }
  } else if (path.startsWith('/subscriptions') || path === '/') {
    return { icon: ['fas', 'rss'], label: 'Subscriptions' }
  } else if (path.startsWith('/history')) {
    return { icon: ['fas', 'history'], label: 'History' }
  } else if (path.startsWith('/trending')) {
    return { icon: ['fas', 'fire'], label: 'Trending' }
  } else if (path.startsWith('/popular')) {
    return { icon: ['fas', 'users'], label: 'Popular' }
  } else if (path.startsWith('/settings')) {
    return { icon: ['fas', 'sliders-h'], label: 'Settings' }
  } else if (path.startsWith('/about')) {
    return { icon: ['fas', 'info-circle'], label: 'About' }
  } else if (path.startsWith('/userplaylists')) {
    return { icon: ['fas', 'bookmark'], label: 'Playlists' }
  } else if (path.startsWith('/subscribedchannels')) {
    return { icon: ['fas', 'user-check'], label: 'Channels' }
  }
  return { icon: ['fas', 'circle'], label: 'Tab' }
}

let nextTabId = 1

/**
 * @returns {string}
 */
function generateTabId() {
  return `tab_${nextTabId++}`
}

/**
 * @param {object} options
 * @param {string} options.path
 * @param {object} [options.query]
 * @param {string} [options.title]
 * @param {boolean} [options.closeable]
 * @returns {object}
 */
function createTab({ path, query = {}, title = '', closeable = true }) {
  const id = generateTabId()
  const meta = getTabMeta(path)
  return {
    id,
    path,
    query,
    title: title || meta.label,
    icon: meta.icon,
    closeable,
    scrollTop: 0,
  }
}

const state = () => ({
  /** @type {Array<{id: string, path: string, query: object, title: string, icon: string[], closeable: boolean, scrollTop: number}>} */
  tabs: [],
  /** @type {string} */
  activeTabId: '',
})

const mutations = {
  /**
   * @param {object} state
   * @param {object} tab
   */
  addTab(state, tab) {
    state.tabs.push(tab)
  },

  /**
   * @param {object} state
   * @param {string} id
   */
  removeTab(state, id) {
    const idx = state.tabs.findIndex(t => t.id === id)
    if (idx !== -1) {
      state.tabs.splice(idx, 1)
    }
  },

  /**
   * @param {object} state
   * @param {string} id
   */
  setActiveTabId(state, id) {
    state.activeTabId = id
  },

  /**
   * @param {object} state
   * @param {{ id: string, path: string, query: object }} payload
   */
  updateTabRoute(state, { id, path, query = {} }) {
    const tab = state.tabs.find(t => t.id === id)
    if (tab) {
      tab.path = path
      tab.query = query
      const meta = getTabMeta(path)
      // Only update title/icon from meta if the title hasn't been set by the page itself
      if (!tab._titleSetByPage) {
        tab.title = meta.label
        tab.icon = meta.icon
      }
    }
  },

  /**
   * @param {object} state
   * @param {{ id: string, title: string }} payload
   */
  updateTabTitle(state, { id, title }) {
    const tab = state.tabs.find(t => t.id === id)
    if (tab) {
      tab.title = title
      tab._titleSetByPage = true
    }
  },

  /**
   * @param {object} state
   * @param {{ id: string, icon: string[] }} payload
   */
  updateTabIcon(state, { id, icon }) {
    const tab = state.tabs.find(t => t.id === id)
    if (tab) {
      tab.icon = icon
    }
  },

  /**
   * @param {object} state
   * @param {{ id: string, scrollTop: number }} payload
   */
  updateTabScroll(state, { id, scrollTop }) {
    const tab = state.tabs.find(t => t.id === id)
    if (tab) {
      tab.scrollTop = scrollTop
    }
  },
}

const actions = {
  /**
   * Initialize the tab system with the landing page tab.
   * @param {object} context
   * @param {string} landingPath
   */
  initTabs(context, landingPath) {
    const { commit } = context
    const savedStateStr = sessionStorage.getItem('ft_reload_state')
    if (savedStateStr) {
      try {
        const savedState = JSON.parse(savedStateStr)
        sessionStorage.removeItem('ft_reload_state')
        if (savedState.tabs && savedState.tabs.length > 0) {
          const tabIds = savedState.tabs.map(t => parseInt(t.id.replace('tab_', '')) || 0)
          const maxId = Math.max(0, ...tabIds)
          nextTabId = maxId + 1

          for (const tab of savedState.tabs) {
            commit('addTab', tab)
          }
          commit('setActiveTabId', savedState.activeTabId)

          if (savedState.resumeVideoId && savedState.resumeTimestamp !== null) {
            window.ft_reload_resume_video_id = savedState.resumeVideoId
            window.ft_reload_resume_time = savedState.resumeTimestamp
          }

          const activeTab = savedState.tabs.find(t => t.id === savedState.activeTabId)
          if (activeTab) {
            setSkipTabInterception(true)
            router.replace({ path: activeTab.path, query: activeTab.query }).finally(() => {
              setSkipTabInterception(false)
            })
          }
          return
        }
      } catch (err) {
        console.error('Failed to restore reload state:', err)
      }
    }

    const tab = createTab({ path: landingPath, closeable: false })
    commit('addTab', tab)
    commit('setActiveTabId', tab.id)
  },

  /**
   * Open a new tab navigated to the given path.
   * @param {object} context
   * @param {{ path: string, query?: object, title?: string }} payload
   */
  openInNewTab(context, { path, query = {}, title = '' }) {
    const { commit } = context
    const tab = createTab({ path, query, title })
    commit('addTab', tab)
    commit('setActiveTabId', tab.id)

    // Navigate the router to the new tab's path
    setSkipTabInterception(true)
    router.replace({ path, query }).finally(() => {
      setSkipTabInterception(false)
    })
  },

  /**
   * Switch to an existing tab by ID.
   * @param {object} context
   * @param {string} id
   */
  switchToTab(context, id) {
    const { state, commit } = context
    if (id === state.activeTabId) { return }

    const tab = state.tabs.find(t => t.id === id)
    if (!tab) { return }

    commit('setActiveTabId', id)

    // Navigate the router to the tab's stored path
    setSkipTabInterception(true)
    router.replace({ path: tab.path, query: tab.query }).finally(() => {
      setSkipTabInterception(false)
    })
  },

  /**
   * Close a tab by ID. Switches to an adjacent tab if the active tab is closed.
   * @param {object} context
   * @param {string} id
   */
  closeTab(context, id) {
    const { state, commit, dispatch } = context
    const idx = state.tabs.findIndex(t => t.id === id)
    if (idx === -1) { return }

    const isActive = state.activeTabId === id
    commit('removeTab', id)

    if (isActive && state.tabs.length > 0) {
      // Pick adjacent tab: prefer the one to the left, fall back to the new last
      const newActiveIdx = Math.min(idx, state.tabs.length - 1)
      const newActiveId = state.tabs[Math.max(0, newActiveIdx - 1)]?.id ?? state.tabs[0].id
      dispatch('switchToTab', newActiveId)
    }
  },
}

const getters = {
  getTabs: state => state.tabs,
  getActiveTabId: state => state.activeTabId,
  getActiveTab: state => state.tabs.find(t => t.id === state.activeTabId) ?? null,
}

export default {
  state,
  mutations,
  actions,
  getters,
}
