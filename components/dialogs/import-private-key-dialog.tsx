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

interface ImportPrivateKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (privateKey: string) => void
  walletType: "developer" | "funder"
}

export function ImportPrivateKeyDialog({ open, onOpenChange, onImport, walletType }: ImportPrivateKeyDialogProps) {
  const [privateKey, setPrivateKey] = useState("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import {walletType.charAt(0).toUpperCase() + walletType.slice(1)} Wallet</DialogTitle>
          <DialogDescription>Enter your private key to import the wallet.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="password"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="Enter private key"
            className="font-mono"
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              onImport(privateKey)
              setPrivateKey("")
              onOpenChange(false)
            }}
            disabled={!privateKey}
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}