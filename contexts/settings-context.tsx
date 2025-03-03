"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface SettingsType {
  rpcUrl: string
  wsUrl: string
  blockEngine: string
  jitoProxyless: boolean
  jitoTipAmount: string
  devBuy: string
  minBuy: string
  maxBuy: string
}

interface SettingsContextType {
  settings: SettingsType
  updateSettings: (newSettings: Partial<SettingsType>) => void
}

const defaultSettings: SettingsType = {
  rpcUrl: "",
  wsUrl: "",
  blockEngine: "",
  jitoProxyless: false,
  jitoTipAmount: "",
  devBuy: "",
  minBuy: "",
  maxBuy: "",
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => null,
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsType>(defaultSettings)

  // Load settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("mortality-settings")
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(parsed)
      } catch (error) {
        console.error("Error parsing saved settings:", error)
        localStorage.removeItem("mortality-settings")
      }
    }
  }, [])

  const updateSettings = (newSettings: Partial<SettingsType>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings }
      try {
        localStorage.setItem("mortality-settings", JSON.stringify(updated))
      } catch (error) {
        console.error("Error saving settings:", error)
      }
      return updated
    })
  }

  return <SettingsContext.Provider value={{ settings, updateSettings }}>{children}</SettingsContext.Provider>
}

export const useSettings = () => useContext(SettingsContext)

