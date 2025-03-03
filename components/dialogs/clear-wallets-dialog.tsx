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
                ? "If there are any SPL tokens or SOL left in the generated wallet(s), it will be returned to your funder wallet."
                : "If there's any SOL left in the generated wallet(s), it will be returned to your funder wallet."}
            </p>
            {isPremium && (
              <p className="text-xs text-muted-foreground">
                Note: All your token accounts will be closed and the SOL will be sent to your funder wallet.
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

