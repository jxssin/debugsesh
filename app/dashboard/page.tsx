"use client"

import ProtectedRoute from "@/components/protected-route"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">Tutorial video placeholder</p>
        </div>
      </div>
    </ProtectedRoute>
  )
}