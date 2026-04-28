import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { initializeColorMode } from '@/composables/useColorMode'

initializeColorMode()

createApp(App).use(createPinia()).mount('#app')
