"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface DistributeFundsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDistribute: (options: DistributeOptions) => void
  maxWallets: number
  minAmount?: number
  maxAmount?: number
  funderBalance: number
  isPremium: boolean
}

export interface DistributeOptions {
  amount: number
  isRandom: boolean
  minAmount?: number
  maxAmount?: number
  selectedWallets: number[]
}

export function DistributeFundsDialog({ 
  open, 
  onOpenChange, 
  onDistribute,
  maxWallets,
  maxAmount = 1,
  funderBalance,
  isPremium
}: DistributeFundsDialogProps) {
  const [amount, setAmount] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState<string>("")
  const [selectedWallets, setSelectedWallets] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState<boolean>(true)
  const [inputError, setInputError] = useState<string | null>(null)
  
  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setAmount(null)
      setInputValue("")
      setInputError(null)
      setSelectedWallets([])
      setSelectAll(true)
    }
  }, [open])
  
  // Re-validate amount when wallet selection changes
  useEffect(() => {
    if (amount) {
      const walletCount = selectAll ? maxWallets : selectedWallets.length;
      const totalAmount = amount * walletCount;
      
      // Reserve 0.0015 SOL for transaction fees
      const reserveAmount = 0.0015;
      const availableBalance = funderBalance - reserveAmount;
      
      if (totalAmount > availableBalance) {
        setInputError(`Insufficient funds.\nAvailable: ${availableBalance.toFixed(9)} SOL (with reserve for fees)`);
      } else if (amount >= 0.0015) {
        setInputError(null);
      }
    }
  }, [selectAll, selectedWallets, amount, funderBalance, maxWallets])
  
  const walletArray = Array.from({ length: maxWallets }, (_, i) => i);
  
  const handleDistribute = () => {
    // Validate amount before proceeding
    if (!amount || amount < 0.0015) {
      setInputError("Minimum amount required: 0.0015 SOL")
      return
    }
    
    // Calculate final wallet selection
    const finalSelection = selectAll 
      ? walletArray 
      : selectedWallets;
      
    onDistribute({
      amount: amount,
      isRandom: false, // Always false since we removed random amounts option
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
  
  // Handle manual input for amount with validation
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setInputValue(input);
    
    if (input === '') {
      setAmount(null);
      setInputError(null);
      return;
    }
    
    // Handle both comma and period as decimal separators
    const sanitizedInput = input.replace(',', '.');
    
    // Limit to 9 decimal places
    const decimalIndex = sanitizedInput.indexOf('.');
    if (decimalIndex !== -1 && sanitizedInput.length > decimalIndex + 10) {
      // Too many decimal places, don't update
      return;
    }
    
    const value = parseFloat(sanitizedInput);
    
    if (isNaN(value)) {
      setAmount(null);
      setInputError("Please enter a valid number");
      return;
    }
    
    // Set amount to actual entered value
    setAmount(value);
    
    // Calculate total amount
    const walletCount = selectAll ? maxWallets : selectedWallets.length || 1;
    const totalAmount = value * walletCount;
    
    // Reserve 0.0015 SOL for transaction fees
    const reserveAmount = 0.0000000015;
    const availableBalance = funderBalance - reserveAmount;
    
    // Show error if below minimum
    if (value < 0.0015) {
      setInputError("Minimum amount required: 0.0015 SOL");
    // Show error if total exceeds funder balance (minus reserve)
    } else if (totalAmount > availableBalance) {
      setInputError(`Insufficient funds. Available: ${availableBalance.toFixed(9)} SOL (with reserve for fees)`);
    } else {
      setInputError(null);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Distribute Funds</DialogTitle>
          <DialogDescription>
            Send SOL from your funder wallet to your generated wallets.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Fixed Amount */}
          <div className="grid gap-2">
            <Label htmlFor="fixed-amount">Amount per Wallet (SOL)</Label>
            <Input
              id="fixed-amount"
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={handleAmountChange}
              placeholder="Minimum: 0.0015 SOL"
              className={`no-spinner ${inputError ? "border-red-500" : ""}`}
            />
            {inputError && (
              <p className="text-xs text-red-500 whitespace-pre-line">{inputError}</p>
            )}
          </div>
          
          {/* Wallet Selection - Premium Feature */}
          {isPremium && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="select-all">Select All Wallets</Label>
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
              <span className="font-medium">Total wallets:</span>
              <span>{selectAll ? maxWallets : selectedWallets.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Estimated total:</span>
              <span>
                {((amount || 0) * (selectAll ? maxWallets : selectedWallets.length)).toFixed(9)} SOL
              </span>
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
            onClick={handleDistribute}
            disabled={
              (!selectAll && selectedWallets.length === 0) || 
              !amount || 
              amount < 0.0015 ||
              inputError !== null
            }
          >
            Distribute
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Add CSS to remove spinner buttons from input */}
      <style jsx global>{`
        .no-spinner::-webkit-inner-spin-button,
        .no-spinner::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner {
          -moz-appearance: textfield;
        }
      `}</style>
    </Dialog>
  )
}