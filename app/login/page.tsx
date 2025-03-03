"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import { DiscIcon as Discord, Twitter, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{username?: boolean; password?: boolean}>({})

  const validateForm = () => {
    const newErrors: {username?: boolean; password?: boolean} = {}
    
    if (!username) {
      newErrors.username = true
    }
    
    if (!password) {
      newErrors.password = true
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      // Add your authentication logic here
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="w-24">{/* Empty div for spacing */}</div>

          <Link href="/" className="no-underline no-focus-outline">
            <h1 className="text-2xl font-bold">MORTALITY.APP</h1>
          </Link>

          <div className="flex items-center space-x-4">
            <Link
              href="https://discord.com/invite/MortalityApp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors no-focus-outline"
              aria-label="Discord"
            >
              <Discord size={20} />
            </Link>
            <Link
              href="https://x.com/MortalityApp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors no-focus-outline"
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
                <div className="relative">
                  <Input 
                    id="username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className={cn(
                      errors.username && "border-red-500 focus-visible:ring-red-500 pr-10"
                    )}
                  />
                  {errors.username && (
                    <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.username && (
                  <p className="text-sm text-red-500 mt-1">Required input field!</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-sm font-bold no-focus-outline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={cn(
                      errors.password && "border-red-500 focus-visible:ring-red-500 pr-10"
                    )}
                  />
                  {errors.password && (
                    <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">Required input field!</p>
                )}
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
                <Link href="/register" className="text-sm font-bold no-focus-outline">
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