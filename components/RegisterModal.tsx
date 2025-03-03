import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ open, onOpenChange }) => {
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

export default RegisterModal;