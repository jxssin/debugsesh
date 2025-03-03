"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, RocketIcon, Wallet, Settings, User } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { DiscIcon as Discord, Twitter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SidebarLogout } from "@/components/sidebar-logout"
import { Separator } from "@/components/ui/separator"

const sidebarItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Launch",
    href: "/launch",
    icon: RocketIcon,
  },
  {
    name: "Wallets",
    href: "/wallets",
    icon: Wallet,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export default function LayoutWithSidebar({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 border-r bg-background flex flex-col fixed h-screen">
        {/* App Name */}
        <div className="h-16 border-b flex items-center px-6 sticky top-0 bg-background z-20">
          <Link href="/" className="text-lg font-bold no-focus-outline">
            MORTALITY.APP
          </Link>
        </div>

        {/* Profile Section */}
        <div className="p-4 border-b space-y-4">
          {/* User Profile */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border mt-0">
              <User size={24} className="text-foreground" />
            </div>
            <div className="flex flex-col">
              <div className="relative">
                <Badge variant="outline" className="absolute -top-3 -left-1 text-[10px] px-1 py-0 font-medium">
                  PREMIUM
                </Badge>
                <span className="text-sm mt-1 block">johndoe</span>
              </div>
            </div>
          </div>

          {/* Solana Price */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6">
              <img
                src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                alt="Solana"
                className="w-5 h-5 rounded-full"
              />
            </div>
            <span className="text-sm">$69.69</span>
            <span className="text-xs text-green-500">+6.9%</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-4 space-y-2">
            {sidebarItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200 hover:scale-105 no-focus-outline ${
                  pathname === item.href ? "bg-black text-white" : "hover:bg-black hover:text-white"
                }`}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Logout Section */}
        <div className="p-4 mt-auto border-t">
          <SidebarLogout />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col pl-64">
        {/* Sticky Header */}
        <header className="h-16 border-b flex items-center justify-between px-6 sticky top-0 bg-background z-10">
          <h1 className="text-lg font-semibold capitalize">{pathname.split("/").pop() || "Dashboard"}</h1>
          <div className="flex items-center space-x-4">
            <Link
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors no-focus-outline"
              aria-label="Discord"
            >
              <Discord size={20} />
            </Link>
            <Link
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors no-focus-outline"
              aria-label="Twitter"
            >
              <Twitter size={20} />
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}