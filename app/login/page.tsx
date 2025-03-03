"use client"

import type React from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import { DiscIcon as Discord, Twitter } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Add your authentication logic here
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="w-24">{/* Empty div for spacing */}</div>

          <Link href="/" className="no-underline">
            <h1 className="text-2xl font-bold">MORTALITY.APP</h1>
          </Link>

          <div className="flex items-center space-x-4">
            <Link
              href="https://discord.com/invite/MortalityApp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Discord"
            >
              <Discord size={20} />
            </Link>
            <Link
              href="https://x.com/MortalityApp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Twitter"
            >
              <Twitter size={20} />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Sign in</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" placeholder="Enter your username" required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-sm hover:underline text-black">
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" type="password" placeholder="••••••••" required />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full bg-black text-white transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:bg-black"
              >
                Sign in
              </Button>
              <div className="text-center text-sm">
                Don't have an account?{" "}
                <Link href="/register" className="text-black hover:underline">
                  Register
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  )
}

