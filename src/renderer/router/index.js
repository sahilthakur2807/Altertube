import { createRouter, createWebHashHistory } from 'vue-router'
import Subscriptions from '../views/Subscriptions/Subscriptions.vue'
import SubscribedChannels from '../views/SubscribedChannels/SubscribedChannels.vue'
import ProfileSettings from '../views/ProfileSettings/ProfileSettings.vue'
import Trending from '../views/Trending/Trending.vue'
import Popular from '../views/Popular/Popular.vue'
import UserPlaylists from '../views/UserPlaylists/UserPlaylists.vue'
import History from '../views/History/History.vue'
import Settings from '../views/Settings/Settings.vue'
import About from '../views/About/About.vue'
import SearchPage from '../views/SearchPage/SearchPage.vue'
import Playlist from '../views/Playlist/Playlist.vue'
import Channel from '../views/Channel/Channel.vue'
import Watch from '../views/Watch/Watch.vue'
import Hashtag from '../views/Hashtag/Hashtag.vue'
import Post from '../views/Post.vue'

/**
 * Paths that should always open in a new tab instead of navigating
 * within the current view.
 */
const TAB_SPAWNING_PREFIXES = [
  '/watch/',
  '/search/',
  '/channel/',
  '/playlist/',
  '/hashtag/',
  '/post/',
]

/**
 * Returns true if the given path should be opened in a new tab.
 * @param {string} path
 * @returns {boolean}
 */
export function isTabSpawningPath(path) {
  return TAB_SPAWNING_PREFIXES.some(prefix => path.startsWith(prefix))
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'default',
      meta: {
        title: 'Subscriptions'
      },
      component: Subscriptions
    },
    {
      path: '/subscriptions',
      name: 'subscriptions',
      meta: {
        title: 'Subscriptions'
      },
      component: Subscriptions
    },
    {
      path: '/subscribedchannels',
      name: 'subscribedChannels',
      meta: {
        title: 'Channels'
      },
      component: SubscribedChannels
    },
    ...(process.env.SUPPORTS_LOCAL_API
      ? [{
          path: '/trending',
          name: 'trending',
          meta: {
            title: 'Trending'
          },
          component: Trending
        }]
      : []),
    {
      path: '/popular',
      name: 'popular',
      meta: {
        title: 'Most Popular'
      },
      component: Popular
    },
    {
      path: '/userplaylists',
      name: 'userPlaylists',
      meta: {
        title: 'Your Playlists'
      },
      component: UserPlaylists
    },
    {
      path: '/history',
      name: 'history',
      meta: {
        title: 'History'
      },
      component: History
    },
    {
      path: '/settings',
      name: 'settings',
      meta: {
        title: 'Settings'
      },
      component: Settings
    },
    {
      path: '/about',
      name: 'about',
      meta: {
        title: 'About'
      },
      component: About
    },
    {
      path: '/downloads',
      name: 'downloads',
      meta: {
        title: 'Downloads'
      },
      component: () => import('../views/Downloads/Downloads.vue')
    },
    {
      path: '/settings/profile',
      name: 'profileSettings',
      meta: {
        title: 'Profile Settings'
      },
      component: ProfileSettings
    },
    {
      path: '/search/:query',
      meta: {
        title: 'Search Results'
      },
      component: SearchPage
    },
    {
      path: '/playlist/:id',
      meta: {
        title: 'Playlist'
      },
      component: Playlist
    },
    {
      path: '/channel/:id/:currentTab?',
      meta: {
        title: 'Channel'
      },
      component: Channel
    },
    {
      path: '/watch/:id',
      meta: {
        title: 'Watch'
      },
      component: Watch
    },
    {
      path: '/hashtag/:hashtag',
      meta: {
        title: 'Hashtag'
      },
      component: Hashtag
    },
    {
      path: '/post/:id',
      meta: {
        title: 'Post',
      },
      component: Post
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (savedPosition !== null) {
          resolve(savedPosition)
        } else {
          resolve({ left: 0, top: 0 })
        }
      }, 500)
    })
  }
})

/**
 * Flag to prevent the tab navigation guard from intercepting
 * router.replace() calls made by the tab system itself.
 * @type {boolean}
 */
let skipTabInterception = false

/**
 * Called by the tabs Vuex module before/after it calls router.replace().
 * @param {boolean} value
 */
export function setSkipTabInterception(value) {
  skipTabInterception = value
}

const PERSISTENT_PATHS = [
  '/subscriptions',
  '/subscribedchannels',
  '/trending',
  '/popular',
  '/userplaylists',
  '/history',
  '/settings',
  '/about',
  '/downloads',
  '/'
]

/**
 * Navigation guard that intercepts "content" navigations and opens them in a
 * new tab instead of replacing the current view.
 *
 * This guard is installed after the store is ready (called from App.vue).
 * @param {import('vuex').Store} store
 */
export function installTabNavigationGuard(store) {
  router.beforeEach((to) => {
    // If the tab system itself triggered this navigation, let it through
    if (skipTabInterception) {
      return true
    }

    // 1. Only intercept navigations to tab-spawning paths
    if (isTabSpawningPath(to.path)) {
      // Dispatch to Vuex — opens a new tab and calls router.replace internally
      store.dispatch('openInNewTab', {
        path: to.path,
        query: to.query,
      })
      // Cancel this navigation; the tab action will call router.replace
      return false
    }

    // 2. Intercept sidebar/main navigation to open in dedicated tabs
    const isSidebarPath = PERSISTENT_PATHS.includes(to.path) || to.path.startsWith('/settings/')
    if (isSidebarPath) {
      const existingTab = store.getters.getTabs.find(t => t.path === to.path)
      if (existingTab) {
        store.dispatch('switchToTab', existingTab.id)
      } else {
        store.dispatch('openInNewTab', {
          path: to.path,
          query: to.query,
        })
      }
      return false
    }

    // For sidebar / non-content navigations: update the active tab's stored route
    const activeTabId = store.getters.getActiveTabId
    if (activeTabId) {
      store.commit('updateTabRoute', {
        id: activeTabId,
        path: to.path,
        query: to.query,
      })
    }

    return true
  })
}

export default router
