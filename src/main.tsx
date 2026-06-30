import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/theme-provider'
import router from '@/router'
import '@/index.css'

import { ReduxProvider } from '@/redux-provider'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { BranchProvider } from '@/contexts/BranchContext'

// Register Service Worker for Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme='light' storageKey='vite-ui-theme'>
      <ReduxProvider>
        <BranchProvider>
          <NotificationProvider>
            <RouterProvider router={router} />
            <Toaster />
          </NotificationProvider>
        </BranchProvider>
      </ReduxProvider>
    </ThemeProvider>
  </React.StrictMode>
)

