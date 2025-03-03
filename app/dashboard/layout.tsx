import type React from "react"
import LayoutWithSidebar from "../layout-with-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <LayoutWithSidebar>{children}</LayoutWithSidebar>
}