"use client"

import { createContext, useContext, type ReactNode } from "react"

interface UserContextType {
  isPremium: boolean
}

const UserContext = createContext<UserContextType>({ isPremium: false })

export function UserProvider({ children, isPremium = false }: { children: ReactNode; isPremium?: boolean }) {
  return <UserContext.Provider value={{ isPremium }}>{children}</UserContext.Provider>
}

export const useUser = () => useContext(UserContext)

