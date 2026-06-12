import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('SW registered:', registration.scope)
      }).catch((error) => {
        console.error('SW registration failed:', error)
      })
    })
  } else {
    // Em desenvolvimento, desregistra o Service Worker e limpa cache para evitar conflitos de HMR
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((unregistered) => {
          if (unregistered) {
            console.log('SW desregistrado em desenvolvimento para evitar conflito de cache.')
          }
        })
      }
    })
    caches.keys().then((keys) => {
      for (const key of keys) {
        caches.delete(key)
      }
    })
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
