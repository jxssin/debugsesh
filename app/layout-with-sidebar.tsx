"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, RocketIcon, Wallet, Settings } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { SidebarLogout } from "@/components/sidebar-logout"
import { UserProfile } from "@/components/user-profile"
import { SolanaPrice } from "@/components/solana-price"
import { DiscIcon, XIcon } from "@/components/social-icons"

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
        <UserProfile />

        {/* Solana Price */}
        <SolanaPrice />

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
              <DiscIcon />
            </Link>
            <Link
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors no-focus-outline"
              aria-label="Twitter"
            >
              <XIcon />
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}