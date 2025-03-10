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
import { Switch } from "@/components/ui/switch"
import { Info, AlertCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ReturnFundsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReturn: (options: ReturnOptions) => void
  maxWallets: number
  hasTooBigBalances: boolean
  isPremium: boolean
}

export interface ReturnOptions {
  closeSplAccounts: boolean
  selectedWallets: number[]
}

export function ReturnFundsDialog({ 
  open, 
  onOpenChange, 
  onReturn,
  maxWallets,
  hasTooBigBalances,
  isPremium
}: ReturnFundsDialogProps) {
  const [closeSplAccounts, setCloseSplAccounts] = useState<boolean>(isPremium)
  const [selectedWallets, setSelectedWallets] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState<boolean>(true)
  
  const walletArray = Array.from({ length: maxWallets }, (_, i) => i);
  
  const handleReturn = () => {
    // Calculate final wallet selection
    const finalSelection = selectAll 
      ? walletArray 
      : selectedWallets;
      
    onReturn({
      closeSplAccounts: closeSplAccounts && isPremium,
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
          <DialogTitle>Return Funds</DialogTitle>
          <DialogDescription>
            Return SOL from generated wallets back to your funder wallet.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {hasTooBigBalances && (
            <div className="flex items-center gap-2 rounded-md border border-yellow-500 p-3 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-700">
              <AlertCircle size={18} className="text-yellow-500" />
              <div className="text-sm text-yellow-700 dark:text-yellow-400">
                <p>Some wallets have large balances. Make sure they don't have pending transactions before returning funds.</p>
              </div>
            </div>
          )}
          
          {/* Close SPL Accounts Option - Premium Feature */}
          {isPremium && (
            <div className="flex items-center justify-between">
              <Label htmlFor="close-spl" className="flex items-center gap-2">
                Close SPL Token Accounts
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={16} className="text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Also close any SPL token accounts to recover rent</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Switch
                id="close-spl"
                checked={closeSplAccounts}
                onCheckedChange={setCloseSplAccounts}
              />
            </div>
          )}
          
          <div className="flex items-center gap-2 rounded-md border p-3 shadow-sm bg-muted mt-2">
            <Info size={18} className="text-muted-foreground" />
            <div className="text-xs text-muted-foreground">
              <p>Funds will be returned to your funder wallet after deducting network fees.</p>
              {!isPremium && (
                <p className="mt-1 text-xs text-red-500">
                  <strong>Note:</strong> Free accounts cannot close SPL token accounts.<br/>Tokens will remain in wallets.
                </p>
              )}
            </div>
          </div>
          
          {/* Wallet Selection - Premium Feature */}
          {isPremium && (
            <div className="grid gap-2 mt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="select-all-return">Select All Wallets</Label>
                <Switch
                  id="select-all-return"
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
              <span className="font-medium">Wallets to process:</span>
              <span>{selectAll ? maxWallets : selectedWallets.length}</span>
            </div>
            {isPremium && (
              <div className="flex justify-between items-center">
                <span className="font-medium">Close SPL accounts:</span>
                <span>{closeSplAccounts ? "Yes" : "No"}</span>
              </div>
            )}
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
            onClick={handleReturn}
            disabled={(!selectAll && selectedWallets.length === 0)}
          >
            Return Funds
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}