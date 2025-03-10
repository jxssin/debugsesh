"use client"

import { AuthProvider } from "@/contexts/auth-context"
import { SettingsProvider } from "@/contexts/settings-context"
import { UserProvider } from "@/contexts/user-context"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster as ShadcnToaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="mortality-app-theme">
      <AuthProvider>
        <UserProvider>
          <SettingsProvider>
            {children}
            {/* Keep the original toaster for backward compatibility */}
            <ShadcnToaster />
            {/* Add Sonner for stacked toasts */}
            <SonnerToaster 
              position="top-right" 
              closeButton
              theme="system"
              richColors
              duration={5000}
              visibleToasts={6} 
              toastOptions={{ 
                style: { 
                  opacity: 1 
                }
              }}
            />
          </SettingsProvider>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}