import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'

import authReducer from './slices/authSlice'
import chatReducer from './slices/chatSlice'
import loadReducer from './slices/loadSlice'
import bidReducer from './slices/bidSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    load: loadReducer,
    bid: bidReducer,
  },
})


export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector


