"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

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
import { DiscIcon as Discord, Twitter, AlertCircle, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{username?: boolean; password?: boolean}>({})
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)

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
              >
                Sign in
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

// Register Modal Component
const RegisterModal = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
    verificationCode?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setEmail("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setVerificationCode("");
      setEmailVerified(false);
      setVerificationSent(false);
      setErrors({});
    }
  }, [open]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleVerifyEmail = () => {
    // Clear previous errors
    setErrors((prev) => ({ ...prev, email: undefined }));

    // Validate email
    if (!email) {
      setErrors((prev) => ({ ...prev, email: "Email is required" }));
      return;
    }

    if (!validateEmail(email)) {
      setErrors((prev) => ({ ...prev, email: "Please enter a valid email" }));
      return;
    }

    // Simulate sending verification code
    setVerificationSent(true);
    
    // In a real app, you would make an API call here to send the verification code
    // For this example, we'll simulate a successful verification after 2 seconds
    setTimeout(() => {
      // Code sent successfully
    }, 2000);
  };

  const handleVerifyCode = () => {
    // Clear previous errors
    setErrors((prev) => ({ ...prev, verificationCode: undefined }));

    // Validate verification code
    if (!verificationCode) {
      setErrors((prev) => ({ ...prev, verificationCode: "Verification code is required" }));
      return;
    }

    if (verificationCode.length < 6) {
      setErrors((prev) => ({ ...prev, verificationCode: "Code must be at least 6 characters" }));
      return;
    }

    // In a real app, you would verify the code against what was sent
    // For this example, we'll simulate a successful verification
    setEmailVerified(true);
  };

  const validateForm = () => {
    const newErrors: {
      email?: string;
      username?: string;
      password?: string;
      confirmPassword?: string;
      verificationCode?: string;
    } = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!username) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }

    if (!emailVerified) {
      newErrors.email = "Email must be verified";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // In a real app, you would make an API call to create the user account
    // For this example, we'll simulate a successful account creation
    setTimeout(() => {
      setIsSubmitting(false);
      onOpenChange(false);
      // You might want to automatically log the user in or redirect them
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create an account</DialogTitle>
          <DialogDescription>
            Fill in your details to create your account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Email field with verification */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cn(errors.email && "border-red-500 focus-visible:ring-red-500")}
                    disabled={emailVerified}
                  />
                  {errors.email && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  {emailVerified && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerifyEmail}
                  disabled={!email || emailVerified}
                  className="shrink-0"
                >
                  {emailVerified ? "Verified" : "Verify"}
                </Button>
              </div>
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>

            {/* Verification code field (only shown after sending verification) */}
            {verificationSent && !emailVerified && (
              <div className="grid gap-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <div className="relative">
                  <Input
                    id="verification-code"
                    type="text"
                    placeholder="Enter the 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className={cn(
                      errors.verificationCode && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {errors.verificationCode && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.verificationCode && (
                  <p className="text-sm text-red-500">{errors.verificationCode}</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerifyCode}
                  className="mt-1"
                >
                  Verify Code
                </Button>
              </div>
            )}

            {/* Username field */}
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={cn(
                    errors.username && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {errors.username && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </div>
                )}
              </div>
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            {/* Password field */}
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    errors.password && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {errors.password && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </div>
                )}
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password field */}
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(
                    errors.confirmPassword && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {errors.confirmPassword && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </div>
                )}
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
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
              disabled={!emailVerified || isSubmitting}
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Forgot Password Modal Component
const ForgotPasswordModal = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
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

  const handleSubmit = (e: React.FormEvent) => {
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

    // In a real app, you would make an API call to send a password reset link
    // For this example, we'll simulate a successful submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1500);
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