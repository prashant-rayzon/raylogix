import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'

import type { RootState } from '../index'



import {
  getUsers as getUsersService,
  getMessages as getMessagesService,
  markAllAsRead as markAllAsReadService,
  sendMessageRest as sendMessageRestService,
} from '@/api/services/chat'

type ChatState = {
  users: any[]
  usersStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  usersError?: string

  messages: Record<string, any[]> // key: otherUserId
  messagesStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  messagesError?: string

  unreadBumpedAt?: number
}

const initialState: ChatState = {
  users: [],
  usersStatus: 'idle',
  messages: {},
  messagesStatus: 'idle',
}

export const fetchUsersThunk = createAsyncThunk(
  'chat/fetchUsers',
  async () => {
    const res = await getUsersService()
    return res
  }
)

export const fetchMessagesThunk = createAsyncThunk(
  'chat/fetchMessages',
  async (
    payload: {
      meUserId: string
      otherUserId: string
      limit?: number
      before?: string
    }
  ) => {
    const { meUserId, otherUserId, limit = 50, before } = payload
    const res = await getMessagesService(meUserId, otherUserId, {
      limit,
      before,
    })
    return {
      otherUserId,
      data: res,
    }
  }
)

export const markAllAsReadThunk = createAsyncThunk(
  'chat/markAllAsRead',
  async (senderId: string) => {
    const res = await markAllAsReadService(senderId)
    return res
  }
)

export const sendMessageRestThunk = createAsyncThunk(
  'chat/sendMessageRest',
  async (payload: {
    recipientId: string
    content: string
    replyToId?: string
    type?: string
  }) => {
    const res = await sendMessageRestService(payload)
    return {
      recipientId: payload.recipientId,
      data: res,
    }
  }
)

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    resetMessagesForUser(state, action: PayloadAction<{ otherUserId: string }>) {
      state.messages[action.payload.otherUserId] = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsersThunk.pending, (state) => {
        state.usersStatus = 'loading'
        state.usersError = undefined
      })
      .addCase(fetchUsersThunk.fulfilled, (state, action) => {
        state.usersStatus = 'succeeded'
        state.users = Array.isArray(action.payload) ? action.payload : (action.payload?.data ?? [])
      })
      .addCase(fetchUsersThunk.rejected, (state, action) => {
        state.usersStatus = 'failed'
        state.usersError = action.error.message
      })
      .addCase(fetchMessagesThunk.pending, (state) => {
        state.messagesStatus = 'loading'
        state.messagesError = undefined
      })
      .addCase(fetchMessagesThunk.fulfilled, (state, action) => {
        state.messagesStatus = 'succeeded'
        const otherUserId = action.payload.otherUserId
        const res = action.payload.data
        const list = Array.isArray(res?.data) ? res.data : action.payload.data?.data ?? []
        // If this is "before" pagination, caller can choose replace/append. We'll just replace for now.
        state.messages[otherUserId] = list
      })
      .addCase(fetchMessagesThunk.rejected, (state, action) => {
        state.messagesStatus = 'failed'
        state.messagesError = action.error.message
      })
  },
})

export const { resetMessagesForUser } = chatSlice.actions
export default chatSlice.reducer

export const selectChatUsers = (state: RootState) => state.chat.users
export const selectChatMessages = (state: RootState, otherUserId: string) =>
  state.chat.messages[otherUserId] ?? []

