"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export function SidebarLogout() {
  const { signOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  return (
    <div className="px-0">
      <button
        onClick={handleLogout}
        style={{ height: '40px' }}
        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-200 hover:bg-black hover:text-white w-full text-red-500 no-focus-outline"
      >
        <LogOut size={20} />
        Logout
      </button>
    </div>
  )
}