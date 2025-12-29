import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Ensure React is available globally for Ant Design 6.x compatibility
// Ant Design 6.x checks React.version which needs to be accessible
if (typeof window !== 'undefined') {
  window.React = React;
  // Ensure React.version exists (React 19 might not expose it the same way)
  if (React && !React.version) {
    Object.defineProperty(React, 'version', {
      value: '19.2.0',
      writable: false,
      configurable: false,
    });
  }
}

import { ConfigProvider, App as AntdApp } from 'antd'
import lvLV from 'antd/locale/lv_LV'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { InvoiceDataProvider } from './contexts/InvoiceDataContext'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import App from './App.jsx'

// Ant Design theme configuration - moved outside component to prevent recreation
const themeConfig = {
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
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <InvoiceDataProvider>
            <NotificationProvider>
              <ConfigProvider theme={themeConfig} locale={lvLV}>
                <AntdApp>
                  <App />
                </AntdApp>
              </ConfigProvider>
            </NotificationProvider>
          </InvoiceDataProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
