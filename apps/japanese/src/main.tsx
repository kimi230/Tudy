import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { handleOAuthHashIfPresent, setDefaultLanguage } from '@stdylang/shared'

// Set language for Supabase queries
setDefaultLanguage('ja');

handleOAuthHashIfPresent().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
