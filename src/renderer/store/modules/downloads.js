const state = {
  downloads: []
}

const getters = {
  getDownloads: (state) => state.downloads,
  getDownloadById: (state) => (id) => undefined,
}

const mutations = {
  setDownloads(state, downloads) {},
  updateDownloadProgress(state, { videoId, progress, status, error }) {}
}

const actions = {
  async grabDownloads({ commit }) {},
  async startDownload({ dispatch }, payload) {},
  async deleteDownload({ dispatch }, videoId) {}
}

export default {
  state,
  getters,
  mutations,
  actions,
}
