import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const MOBILE_STORAGE_KEY = 'deepspaceArchiveMobile'

const params = new URLSearchParams(window.location.search)

if (params.get('dsaMobile') === '1') {
  localStorage.setItem(MOBILE_STORAGE_KEY, 'true')

  params.delete('dsaMobile')

  const query = params.toString()

  const cleanUrl =
    window.location.pathname +
    (query ? `?${query}` : '') +
    window.location.hash

  window.history.replaceState(
    {},
    '',
    cleanUrl
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)