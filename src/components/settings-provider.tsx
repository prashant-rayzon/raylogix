import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAppSelector } from '@/store'
import { getCompanyProfile } from '@/api/services/auth'

export type ThemeColor = 'teal' | 'blue' | 'indigo' | 'purple' | 'emerald' | 'orange'
export type GlowSystem = 'high' | 'standard'

type SettingsState = {
  themeColor: ThemeColor
  setThemeColor: (color: ThemeColor) => void
  glowSystem: GlowSystem
  setGlowSystem: (glow: GlowSystem) => void
  lightLogo: string
  setLightLogo: (logo: string) => void
  darkLogo: string
  setDarkLogo: (logo: string) => void
  resetLogos: () => void
}

const SettingsContext = createContext<SettingsState | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColorState] = useState<ThemeColor>(
    () => (localStorage.getItem('rayson-theme-color') as ThemeColor) || 'teal'
  )
  const [glowSystem, setGlowSystemState] = useState<GlowSystem>(
    () => (localStorage.getItem('rayson-glow-system') as GlowSystem) || 'standard'
  )
  const [lightLogo, setLightLogoState] = useState<string>(
    () => localStorage.getItem('rayson-logo-light') || '/images/logo.png'
  )
  const [darkLogo, setDarkLogoState] = useState<string>(
    () => localStorage.getItem('rayson-logo-dark') || '/images/logo.png'
  )

  const authUser = useAppSelector((state) => (state.auth as any).user)

  useEffect(() => {
    const root = window.document.documentElement
    root.setAttribute('data-theme-color', themeColor)
  }, [themeColor])

  useEffect(() => {
    const root = window.document.documentElement
    root.setAttribute('data-glow', glowSystem)
  }, [glowSystem])

  // Sync theme settings from database on login
  useEffect(() => {
    if (!authUser) return

    const loadCompanyTheme = async () => {
      try {
        const response = await getCompanyProfile()
        if (response?.success && response?.data?.company) {
          const comp = response.data.company
          if (comp.themeColor) {
            localStorage.setItem('rayson-theme-color', comp.themeColor)
            setThemeColorState(comp.themeColor)
          }
          if (comp.glowSystem) {
            localStorage.setItem('rayson-glow-system', comp.glowSystem)
            setGlowSystemState(comp.glowSystem)
          }
          if (comp.lightLogo) {
            localStorage.setItem('rayson-logo-light', comp.lightLogo)
            setLightLogoState(comp.lightLogo)
          }
          if (comp.darkLogo) {
            localStorage.setItem('rayson-logo-dark', comp.darkLogo)
            setDarkLogoState(comp.darkLogo)
          }
        }
      } catch (err) {
        console.error('Failed to sync company theme from database:', err)
      }
    }

    loadCompanyTheme()
  }, [authUser])

  const setThemeColor = (color: ThemeColor) => {
    localStorage.setItem('rayson-theme-color', color)
    setThemeColorState(color)
  }

  const setGlowSystem = (glow: GlowSystem) => {
    localStorage.setItem('rayson-glow-system', glow)
    setGlowSystemState(glow)
  }

  const setLightLogo = (logo: string) => {
    localStorage.setItem('rayson-logo-light', logo)
    setLightLogoState(logo)
  }

  const setDarkLogo = (logo: string) => {
    localStorage.setItem('rayson-logo-dark', logo)
    setDarkLogoState(logo)
  }

  const resetLogos = () => {
    localStorage.removeItem('rayson-logo-light')
    localStorage.removeItem('rayson-logo-dark')
    setLightLogoState('/images/logo.png')
    setDarkLogoState('/images/logo.png')
  }

  return (
    <SettingsContext.Provider
      value={{
        themeColor,
        setThemeColor,
        glowSystem,
        setGlowSystem,
        lightLogo,
        setLightLogo,
        darkLogo,
        setDarkLogo,
        resetLogos,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used within a SettingsProvider')
  return context
}
