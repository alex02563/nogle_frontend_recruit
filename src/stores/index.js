
import { defineStore } from 'pinia'

export const useIndexStore = defineStore('index', {
  state: () => ({
    activeWsKey: '',
    wsMsg: {},
  }),
  actions: {
    activeWs(key) {
      if (key) {
        this.activeWsKey = key
      }
    },
    setWsMsg(data) {
      this.wsMsg = data
    }
  },
})