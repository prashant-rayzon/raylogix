
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { AuthUser } from '@/api/types'
import { getAuthStore, loginUser, logoutApi, logoutUser } from '@/lib/auth'
import { getMe, login, refreshToken as refreshTokenApi } from '@/api/services/auth'

type AuthState = {
  user: AuthUser | null
  accessToken?: string
  refreshToken?: string
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error?: string
}

const initial: AuthState = (() => {
  const store = getAuthStore()
  return {
    user: store.user,
    accessToken: store.accessToken,
    refreshToken: store.refreshToken,
    status: 'idle',
    error: undefined,
  }
})()


export const loginThunk = createAsyncThunk(
  'auth/login',
  async (
    payload: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await login(payload)

      loginUser({
        user: res.user,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      })

      return res
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error ||
        err?.message ||
        'Login failed'
      )
    }
  }
)
export const refreshThunk = createAsyncThunk(
  'auth/refresh',
  async () => {
    const store = getAuthStore()
    if (!store.refreshToken) throw new Error('No refresh token')

    const res = await refreshTokenApi(store.refreshToken)

    loginUser({
      user: store.user,
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
    })

    return res
  }
)

export const meThunk = createAsyncThunk('auth/me', async () => {
  const res = await getMe()
  return res.user
})

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  const store = getAuthStore()
  if (store.refreshToken) {
    try {
      await logoutApi()
    } catch { }
  }
  logoutUser()
})

const authSlice = createSlice({
  name: 'auth',
  initialState: initial,
  reducers: {
    clearError(state) {
      state.error = undefined
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.status = 'loading'
        state.error = undefined
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
      })

      .addCase(loginThunk.rejected, (state) => {
        state.status = 'failed'
      })
      .addCase(refreshThunk.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
      })

      .addCase(meThunk.fulfilled, (state, action) => {
        state.user = action.payload
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.status = 'idle'
        state.error = undefined
        state.user = null
        state.accessToken = undefined
        state.refreshToken = undefined
      })
  },
})

export const { clearError } = authSlice.actions
export default authSlice.reducer

