"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

// Add custom CSS to prevent hover border effects
const customStyles = `
.dark button.no-focus-outline:hover,
.dark a.no-focus-outline:hover {
  border: none !important;
  transform: none !important;
}

.custom-underline {
  position: relative;
}

.custom-underline::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 100%;
  height: 1px;
  background-color: currentColor;
  transform: scaleX(0);
  transition: transform 0.2s ease;
}

.custom-underline:hover::after {
  transform: scaleX(1);
}
`
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import { DiscIcon as Discord, Twitter, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import RegisterModal from "@/components/register-modal"

export default function LoginPage() {
  const router = useRouter()
  const { signIn, user } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{username?: boolean; password?: boolean}>({})
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      setIsLoading(true)
      setAuthError(null)
      
      try {
        const { error } = await signIn(username, password)
        if (error) {
          setAuthError(error.message || "Failed to sign in")
        } else {
          router.push("/dashboard")
        }
      } catch (err: any) {
        setAuthError(err.message || "An error occurred during sign in")
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Inject custom styles */}
      <style jsx global>{customStyles}</style>
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
              {authError && (
                <div className="bg-red-50 text-red-500 p-2 rounded-md text-sm mt-2">
                  {authError}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Email</Label>
                <div className="relative">
                  <Input 
                    id="username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your email"
                    className={cn(
                      errors.username && "border-red-500 focus-visible:ring-red-500 pr-10"
                    )}
                    type="email"
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
                  <Button 
                    type="button" 
                    variant="link" 
                    className="text-sm font-bold no-focus-outline p-0 h-auto hover:no-underline relative group"
                    onClick={() => setShowForgotPasswordModal(true)}
                  >
                    <span className="relative">
                      Forgot password?
                      <span className="absolute -bottom-[2px] left-0 w-full h-[1px] bg-current scale-x-0 group-hover:scale-x-100 transition-transform"></span>
                    </span>
                  </Button>
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
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
              <div className="text-center text-sm">
                Don't have an account?{" "}
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-sm font-bold no-focus-outline p-0 h-auto hover:no-underline relative group"
                  onClick={() => setShowRegisterModal(true)}
                >
                  <span className="relative">
                    Register
                    <span className="absolute -bottom-[2px] left-0 w-full h-[1px] bg-current scale-x-0 group-hover:scale-x-100 transition-transform"></span>
                  </span>
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </main>

      {/* Register Modal */}
      <RegisterModal 
        open={showRegisterModal} 
        onOpenChange={setShowRegisterModal} 
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        open={showForgotPasswordModal} 
        onOpenChange={setShowForgotPasswordModal} 
      />
    </div>
  )
}

// Forgot Password Modal Component
const ForgotPasswordModal = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setEmail("");
      setIsSubmitted(false);
      setIsSubmitting(false);
      setError(null);
    }
  }, [open]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    if (!email) {
      setError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        setError(error.message || "Failed to send password reset email");
      } else {
        setIsSubmitted(true);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Reset your password</DialogTitle>
          <DialogDescription>
            {!isSubmitted
              ? "Enter your email address and we'll send you a link to reset your password."
              : "If an account exists with that email, we've sent password reset instructions."}
          </DialogDescription>
        </DialogHeader>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cn(error && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {error && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
            </div>
            <DialogFooter className="sm:justify-between flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-black text-white hover:bg-black hover:scale-105 transition-transform duration-200"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Request Password Reset"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-6">
            <p className="mb-6">
              Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.
            </p>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="bg-black text-white hover:bg-black hover:scale-105 transition-transform duration-200"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};