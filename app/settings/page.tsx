"use client"

import { useState, useEffect, useCallback } from "react"
import { Eye, EyeOff, X, Save, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSettings } from "@/contexts/settings-context"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"


interface ValidationError {
  error: boolean
  message: string
}

type ValidationErrors = {
  [key: string]: ValidationError
}

export default function SettingsPage() {
  const router = useRouter()
  const { settings, updateSettings } = useSettings()
  const [showRpcUrl, setShowRpcUrl] = useState(false)
  const [showWsUrl, setShowWsUrl] = useState(false)
  const [formSettings, setFormSettings] = useState(settings)
  const [isDirty, setIsDirty] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  
  // Add beforeunload event listener to prevent navigation when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?"
        return "You have unsaved changes. Are you sure you want to leave?"
      }
    }
    
    window.addEventListener("beforeunload", handleBeforeUnload)
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [isDirty])
  
  // Update form settings when settings change
  useEffect(() => {
    setFormSettings(settings)
  }, [settings])

  const blockEngines = [
    "https://amsterdam.mainnet.block-engine.jito.wtf",
    "https://frankfurt.mainnet.block-engine.jito.wtf",
    "https://ny.mainnet.block-engine.jito.wtf",
    "https://slc.mainnet.block-engine.jito.wtf",
    "https://tokyo.mainnet.block-engine.jito.wtf",
  ]

  const validateForm = useCallback(() => {
    const newErrors: ValidationErrors = {}
    const requiredFields = ["devBuy", "minBuy", "maxBuy", "jitoTipAmount", "rpcUrl", "wsUrl"]

    requiredFields.forEach((field) => {
      if (!formSettings[field as keyof typeof formSettings]) {
        newErrors[field] = {
          error: true,
          message: "Required input field!",
        }
      }
    })
    
    // Validate that maxBuy is not smaller than minBuy
    if (formSettings.minBuy && formSettings.maxBuy) {
      const minBuy = parseFloat(formSettings.minBuy as string)
      const maxBuy = parseFloat(formSettings.maxBuy as string)
      
      if (!isNaN(minBuy) && !isNaN(maxBuy) && maxBuy < minBuy) {
        newErrors.maxBuy = {
          error: true,
          message: "Maximum buy amount cannot be less than minimum buy amount",
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formSettings])

  useEffect(() => {
    validateForm()
  }, [validateForm])

  const handleSave = () => {
    if (validateForm()) {
      updateSettings(formSettings)
      setIsDirty(false)
      // Store settings in localStorage to persist them
      localStorage.setItem('appSettings', JSON.stringify(formSettings))
    }
  }

  // Navigation protection for App Router
  useEffect(() => {
    if (!isDirty) return;
    
    // Use the window.onbeforeunload event to handle page navigation/refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      return "You have unsaved changes. Are you sure you want to leave?";
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    // Use Next.js App Router navigation interceptor
    const handlePathnameChange = () => {
      if (window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        return;
      }
      // Stay on current page
      router.back();
    };
    
    // Cannot directly attach events in App Router
    // This is a workaround by watching pathname
    const originalPush = router.push;
    router.push = function() {
      if (isDirty) {
        if (!window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
          return Promise.reject("Navigation cancelled");
        }
      }
      return originalPush.apply(this, arguments as any);
    };
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      router.push = originalPush;
    };
  }, [isDirty, router]);

  // Load settings from localStorage on initial render
  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings')
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings)
      setFormSettings(parsedSettings)
      updateSettings(parsedSettings)
    }
  }, [updateSettings])

  // Handle numeric input with validation
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const value = e.target.value;
    
    // Regex to match valid numbers with up to 9 decimal places
    const solanaDecimalRegex = /^-?\d*\.?\d{0,9}$/;
    
    if (value === "" || value === "." || solanaDecimalRegex.test(value)) {
      setFormSettings((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
    }
  };

  return (
    <div className="p-6 max-w-[800px] mx-auto space-y-8">
      <div className="flex justify-end">
        <Button
          className="bg-black text-white transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:bg-black flex items-center gap-2"
          onClick={handleSave}
          disabled={!isDirty}
        >
          <Save size={16} />
          SAVE CHANGES
        </Button>
      </div>

      {/* Network Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Network Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* RPC URL */}
          <div className="space-y-2">
            <Label htmlFor="rpc-url">RPC URL</Label>
            <CardDescription>
              This URL allows applications to send requests and receive responses from the Solana blockchain.
            </CardDescription>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="rpc-url"
                  type={showRpcUrl ? "text" : "password"}
                  value={formSettings.rpcUrl || ""}
                  onChange={(e) => {
                    setFormSettings((prev) => ({ ...prev, rpcUrl: e.target.value }))
                    setIsDirty(true)
                  }}
                  className={cn(
                    "pr-20",
                    errors.rpcUrl?.error && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-3">
                  {formSettings.rpcUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setFormSettings((prev) => ({ ...prev, rpcUrl: "" }))
                        setIsDirty(true)
                      }}
                    >
                      <X size={16} />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowRpcUrl(!showRpcUrl)}>
                    {showRpcUrl ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                  {errors.rpcUrl?.error && (
                    <div className="flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            {errors.rpcUrl?.error && (
              <p className="text-sm text-red-500 mt-1">{errors.rpcUrl.message}</p>
            )}
          </div>

          {/* WebSocket URL */}
          <div className="space-y-2">
            <Label htmlFor="ws-url">WebSocket URL</Label>
            <CardDescription>
              This URL establishes a continuous connection to the Solana blockchain, enabling real-time updates.
            </CardDescription>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="ws-url"
                  type={showWsUrl ? "text" : "password"}
                  value={formSettings.wsUrl || ""}
                  onChange={(e) => {
                    setFormSettings((prev) => ({ ...prev, wsUrl: e.target.value }))
                    setIsDirty(true)
                  }}
                  className={cn(
                    "pr-20",
                    errors.wsUrl?.error && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-3">
                  {formSettings.wsUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setFormSettings((prev) => ({ ...prev, wsUrl: "" }))
                        setIsDirty(true)
                      }}
                    >
                      <X size={16} />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowWsUrl(!showWsUrl)}>
                    {showWsUrl ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                  {errors.wsUrl?.error && (
                    <div className="flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            {errors.wsUrl?.error && (
              <p className="text-sm text-red-500 mt-1">{errors.wsUrl.message}</p>
            )}
          </div>

          {/* Block Engine URL */}
          <div className="space-y-2">
            <Label htmlFor="block-engine">Block Engine URL</Label>
            <CardDescription>
              Block Engines are currently operating in Amsterdam, Frankfurt, New York, Salt Lake City and Tokyo.
            </CardDescription>
            <Select
              value={formSettings.blockEngine || ""}
              onValueChange={(value: string) => {
                setFormSettings((prev) => ({ ...prev, blockEngine: value }))
                setIsDirty(true)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a Block Engine" />
              </SelectTrigger>
              <SelectContent>
                {blockEngines.map((engine) => (
                  <SelectItem key={engine} value={engine}>
                    {engine}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Buy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Buy Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Developer Buy */}
          <div className="space-y-2">
            <Label htmlFor="dev-buy">Developer Buy</Label>
            <CardDescription>The amount of SOL to buy on the developer wallet.</CardDescription>
            <div className="relative">
              <Input
                id="dev-buy"
                type="text"
                inputMode="decimal"
                value={formSettings.devBuy || ""}
                onChange={(e) => handleNumericChange(e, "devBuy")}
                className={cn(
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  errors.devBuy?.error && "border-red-500 focus-visible:ring-red-500 pr-10"
                )}
                placeholder=""
              />
              {errors.devBuy?.error && (
                <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
              )}
            </div>
            {errors.devBuy?.error && (
              <p className="text-sm text-red-500 mt-1">{errors.devBuy.message}</p>
            )}
          </div>

          {/* Minimum Buy Amount */}
          <div className="space-y-2">
            <Label htmlFor="min-buy">Minimum Buy Amount</Label>
            <CardDescription>The minimum amount of SOL to buy on generated wallets.</CardDescription>
            <div className="relative">
              <Input
                id="min-buy"
                type="text"
                inputMode="decimal"
                value={formSettings.minBuy || ""}
                onChange={(e) => handleNumericChange(e, "minBuy")}
                className={cn(
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  errors.minBuy?.error && "border-red-500 focus-visible:ring-red-500 pr-10"
                )}
                placeholder=""
              />
              {errors.minBuy?.error && (
                <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
              )}
            </div>
            {errors.minBuy?.error && (
              <p className="text-sm text-red-500 mt-1">{errors.minBuy.message}</p>
            )}
          </div>

          {/* Maximum Buy Amount */}
          <div className="space-y-2">
            <Label htmlFor="max-buy">Maximum Buy Amount</Label>
            <CardDescription>The maximum amount of SOL to buy on generated wallets.</CardDescription>
            <div className="relative">
              <Input
                id="max-buy"
                type="text"
                inputMode="decimal"
                value={formSettings.maxBuy || ""}
                onChange={(e) => handleNumericChange(e, "maxBuy")}
                className={cn(
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  errors.maxBuy?.error && "border-red-500 focus-visible:ring-red-500 pr-10"
                )}
                placeholder=""
              />
              {errors.maxBuy?.error && (
                <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
              )}
            </div>
            {errors.maxBuy?.error && (
              <p className="text-sm text-red-500 mt-1">{errors.maxBuy.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Jito Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Jito Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Use Jito Proxyless */}
          <div className="space-y-2">
            <Label htmlFor="jito-proxyless">Use Jito Proxyless</Label>
            <CardDescription>Use Jito without proxies. (NOT RECOMMENDED)</CardDescription>
            <Select
              value={(formSettings.jitoProxyless || false).toString()}
              onValueChange={(value: string) => {
                setFormSettings((prev) => ({ ...prev, jitoProxyless: value === "true" }))
                setIsDirty(true)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">False</SelectItem>
                <SelectItem value="true">True</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Max. Jito Tip Amount */}
          <div className="space-y-2">
            <Label htmlFor="jito-tip">Max. Jito Tip Amount</Label>
            <CardDescription className="whitespace-pre-line">
              A higher tip increases the likelihood of transaction success but comes at a higher cost.{"\n"}
              Recommended value: 0.005 SOL.
            </CardDescription>
            <div className="relative">
              <Input
                id="jito-tip"
                type="text"
                inputMode="decimal"
                value={formSettings.jitoTipAmount || ""}
                onChange={(e) => handleNumericChange(e, "jitoTipAmount")}
                className={cn(
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                  errors.jitoTipAmount?.error && "border-red-500 focus-visible:ring-red-500 pr-10"
                )}
                placeholder="0.005"
              />
              {errors.jitoTipAmount?.error && (
                <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
              )}
            </div>
            {errors.jitoTipAmount?.error && (
              <p className="text-sm text-red-500 mt-1">{errors.jitoTipAmount.message}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}