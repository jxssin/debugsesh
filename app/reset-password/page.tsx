"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ThemeToggle } from "@/components/theme-toggle"
import { DiscIcon as Discord, Twitter, AlertCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errors, setErrors] = useState<{password?: string; confirmPassword?: string}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Extract tokens from URL
  useEffect(() => {
    // With hash-based URLs, we need to parse the hash fragment
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    
    // Look for the token in multiple places (hash, query params)
    const token = params.get('access_token') || 
                  searchParams.get('token') || 
                  searchParams.get('access_token')
    
    if (token) {
      setAccessToken(token)
    } else {
      setResetError("Invalid password reset link. Please request a new password reset.")
    }
  }, [searchParams])

  const validateForm = () => {
    const newErrors: {password?: string; confirmPassword?: string} = {}
    
    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !accessToken) {
      return
    }
    
    setIsSubmitting(true)
    setResetError(null)
    
    try {
      // Set the session with the access token first
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: '' })
      
      // Then update the user's password
      const { error } = await supabase.auth.updateUser({ 
        password: password
      })
      
      if (error) {
        setResetError(error.message || "Failed to reset password")
      } else {
        setResetSuccess(true)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login")
        }, 3000)
      }
    } catch (err: any) {
      setResetError(err.message || "An error occurred")
    } finally {
      setIsSubmitting(false)
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
          {resetSuccess ? (
            <div className="p-6 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl mb-4">Password Reset Successful</CardTitle>
              <p className="mb-6">Your password has been successfully reset. You will be redirected to the dashboard in a few seconds.</p>
              <Button 
                onClick={() => router.push("/login")}
                className="w-full bg-black text-white transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:bg-black"
              >
                Go to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">Reset Your Password</CardTitle>
                {resetError && (
                  <div className="bg-red-50 text-red-500 p-2 rounded-md text-sm mt-2">
                    {resetError}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className={cn(
                        errors.password && "border-red-500 focus-visible:ring-red-500 pr-10"
                      )}
                      disabled={!accessToken}
                    />
                    {errors.password && (
                      <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      </div>
                    )}
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500 mt-1">{errors.password}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className={cn(
                        errors.confirmPassword && "border-red-500 focus-visible:ring-red-500 pr-10"
                      )}
                      disabled={!accessToken}
                    />
                    {errors.confirmPassword && (
                      <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      </div>
                    )}
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full bg-black text-white transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:bg-black"
                  disabled={isSubmitting || !accessToken}
                >
                  {isSubmitting ? "Processing..." : "Reset Password"}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </main>
    </div>
  )
}