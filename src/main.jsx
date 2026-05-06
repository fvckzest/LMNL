import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import './index.css'
import App from './App.jsx'
import { initializeTheme } from './components/ThemeProvider.jsx'

const PRELOAD_RETRY_KEY = 'lmnl:preload-retry'
const DEV_SW_RESET_KEY = 'lmnl:dev-sw-reset'

function isLocalDevOrigin() {
  return import.meta.env.DEV
    && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
}

async function resetLocalDevServiceWorkers() {
  if (!isLocalDevOrigin() || !('serviceWorker' in navigator)) {
    return
  }

  const registrations = await navigator.serviceWorker.getRegistrations()

  if (!registrations.length) {
    sessionStorage.removeItem(DEV_SW_RESET_KEY)
    return
  }

  await Promise.allSettled(registrations.map((registration) => registration.unregister()))

  if ('caches' in window) {
    const cacheKeys = await window.caches.keys()
    await Promise.allSettled(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)))
  }

  if (navigator.serviceWorker.controller && sessionStorage.getItem(DEV_SW_RESET_KEY) !== '1') {
    sessionStorage.setItem(DEV_SW_RESET_KEY, '1')
    window.location.reload()
    return
  }

  sessionStorage.removeItem(DEV_SW_RESET_KEY)
}

initializeTheme()
resetLocalDevServiceWorkers()

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()

  const hasRetried = sessionStorage.getItem(PRELOAD_RETRY_KEY) === '1'
  if (hasRetried) {
    sessionStorage.removeItem(PRELOAD_RETRY_KEY)
    return
  }

  sessionStorage.setItem(PRELOAD_RETRY_KEY, '1')
  window.location.reload()
})

window.addEventListener('pageshow', () => {
  sessionStorage.removeItem(PRELOAD_RETRY_KEY)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
