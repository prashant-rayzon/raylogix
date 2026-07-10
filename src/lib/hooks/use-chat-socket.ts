import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { getAuthStore } from '@/lib/auth'

export type ChatSocketSendMessagePayload = {
  senderId: string
  recipientId: string
  content: string
  senderName?: string
}

export function useChatSocket({
  serverUrl,
  currentUser,
  onReceiveMessage,
  onUserStatusChange,
  onUserTyping,
  onUserStopTyping,
}: {
  serverUrl: string
  currentUser: { userId: string; username?: string; avatar?: string } | null
  onReceiveMessage?: (msg: any) => void
  onUserStatusChange?: (payload: any) => void
  onUserTyping?: (payload: any) => void
  onUserStopTyping?: (payload: any) => void
}) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  const authToken = useMemo(() => {
    return getAuthStore()?.accessToken
  }, [])


  useEffect(() => {
    const normalizedUrl = (serverUrl || '').replace(/\/api\/?$/, '')
    const socket = io(normalizedUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        token: authToken,
      },
      reconnection: true,
      timeout: 20000,
      autoConnect: true,
    })

    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('receive-message', (msg) => onReceiveMessage?.(msg))
    socket.on('user-status-change', (payload) =>
      onUserStatusChange?.(payload)
    )
    socket.on('user-typing', (payload) => onUserTyping?.(payload))
    socket.on('user-stop-typing', (payload) => onUserStopTyping?.(payload))

    // Real-time notifications
    socket.on('notification:new', (payload) => {
      // Intentionally no-op here. NotificationContext will attach its own listener.
      void payload
    })







    return () => {

      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [serverUrl, authToken, onReceiveMessage, onUserStatusChange, onUserTyping, onUserStopTyping])

  useEffect(() => {
    if (!socketRef.current) return
    if (!currentUser) return
    socketRef.current.emit('user-join', {
      userId: currentUser.userId,
      username: currentUser.username,
      avatar: currentUser.avatar,
    })
  }, [currentUser])

  const sendMessage = (payload: ChatSocketSendMessagePayload) => {
    socketRef.current?.emit('send-message', payload)
  }

  const sendTyping = (payload: any) => {
    socketRef.current?.emit('user-typing', payload)
  }

  const sendStopTyping = (payload: any) => {
    socketRef.current?.emit('user-stop-typing', payload)
  }


  return { connected, sendMessage, sendTyping, sendStopTyping, socket: socketRef.current }
}


