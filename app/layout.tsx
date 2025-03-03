import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Mortality App",
  description: "Hasstle free bundling for PumpFun.",
    generator: 'MORTALITY.APP'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="dark" storageKey="mortality-app-theme">
          <div className="min-h-screen flex flex-col dark:bg-background dark:text-foreground">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'