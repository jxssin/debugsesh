"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PLATFORMS } from "@/utils/wallet-utils"

interface UpgradeWalletsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpgrade: (options: UpgradeOptions) => void
  maxWallets: number
  isPremium: boolean
}

export interface UpgradeOptions {
  platformKey: keyof typeof PLATFORMS
  selectedWallets: number[]
}

export function UpgradeWalletsDialog({ 
  open, 
  onOpenChange, 
  onUpgrade,
  maxWallets,
  isPremium
}: UpgradeWalletsDialogProps) {
  const [platformKey, setPlatformKey] = useState<keyof typeof PLATFORMS>("TROJAN")
  const [selectedWallets, setSelectedWallets] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState<boolean>(true)
  
  const walletArray = Array.from({ length: maxWallets }, (_, i) => i);
  
  const handleUpgrade = () => {
    // Calculate final wallet selection
    const finalSelection = selectAll 
      ? walletArray 
      : selectedWallets;
      
    onUpgrade({
      platformKey,
      selectedWallets: finalSelection
    });
    
    onOpenChange(false);
  };
  
  const toggleWallet = (walletIndex: number) => {
    if (selectAll) {
      // If all are selected, deselect all first, then select the clicked one
      setSelectAll(false);
      setSelectedWallets([walletIndex]);
    } else {
      setSelectedWallets(prev => {
        if (prev.includes(walletIndex)) {
          // Remove if already selected
          return prev.filter(i => i !== walletIndex);
        } else {
          // Add if not selected
          return [...prev, walletIndex];
        }
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Upgrade to Smart Wallets</DialogTitle>
          <DialogDescription>
            Convert generated wallets to specialized smart wallets for enhanced functionality.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Platform Selection */}
          <div className="grid gap-2">
            <Label>Select Platform Type</Label>
            <RadioGroup 
              defaultValue={platformKey} 
              onValueChange={(value) => setPlatformKey(value as keyof typeof PLATFORMS)}
              className="grid grid-cols-2 gap-2"
            >
              {Object.entries(PLATFORMS).filter(([key]) => key !== "NONE").map(([key, platform]) => (
                <div key={key} className="flex items-start space-x-2">
                  <RadioGroupItem value={key} id={`platform-${key}`} className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor={`platform-${key}`} className="font-medium">
                      {platform.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {platform.requiresTipPerTransaction 
                        ? "Requires tip per transaction" 
                        : "One-time tip only"}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
          
          <div className="flex items-center gap-2 rounded-md border p-3 shadow-sm bg-muted mt-2">
            <Info size={18} className="text-muted-foreground" />
            <div className="text-xs text-muted-foreground">
              <p>Smart wallets pay a small tip to platform providers. Upgrading requires SOL in your <strong>funder wallet</strong>.</p>
            </div>
          </div>
          
          {/* Wallet Selection - Premium Feature */}
          {isPremium && (
            <div className="grid gap-2 mt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="select-all">Upgrade All Wallets</Label>
                <Switch
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={(checked) => {
                    setSelectAll(checked);
                    if (checked) {
                      setSelectedWallets([]);
                    }
                  }}
                />
              </div>
              
              {!selectAll && (
                <div className="mt-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                  <div className="grid grid-cols-5 gap-2">
                    {walletArray.map((index) => (
                      <div 
                        key={index} 
                        className={`text-center p-1 rounded-md cursor-pointer text-sm ${
                          selectedWallets.includes(index) 
                            ? 'bg-primary text-primary-foreground' 
                            : 'border hover:bg-muted'
                        }`}
                        onClick={() => toggleWallet(index)}
                      >
                        #{index + 1}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!selectAll && selectedWallets.length === 0 && (
                <p className="text-red-500 text-sm">Please select at least one wallet</p>
              )}
            </div>
          )}
          
          {/* Total */}
          <div className="mt-2 p-3 bg-muted rounded-md">
            <div className="flex justify-between items-center">
              <span className="font-medium">Selected platform:</span>
              <span className="font-semibold">{PLATFORMS[platformKey].name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Wallets to upgrade:</span>
              <span>{selectAll ? maxWallets : selectedWallets.length}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpgrade}
            disabled={(!selectAll && selectedWallets.length === 0)}
          >
            Upgrade Wallets
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}