import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MsalProvider } from '@azure/msal-react'
import './index.css'
import App from './App.tsx'
import { ensureMsalInitialized, getMsalInstance } from './infrastructure/auth/msalInstance'

async function bootstrap() {
  await ensureMsalInitialized()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={getMsalInstance()}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MsalProvider>
    </StrictMode>,
  )
}

void bootstrap()
