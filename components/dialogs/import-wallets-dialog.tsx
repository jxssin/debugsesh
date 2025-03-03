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

interface ImportWalletsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (file: File) => void
  isPremium: boolean
}

export function ImportWalletsDialog({ open, onOpenChange, onImport, isPremium }: ImportWalletsDialogProps) {
  const [file, setFile] = useState<File | null>(null)

  if (!isPremium) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Premium Feature</DialogTitle>
            <DialogDescription>Importing wallets is only available for premium users.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Wallets</DialogTitle>
          <DialogDescription>Upload a JSON or CSV file containing your wallet private keys.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <input
            type="file"
            accept=".json,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full"
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (file) {
                onImport(file)
                onOpenChange(false)
              }
            }}
            disabled={!file}
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

