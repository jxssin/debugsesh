"use client"

import { useState, useEffect, useCallback } from "react"
import {
  RefreshCw,
  Plus,
  Save,
  Trash2,
  Import,
  ImportIcon as Export,
  SendHorizontal,
  ArrowUpCircle,
  RotateCcw,
  Copy,
  Info,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { GenerateWalletsDialog } from "@/components/dialogs/generate-wallets-dialog"
import { ImportWalletsDialog } from "@/components/dialogs/import-wallets-dialog"
import { ImportPrivateKeyDialog } from "@/components/dialogs/import-private-key-dialog"
import { ClearWalletsDialog } from "@/components/dialogs/clear-wallets-dialog"

// Helper function to generate random SOL amount
const generateRandomBalance = () => {
  const isSmall = Math.random() > 0.5
  return isSmall ? (Math.random() * 0.0000001).toFixed(10) : (Math.random() * 10).toFixed(2)
}

export default function WalletsPage() {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [generatedWallets, setGeneratedWallets] = useState<any[]>([])
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [balances, setBalances] = useState({
    developer: null,
    funder: null,
    generated: Array(3).fill(null),
  })
  const isPremium = true
  const [showImportPrivateKeyDialog, setShowImportPrivateKeyDialog] = useState(false)
  const [showClearWalletsDialog, setShowClearWalletsDialog] = useState(false)
  const [importingWalletType, setImportingWalletType] = useState<"developer" | "funder" | null>(null)

  const handleCopy = async (text: string, wallet: string, requiresPremium = false) => {
    if (requiresPremium && !isPremium) return

    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(wallet)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const refreshBalances = useCallback(async () => {
    setIsRefreshing(true)
    setBalances({
      developer: null,
      funder: null,
      generated: Array(3).fill(null),
    })

    // Simulate API calls with different timing
    setTimeout(() => {
      setBalances((prev) => ({ ...prev, developer: generateRandomBalance() }))
    }, 1000)

    setTimeout(() => {
      setBalances((prev) => ({ ...prev, funder: generateRandomBalance() }))
    }, 1500)

    setTimeout(() => {
      setBalances((prev) => ({
        ...prev,
        generated: Array(3)
          .fill(null)
          .map(() => generateRandomBalance()),
      }))
      setIsRefreshing(false)
    }, 2000)
  }, [])

  // Initial load
  useEffect(() => {
    refreshBalances()
  }, [refreshBalances])

  const BalanceDisplay = ({ amount }: { amount: string | null }) => (
    <div className="flex items-center gap-2">
      {amount === null ? (
        <>
          <RefreshCw size={14} className="animate-spin" />
          <span className="text-muted-foreground">Checking balance...</span>
        </>
      ) : (
        <div className="text-base animate-in fade-in-50 duration-300">{amount} SOL</div>
      )}
    </div>
  )

  const handleGenerateWallets = (amount: number) => {
    const newWallets = Array(amount)
      .fill(null)
      .map((_, index) => ({
        id: Date.now() + index,
        balance: null,
        publicKey: "5vRp8KZWDV2MKUBAhTsCpGrnDEW341FBRvxysNRbeUiC",
        privateKey: "wiujdaiowjdawjdadjadawdawd",
      }))

    setGeneratedWallets((prev) => [...prev, ...newWallets])
  }

  const handleImportWallets = (file: File) => {
    // In a real application, you would parse the file and validate the data
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wallets = JSON.parse(e.target?.result as string)
        setGeneratedWallets((prev) => [...prev, ...wallets])
      } catch (error) {
        console.error("Error parsing wallet file:", error)
      }
    }
    reader.readAsText(file)
  }

  const handleSaveWallets = () => {
    if (!isPremium) return

    const walletsData = {
      wallets: generatedWallets,
    }

    const blob = new Blob([JSON.stringify(walletsData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "wallets.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDeleteWallet = (index: number) => {
    const newWallets = [...generatedWallets]
    newWallets.splice(index, 1)
    setGeneratedWallets(newWallets)
  }

  const handleImportPrivateKey = (privateKey: string) => {
    // Here you would implement the actual wallet import logic
    console.log(`Importing ${importingWalletType} wallet with private key:`, privateKey)
  }

  const handleExportWallet = (type: "developer" | "funder") => {
    // Here you would get the actual wallet data
    const walletData = {
      privateKey: "your-private-key-here",
      publicKey: "5vRp8KZWDV2MKUBAhTsCpGrnDEW341FBRvxysNRbeUiC",
    }

    const blob = new Blob([JSON.stringify(walletData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${type}Wallet.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClearAllWallets = () => {
    setGeneratedWallets([])
    // Here you would implement the logic to return funds to the funder wallet
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">MAIN WALLETS</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="transition-transform duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
              onClick={refreshBalances}
              disabled={isRefreshing}
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
              REFRESH BALANCES
            </Button>
            <Button
              className="bg-black text-white transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:bg-black flex items-center gap-2"
              onClick={() => setShowGenerateDialog(true)}
            >
              <Plus size={16} />
              GENERATE
            </Button>
            <Button
              variant="outline"
              className="transition-transform duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
              onClick={() => setShowImportDialog(true)}
            >
              <Import size={16} />
              IMPORT
            </Button>
            <Button
              variant="outline"
              className="transition-transform duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
              onClick={handleSaveWallets}
              disabled={!isPremium}
            >
              <Save size={16} />
              SAVE
            </Button>
            <Button
              variant="outline"
              className="transition-transform duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
              onClick={() => setShowClearWalletsDialog(true)}
            >
              <Trash2 size={16} />
              CLEAR ALL
            </Button>
          </div>
        </div>
      </div>

      {/* Main Wallets Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* DEVELOPER WALLET */}
        <Card className="border-2">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">DEVELOPER</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5">
                        <Info size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Developer wallet is used for testing and development purposes.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="transition-transform duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
                  onClick={() => {
                    setImportingWalletType("developer")
                    setShowImportPrivateKeyDialog(true)
                  }}
                >
                  <Import size={16} />
                  Import
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="transition-transform duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
                  onClick={() => handleExportWallet("developer")}
                >
                  <Export size={16} />
                  Export
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Public Key</label>
                <div className="flex items-center gap-1">
                  <div className="font-mono text-base">5vRp8KZWDV2MKUBAhTsCpGrnDEW341FBRvxysNRbeUiC</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => handleCopy("5vRp8KZWDV2MKUBAhTsCpGrnDEW341FBRvxysNRbeUiC", "developer")}
                  >
                    {copySuccess === "developer" ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Balance</label>
                <BalanceDisplay amount={balances.developer} />
              </div>
            </div>
          </div>
        </Card>

        {/* FUNDER WALLET */}
        <Card className="border-2">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">FUNDER</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5">
                        <Info size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Funder wallet is used to distribute funds to generated wallets.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="transition-transform duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
                  onClick={() => {
                    setImportingWalletType("funder")
                    setShowImportPrivateKeyDialog(true)
                  }}
                >
                  <Import size={16} />
                  Import
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="transition-transform duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
                  onClick={() => handleExportWallet("funder")}
                >
                  <Export size={16} />
                  Export
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Public Key</label>
                <div className="flex items-center gap-1">
                  <div className="font-mono text-base">5vRp8KZWDV2MKUBAhTsCpGrnDEW341FBRvxysNRbeUiC</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => handleCopy("5vRp8KZWDV2MKUBAhTsCpGrnDEW341FBRvxysNRbeUiC", "funder")}
                  >
                    {copySuccess === "funder" ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Balance</label>
                <BalanceDisplay amount={balances.funder} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button className="bg-black text-white transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:bg-black flex items-center gap-2">
          <SendHorizontal size={16} />
          DISTRIBUTE FUNDS
        </Button>
        <Button className="bg-black text-white transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:bg-black flex items-center gap-2">
          <ArrowUpCircle size={16} />
          UPGRADE WALLETS
        </Button>
        <Button className="bg-black text-white transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:bg-black flex items-center gap-2">
          <RotateCcw size={16} />
          RETURN FUNDS
        </Button>
      </div>

      {/* Generated Wallets Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">GENERATED WALLETS</h2>
        <div className="grid gap-4">
          {generatedWallets.map((wallet, index) => (
            <Card key={wallet.id} className="p-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground transition-transform duration-200 hover:scale-105"
                  onClick={() => handleDeleteWallet(index)}
                >
                  <Trash2 size={20} />
                </Button>
                <div className="flex items-center gap-4 flex-1">
                  <span className="font-semibold">#{index + 1}</span>
                  <div className="grid grid-cols-[minmax(120px,auto)_1fr] gap-6 w-full">
                    <div>
                      <label className="text-sm font-medium">Balance</label>
                      <BalanceDisplay amount={balances.generated[index]} />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium">Public Key</label>
                        <div className="flex items-center gap-1">
                          <div className="font-mono text-base truncate">
                            5vRp8KZWDV2MKUBAhTsCpGrnDEW341FBRvxysNRbeUiC
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() =>
                              handleCopy("5vRp8KZWDV2MKUBAhTsCpGrnDEW341FBRvxysNRbeUiC", `generated-${index}`)
                            }
                          >
                            {copySuccess === `generated-${index}` ? (
                              <Check size={12} className="text-green-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Private Key</label>
                        <div className="flex items-center gap-1">
                          <div className="font-mono text-base truncate">••••••••••••••••••••••••••</div>
                          {isPremium && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() =>
                                handleCopy("wiujdaiowjdawjdawjdadjadawdawd", `generated-${index}-private`, true)
                              }
                            >
                              {copySuccess === `generated-${index}-private` ? (
                                <Check size={12} className="text-green-500" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <GenerateWalletsDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        onGenerate={handleGenerateWallets}
      />

      <ImportWalletsDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImportWallets}
        isPremium={isPremium}
      />

      <ImportPrivateKeyDialog
        open={showImportPrivateKeyDialog}
        onOpenChange={setShowImportPrivateKeyDialog}
        onImport={handleImportPrivateKey}
        walletType={importingWalletType || "developer"}
      />

      <ClearWalletsDialog
        open={showClearWalletsDialog}
        onOpenChange={setShowClearWalletsDialog}
        onConfirm={handleClearAllWallets}
        isPremium={isPremium}
      />
    </div>
  )
}

