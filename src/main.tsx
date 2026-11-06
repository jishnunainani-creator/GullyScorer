import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Register PWA service worker for full offline capability
registerSW({ immediate: true })

window.addEventListener('error', (event) => {
  const root = document.getElementById('root')
  if (root && root.innerHTML.trim() === '') {
    root.innerHTML = `
      <div style="background:#080C0E;color:#f87171;padding:24px;font-family:monospace;min-height:100vh">
        <h2 style="color:white;font-size:18px;margin-bottom:8px">Startup Error Encountered</h2>
        <p style="font-size:14px">${event.message || 'Unknown initialization error'}</p>
        <button onclick="location.reload()" style="background:#10b981;color:black;border:none;padding:8px 16px;border-radius:8px;font-weight:bold;margin-top:16px;cursor:pointer">Reload Page</button>
      </div>
    `
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
