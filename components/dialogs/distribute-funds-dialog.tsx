"use client"

import { useState } from "react"
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
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DistributeFundsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDistribute: (options: DistributeOptions) => void
  maxWallets: number
  minAmount?: number
  maxAmount?: number
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
  minAmount = 0.001,
  maxAmount = 1,
  isPremium
}: DistributeFundsDialogProps) {
  const [amount, setAmount] = useState<number>(minAmount)
  const [isRandom, setIsRandom] = useState<boolean>(false)
  const [randomMinAmount, setRandomMinAmount] = useState<number>(minAmount)
  const [randomMaxAmount, setRandomMaxAmount] = useState<number>(maxAmount)
  const [selectedWallets, setSelectedWallets] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState<boolean>(true)
  
  const walletArray = Array.from({ length: maxWallets }, (_, i) => i);
  
  const handleDistribute = () => {
    // Calculate final wallet selection
    const finalSelection = selectAll 
      ? walletArray 
      : selectedWallets;
      
    onDistribute({
      amount,
      isRandom,
      minAmount: isRandom ? randomMinAmount : undefined,
      maxAmount: isRandom ? randomMaxAmount : undefined,
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
    let value = parseFloat(e.target.value);
    if (isNaN(value)) {
      setAmount(0);
      return;
    }
    
    // Ensure value is within bounds
    value = Math.max(minAmount, Math.min(value, maxAmount));
    setAmount(value);
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
          {/* Distribution Method */}
          <div className="flex items-center justify-between">
            <Label htmlFor="random-amounts" className="flex items-center gap-2">
              Random Amounts
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={16} className="text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Distribute random amounts between min and max values</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Switch
              id="random-amounts"
              checked={isRandom}
              onCheckedChange={setIsRandom}
              disabled={!isPremium}
            />
          </div>
          
          {isRandom ? (
            <>
              {/* Random Min Amount */}
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <Label htmlFor="min-amount">Minimum Amount (SOL)</Label>
                  <span className="text-sm">{randomMinAmount.toFixed(4)}</span>
                </div>
                <Slider 
                  value={[randomMinAmount]} 
                  min={minAmount} 
                  max={randomMaxAmount}
                  step={0.001}
                  onValueChange={([value]) => setRandomMinAmount(value)}
                />
              </div>
              
              {/* Random Max Amount */}
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <Label htmlFor="max-amount">Maximum Amount (SOL)</Label>
                  <span className="text-sm">{randomMaxAmount.toFixed(4)}</span>
                </div>
                <Slider 
                  value={[randomMaxAmount]} 
                  min={randomMinAmount} 
                  max={maxAmount}
                  step={0.001}
                  onValueChange={([value]) => setRandomMaxAmount(value)}
                />
              </div>
            </>
          ) : (
            <>
              {/* Fixed Amount */}
              <div className="grid gap-2">
                <Label htmlFor="fixed-amount">Amount per Wallet (SOL)</Label>
                <Input
                  id="fixed-amount"
                  type="number"
                  value={amount}
                  onChange={handleAmountChange}
                  min={minAmount}
                  max={maxAmount}
                  step={0.001}
                />
              </div>
            </>
          )}
          
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
                {isRandom 
                  ? `~${((randomMinAmount + randomMaxAmount) / 2 * (selectAll ? maxWallets : selectedWallets.length)).toFixed(4)}` 
                  : (amount * (selectAll ? maxWallets : selectedWallets.length)).toFixed(4)
                } SOL
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
            disabled={(!selectAll && selectedWallets.length === 0) || amount <= 0}
          >
            Distribute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}