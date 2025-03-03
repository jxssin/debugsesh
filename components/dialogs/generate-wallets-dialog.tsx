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

interface GenerateWalletsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (amount: number) => void
}

export function GenerateWalletsDialog({ open, onOpenChange, onGenerate }: GenerateWalletsDialogProps) {
  const [amount, setAmount] = useState("1")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Wallets</DialogTitle>
          <DialogDescription>Enter the number of wallets you want to generate (1-100)</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="number"
            value={amount}
            onChange={(e) => {
              const value = Number.parseInt(e.target.value)
              if (!isNaN(value) && value >= 1 && value <= 100) {
                setAmount(e.target.value)
              }
            }}
            min="1"
            max="100"
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              onGenerate(Number.parseInt(amount))
              onOpenChange(false)
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

