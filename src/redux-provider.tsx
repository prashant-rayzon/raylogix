import { Provider } from 'react-redux'
import { type ReactNode } from 'react'

import { store } from '@/store'
import AuthBootstrap from '@/components/auth-bootstrap'

export function ReduxProvider({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <AuthBootstrap />
      {children}
    </Provider>
  )
}


