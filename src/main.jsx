import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import './index.css'
import App from './App.jsx'
// Import user creation utilities for browser console access
import './utils/addUserToFirestore.js'

// Ant Design theme configuration
const theme = {
  token: {
    colorPrimary: '#0068FF',
    borderRadius: 8,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Input: {
      borderRadius: 8,
      controlHeight: 48,
    },
    Button: {
      borderRadius: 8,
      controlHeight: 48,
      fontWeight: 600,
    },
    Card: {
      borderRadius: 12,
    },
    Spin: {
      colorPrimary: '#0068FF',
    },
  },
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ConfigProvider theme={theme}>
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </StrictMode>,
)
