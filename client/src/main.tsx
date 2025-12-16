import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { RoomStoreProvider } from './lib/roomStore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RoomStoreProvider>
        <App />
      </RoomStoreProvider>
    </BrowserRouter>
  </StrictMode>,
)
