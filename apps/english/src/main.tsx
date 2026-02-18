import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { handleOAuthHashIfPresent } from '@stdylang/shared'

// OAuth 해시 토큰 처리 후 React 마운트 (HashRouter 충돌 방지)
handleOAuthHashIfPresent().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
