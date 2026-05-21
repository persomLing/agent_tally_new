import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Bill store — primarily used for global refresh signaling.
 * When a bill is created, edited, or deleted, components can watch `refreshKey`
 * to know they need to reload data.
 */

export const useBillStore = defineStore('bill', () => {
  const refreshKey = ref(0)

  /** Notify all watchers that bills have changed */
  function notifyBillChanged() {
    refreshKey.value++
  }

  return { refreshKey, notifyBillChanged }
})
