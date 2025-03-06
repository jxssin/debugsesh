"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ClearWalletsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPremium: boolean
}

export function ClearWalletsDialog({ open, onOpenChange, onConfirm, isPremium }: ClearWalletsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg">Are you sure you want to clear all your generated wallets?</DialogTitle>
          <DialogDescription className="space-y-2">
            <p className="text-base">
              {isPremium
                ? "If there are any SPL tokens or SOL left in the generated wallet(s), we'll attempt to return them to your funder wallet."
                : "If there's any SOL left in the generated wallet(s), we'll attempt to return it to your funder wallet."}
            </p>
            <p className="text-xs text-muted-foreground">
              Note: Your wallets will be removed from the interface regardless of whether funds can be returned.
            </p>
            {isPremium && (
              <p className="text-xs text-muted-foreground">
                Premium feature: We'll try to close token accounts and return the SOL to your funder wallet.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            Clear All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}