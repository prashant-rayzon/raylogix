// services/notificationService.ts
export class NotificationService {
  private static instance: NotificationService
  private permission: NotificationPermission = 'default'
  private audioContext: AudioContext | null = null

  private constructor() {
    this.init()
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  async init() {
    if ('Notification' in window) {
      this.permission = await Notification.permission
      if (this.permission === 'default') {
        await this.requestPermission()
      }
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false
    
    try {
      const permission = await Notification.requestPermission()
      this.permission = permission
      return permission === 'granted'
    } catch (error) {
      console.error('Notification permission error:', error)
      return false
    }
  }

  showNotification(
    title: string,
    options: {
      body?: string
      icon?: string
      image?: string
      badge?: string
      tag?: string
      data?: any
      requireInteraction?: boolean
      silent?: boolean
      actions?: any[]
    } = {}
  ) {
    if (this.permission !== 'granted') return null

    try {
      const notification = new Notification(title, {
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        body: options.body || '',
        tag: options.tag || `msg-${Date.now()}`,
        data: options.data || {},
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        actions: options.actions || [],
        ...options
      })

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault()
        window.focus()
        if (options.data?.onClick) {
          options.data.onClick(notification.data)
        }
        notification.close()
      }

      // Auto close after 8 seconds
      setTimeout(() => notification.close(), 8000)

      return notification
    } catch (error) {
      console.error('Error showing notification:', error)
      return null
    }
  }

  playNotificationSound() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      // Create a simple beep sound
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2)

      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + 0.2)
    } catch (error) {
      console.debug('Could not play notification sound:', error)
    }
  }
}

export const notificationService = NotificationService.getInstance()