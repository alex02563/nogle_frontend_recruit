import { createPinia } from 'pinia'
import { createApp } from 'vue'

import './assets/scss/style.scss'
import App from './App.vue'

const pinia = createPinia()

createApp(App).use(pinia).mount('#app')
