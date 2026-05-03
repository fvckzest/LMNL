import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import './index.css'
import App from './App.jsx'

const PRELOAD_RETRY_KEY = 'lmnl:preload-retry'

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
