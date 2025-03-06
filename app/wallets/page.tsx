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
  Loader2,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSettings } from "@/contexts/settings-context"
import { useUser } from "@/contexts/user-context"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import bs58 from 'bs58'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

// Components
import { GenerateWalletsDialog } from "@/components/dialogs/generate-wallets-dialog"
import { ImportWalletsDialog } from "@/components/dialogs/import-wallets-dialog"
import { ImportPrivateKeyDialog } from "@/components/dialogs/import-private-key-dialog"
import { ClearWalletsDialog } from "@/components/dialogs/clear-wallets-dialog"
import { DistributeFundsDialog, DistributeOptions } from "@/components/dialogs/distribute-funds-dialog"
import { UpgradeWalletsDialog, UpgradeOptions } from "@/components/dialogs/upgrade-wallets-dialog"
import { ReturnFundsDialog, ReturnOptions } from "@/components/dialogs/return-funds-dialog"
import ProtectedRoute from "@/components/protected-route"

// Hooks
import { useToast } from "@/hooks/use-toast"
import { useCachedBalances } from "@/hooks/use-cached-balances";

// Utils
import { 
  generateWallets, 
  refreshWalletBalances, 
  distributeFunds,
  convertToSmartWallet,
  returnFundsToFunder,
  saveWalletsToSupabase,
  loadWalletsFromSupabase,
  deleteWalletsFromSupabase,
  saveMainWalletToSupabase,
  loadMainWalletsFromSupabase,
  deleteMainWalletFromSupabase,
  isSameWallet,
  hasEnoughBalance,
  maskPrivateKey,
  PLATFORMS,
  WalletInfo as WalletInfoType,
  parsePrivateKey
} from "@/utils/wallet-utils"

// MainWallet interface
interface MainWallet {
  publicKey: string
  privateKey: string
  balance: string | null
}

export default function WalletsPage() {
  const { toast } = useToast()
  const { settings } = useSettings()
  const { isPremium } = useUser()
  const { user } = useAuth()
  
  // UI state
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showDistributeDialog, setShowDistributeDialog] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [showImportPrivateKeyDialog, setShowImportPrivateKeyDialog] = useState(false)
  const [showClearWalletsDialog, setShowClearWalletsDialog] = useState(false)
  const [importingWalletType, setImportingWalletType] = useState<"developer" | "funder" | null>(null)
  
  // Wallet data state
  const [generatedWallets, setGeneratedWallets] = useState<WalletInfoType[]>([])
  const [developerWallet, setDeveloperWallet] = useState<MainWallet | null>(null)
  const [funderWallet, setFunderWallet] = useState<MainWallet | null>(null)
  
  // Use cached balances hook
  const { 
    wallets: cachedWallets, 
    developerWallet: cachedDevWallet, 
    funderWallet: cachedFundWallet, 
    isRefreshing, 
    refreshBalances 
  } = useCachedBalances(
    generatedWallets,
    developerWallet,
    funderWallet,
    settings.rpcUrl || null,
    user,  // Add the user object
    supabase  // Add the supabase client
  );
  
  // Processing states
  const [isDistributing, setIsDistributing] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isReturning, setIsReturning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Function to save all balances to Supabase
  const saveAllBalancesToSupabase = useCallback(async () => {
    if (!user) {
      console.log("No user, skipping Supabase save");
      return;
    }
    
    try {
      console.log("Starting to save balances to Supabase...");
      
      // Save generated wallets
      if (cachedWallets.length > 0) {
        console.log(`Saving ${cachedWallets.length} generated wallets to Supabase with balances:`, 
          cachedWallets.map(w => ({pubkey: w.publicKey.slice(0,8), balance: w.balance})));
          
        // Save to Supabase
        await saveWalletsToSupabase(user.id, cachedWallets, supabase);
        
        // Update main state to match cache
        setGeneratedWallets(cachedWallets);
      }
      
      // Save developer wallet
      if (cachedDevWallet) {
        console.log(`Saving developer wallet to Supabase: ${cachedDevWallet.publicKey.slice(0,8)} with balance ${cachedDevWallet.balance}`);
        
        // Save to Supabase
        await saveMainWalletToSupabase(user.id, 'developer', cachedDevWallet, supabase);
        
        // Update main state to match cache
        setDeveloperWallet(cachedDevWallet);
      }
      
      // Save funder wallet
      if (cachedFundWallet) {
        console.log(`Saving funder wallet to Supabase: ${cachedFundWallet.publicKey.slice(0,8)} with balance ${cachedFundWallet.balance}`);
        
        // Save to Supabase
        await saveMainWalletToSupabase(user.id, 'funder', cachedFundWallet, supabase);
        
        // Update main state to match cache
        setFunderWallet(cachedFundWallet);
      }
      
      console.log("Successfully saved all balances to Supabase");
    } catch (error) {
      console.error('Failed to save balances to Supabase:', error);
    }
  }, [user, cachedWallets, cachedDevWallet, cachedFundWallet, setGeneratedWallets, setDeveloperWallet, setFunderWallet]);

  // Handle refresh balances with Supabase update
  const handleRefreshBalances = async () => {
    // First refresh balances
    await refreshBalances();
    
    // Add a small delay to ensure state updates are propagated
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Then save the updated balances to Supabase
    await saveAllBalancesToSupabase();
  };
  
  // Load wallets from Supabase on initial render without refreshing balances
  useEffect(() => {
    async function loadSavedWallets() {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // 1. Load generated wallets from Supabase
        const wallets = await loadWalletsFromSupabase(user.id, supabase);
        
        if (wallets && wallets.length > 0) {
          setGeneratedWallets(wallets);
        }
        
        // 2. Load main wallets (developer and funder) from Supabase
        const mainWallets = await loadMainWalletsFromSupabase(user.id, supabase);
        
        if (mainWallets.developer) {
          setDeveloperWallet(mainWallets.developer);
        }
        
        if (mainWallets.funder) {
          setFunderWallet(mainWallets.funder);
        }
        
        // If no wallets were loaded from Supabase, try loading from localStorage as a fallback
        if (!mainWallets.developer && !mainWallets.funder) {
          const savedMainWallets = localStorage.getItem('mortality-main-wallets');
          if (savedMainWallets) {
            try {
              const mainWalletData = JSON.parse(savedMainWallets);
              if (mainWalletData.developer) setDeveloperWallet(mainWalletData.developer);
              if (mainWalletData.funder) setFunderWallet(mainWalletData.funder);
            } catch (error) {
              console.error("Error parsing saved main wallets:", error);
            }
          }
        }
        
        // After loading wallets, if we have an RPC URL, refresh the balances
        if (settings.rpcUrl && (wallets.length > 0 || mainWallets.developer || mainWallets.funder)) {
          // Give state time to update before refreshing
          setTimeout(() => {
            refreshBalances().catch(console.error);
          }, 500);
        }
        
      } catch (error) {
        console.error("Error loading saved wallets:", error);
        toast({
          title: "Error",
          description: "Failed to load your saved wallets",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSavedWallets();
  }, [user, toast, settings.rpcUrl, refreshBalances]);

  // Update the main wallet state in Supabase whenever they change
  useEffect(() => {
    // If user is logged in, save main wallets to Supabase whenever they change
    if (user) {
      if (developerWallet) {
        saveMainWalletToSupabase(user.id, 'developer', developerWallet, supabase).catch(console.error);
      }
      
      if (funderWallet) {
        saveMainWalletToSupabase(user.id, 'funder', funderWallet, supabase).catch(console.error);
      }
    }
    
    // Also save to localStorage as a backup
    const mainWalletData = {
      developer: developerWallet,
      funder: funderWallet
    };
    localStorage.setItem('mortality-main-wallets', JSON.stringify(mainWalletData));
  }, [developerWallet, funderWallet, user]);

  const handleCopy = async (text: string, wallet: string) => {
    try {
      // Only allow copy of private keys for premium users
      if (wallet.includes("-private") && !isPremium) {
        toast({
          title: "Premium Feature",
          description: "Copying private keys is only available for premium users",
          variant: "destructive"
        });
        return;
      }
      
      await navigator.clipboard.writeText(text);
      setCopySuccess(wallet);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  }

  // Handle generating new wallets
  const handleGenerateWallets = async (amount: number) => {
    // Check if generating more wallets would exceed the maximum
    if (generatedWallets.length + amount > 100) {
      toast({
        title: "Limit Exceeded",
        description: `You can only generate a maximum of 100 wallets. You currently have ${generatedWallets.length} wallets.`,
        variant: "destructive"
      });
      return;
    }
  
    try {
      // Generate new wallets using the utility function
      const newWallets = await generateWallets(amount);
      
      // Format for our UI
      const formattedWallets = newWallets.map(wallet => ({
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
        balance: "0.000000000", // Default to zero instead of null
        platform: "NONE",
        hasTipped: false
      }));
      
      // Create a completely new array instead of using functional update
      const updatedWallets = [...generatedWallets, ...formattedWallets];
      
      // Set state directly with the new array
      setGeneratedWallets(updatedWallets);
      
      // Save to Supabase if user is logged in
      if (user) {
        await saveWalletsToSupabase(user.id, updatedWallets, supabase);
      }
      
      toast({
        title: "Wallets Generated",
        description: `Successfully generated ${amount} new wallet${amount > 1 ? 's' : ''}.`
      });
    } catch (error) {
      console.error("Error generating wallets:", error);
      toast({
        title: "Error",
        description: "Failed to generate wallets. Please try again.",
        variant: "destructive"
      });
    }
  }

  const handleImportPrivateKey = async (privateKey: string) => {
    if (!importingWalletType || !user) return;
    
    try {
      // Try to create a keypair from the private key
      const keypair = parsePrivateKey(privateKey);
      const publicKey = keypair.publicKey.toString();
      
      // Check if this wallet is already being used as the other type
      if (
        (importingWalletType === "developer" && funderWallet?.publicKey === publicKey) || 
        (importingWalletType === "funder" && developerWallet?.publicKey === publicKey)
      ) {
        toast({
          title: "Warning",
          description: `This wallet is already being used as a ${importingWalletType === "developer" ? "funder" : "developer"} wallet. Using the same wallet for both roles is not recommended.`,
          variant: "destructive"
        });
      }
      
      // Now we have a valid keypair
      const wallet = {
        publicKey: publicKey,
        privateKey: bs58.encode(keypair.secretKey),
        balance: null
      };
      
      // Immediately fetch the balance if we have an RPC URL
      if (settings.rpcUrl) {
        try {
          const connection = new Connection(settings.rpcUrl, 'confirmed');
          const pubKey = new PublicKey(wallet.publicKey);
          const balance = await connection.getBalance(pubKey);
          const balanceString = (balance / LAMPORTS_PER_SOL).toFixed(9);
          wallet.balance = balanceString;
        } catch (err) {
          console.error("Error fetching initial balance:", err);
        }
      }
      
      // Update the appropriate wallet by creating a new object reference
      if (importingWalletType === "developer") {
        // Force a new object reference to trigger proper re-render
        const newWallet = {...wallet};
        setDeveloperWallet(newWallet);
        
        // Save to Supabase
        await saveMainWalletToSupabase(user.id, 'developer', newWallet, supabase);
        
        // Force a re-render
        setTimeout(() => {
          setDeveloperWallet({...newWallet});
        }, 100);
        
        toast({
          title: "Developer Wallet Imported",
          description: "Successfully imported developer wallet."
        });
      } else if (importingWalletType === "funder") {
        // Force a new object reference to trigger proper re-render
        const newWallet = {...wallet};
        setFunderWallet(newWallet);
        
        // Save to Supabase
        await saveMainWalletToSupabase(user.id, 'funder', newWallet, supabase);
        
        // Force a re-render
        setTimeout(() => {
          setFunderWallet({...newWallet});
        }, 100);
        
        toast({
          title: "Funder Wallet Imported",
          description: "Successfully imported funder wallet."
        });
      }
      
      // Close the dialog
      setShowImportPrivateKeyDialog(false);
      
      // Clear the input type
      setImportingWalletType(null);
      
    } catch (error) {
      console.error("Error importing private key:", error);
      toast({
        title: "Import Failed",
        description: "Invalid private key format. Please check and try again.",
        variant: "destructive"
      });
    }
  };

  const handleImportWallets = (file: File) => {
    if (!isPremium) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Handle different possible formats
        if (Array.isArray(data)) {
          // Array of wallets
          const importedWallets = data.map(wallet => ({
            publicKey: wallet.publicKey || wallet.pubkey || wallet.public_key || Date.now().toString(),
            privateKey: wallet.privateKey || wallet.secretKey || wallet.secret_key || wallet.private_key,
            balance: null,
            platform: wallet.platform || "NONE",
            hasTipped: wallet.hasTipped || false
          }));
          
          // Validate wallets
          const validWallets = importedWallets.filter(w => 
            w.publicKey && w.privateKey && 
            typeof w.publicKey === 'string' && 
            typeof w.privateKey === 'string'
          );
          
          const updatedWallets = [...generatedWallets, ...validWallets];
          setGeneratedWallets(updatedWallets);
          
          // Save to Supabase if user is logged in
          if (user) {
            await saveWalletsToSupabase(user.id, updatedWallets, supabase);
          }
          
          toast({
            title: "Wallets Imported",
            description: `Successfully imported ${validWallets.length} wallet${validWallets.length > 1 ? 's' : ''}.`
          });
          
          // Refresh balances
          await handleRefreshBalances();
        } else if (data.wallets) {
          // { wallets: [...] } format
          handleImportWallets(new Blob([JSON.stringify(data.wallets)], { type: 'application/json' }) as any);
        } else if (data.generated) {
          // Our own format
          const updatedWallets = [...generatedWallets, ...data.generated];
          setGeneratedWallets(updatedWallets);
          
          // Save to Supabase if user is logged in
          if (user) {
            await saveWalletsToSupabase(user.id, updatedWallets, supabase);
          }
          
          toast({
            title: "Wallets Imported",
            description: `Successfully imported ${data.generated.length} wallet${data.generated.length > 1 ? 's' : ''}.`
          });
          
          // Refresh balances
          await handleRefreshBalances();
        }
      } catch (error) {
        console.error("Error parsing wallet file:", error);
        toast({
          title: "Import Failed",
          description: "Failed to import wallets. Invalid file format.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  }

  const handleSaveWallets = () => {
    if (!isPremium || generatedWallets.length === 0) return;

    const walletsData = { wallets: generatedWallets };
    const blob = new Blob([JSON.stringify(walletsData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mortality_wallets.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Wallets Saved",
      description: `Successfully saved ${generatedWallets.length} wallet${generatedWallets.length > 1 ? 's' : ''} to file.`
    });
  }

  const handleExportWallet = (type: "developer" | "funder") => {
    if (!isPremium) {
      toast({
        title: "Premium Feature",
        description: "Exporting wallets is only available for premium users",
        variant: "destructive"
      });
      return;
    }
    
    const wallet = type === "developer" ? developerWallet : funderWallet;
    if (!wallet) return;
    
    const walletData = {
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey
    };

    const blob = new Blob([JSON.stringify(walletData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_wallet.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Wallet Exported",
      description: `Successfully exported ${type} wallet to file.`
    });
  }

  const handleDeleteWallet = async (index: number) => {
    const walletToDelete = generatedWallets[index];
    const newWallets = [...generatedWallets];
    newWallets.splice(index, 1);
    setGeneratedWallets(newWallets);
    
    // Delete from Supabase if user is logged in
    if (user) {
      await deleteWalletsFromSupabase(user.id, [walletToDelete.publicKey], supabase);
    }
    
    toast({
      title: "Wallet Deleted",
      description: "Removed wallet from generated wallets list."
    });
  }

  const handleClearAllWallets = async () => {
    // First return funds if possible
    if (funderWallet && generatedWallets.length > 0) {
      await handleReturnFunds({
        selectedWallets: generatedWallets.map((_, index) => index),
        closeSplAccounts: true
      });
    }
    
    // Now clear the wallets array
    setGeneratedWallets([]);
    
    // Delete from Supabase if user is logged in
    if (user) {
      await deleteWalletsFromSupabase(
        user.id, 
        generatedWallets.map(w => w.publicKey), 
        supabase
      );
    }
    
    toast({
      title: "Wallets Cleared",
      description: "All generated wallets have been removed."
    });
  }
  
  const handleDistributeFunds = async (options: DistributeOptions) => {
    if (!funderWallet) {
      toast({
        title: "No Funder Wallet",
        description: "Please import a funder wallet first.",
        variant: "destructive"
      });
      return;
    }
    
    if (!settings.rpcUrl) {
      toast({
        title: "RPC URL Required",
        description: "Please configure an RPC URL in the settings first.",
        variant: "destructive"
      });
      return;
    }
    
    setIsDistributing(true);
    
    try {
      // Get the wallet subset to distribute to
      const targetWallets = options.selectedWallets.map(index => generatedWallets[index]);
      
      // Handle random amounts if enabled
      let amounts: number[] = [];
      if (options.isRandom && options.minAmount !== undefined && options.maxAmount !== undefined) {
        amounts = targetWallets.map(() => {
          const min = options.minAmount || 0.0001;
          const max = options.maxAmount || 0.01;
          return min + Math.random() * (max - min);
        });
      } else {
        // Same amount for all wallets
        amounts = targetWallets.map(() => options.amount);
      }
      
      // Calculate total amount
      const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
      
      // Check if funder has enough balance
      const funderBalance = parseFloat(funderWallet.balance || "0");
      if (funderBalance < totalAmount) {
        toast({
          title: "Insufficient Balance",
          description: `Funder wallet needs at least ${totalAmount.toFixed(4)} SOL, but only has ${funderBalance.toFixed(4)} SOL.`,
          variant: "destructive"
        });
        return;
      }
      
      // Add Jito settings
      const jitoSettings = {
        useJito: settings.jitoProxyless || false,
        jitoRpcUrl: settings.blockEngine || undefined,
        maxTipAmount: parseFloat(settings.jitoTipAmount) || 0.0005
      };
      
      // Execute the distribution
      const txResults = await distributeFunds(
        funderWallet.privateKey,
        targetWallets,
        options.amount,
        settings.rpcUrl,
        jitoSettings
      );
      
      const successCount = txResults.filter(tx => tx !== null).length;
      
      if (successCount === targetWallets.length) {
        toast({
          title: "Funds Distributed",
          description: `Successfully sent SOL to ${successCount} wallet${successCount !== 1 ? 's' : ''}.`
        });
      } else if (successCount > 0) {
        toast({
          title: "Partial Success",
          description: `Sent SOL to ${successCount}/${targetWallets.length} wallets. Some transactions failed.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Distribution Failed",
          description: "Failed to distribute funds to any wallets.",
          variant: "destructive"
        });
      }
      
      // Refresh balances after distribution
      await refreshBalances();
      
      // Save updated balances to Supabase
      await saveAllBalancesToSupabase();
      
    } catch (error) {
      console.error("Error distributing funds:", error);
      toast({
        title: "Distribution Failed",
        description: "An error occurred while distributing funds.",
        variant: "destructive"
      });
    } finally {
      setIsDistributing(false);
    }
  }
  
  const handleUpgradeWallets = async (options: UpgradeOptions) => {
    if (!funderWallet) {
      toast({
        title: "No Funder Wallet",
        description: "Please import a funder wallet first.",
        variant: "destructive"
      });
      return;
    }
    
    if (!settings.rpcUrl) {
      toast({
        title: "RPC URL Required",
        description: "Please configure an RPC URL in the settings first.",
        variant: "destructive"
      });
      return;
    }
    
    setIsUpgrading(true);
    
    try {
      // Get the wallet subset to upgrade
      const targetWallets = options.selectedWallets.map(index => generatedWallets[index]);
      const platformName = PLATFORMS[options.platformKey].name;
      
      let successCount = 0;
      let failCount = 0;
      
      // Upgrade each wallet one by one
      for (let i = 0; i < targetWallets.length; i++) {
        const wallet = targetWallets[i];
        const walletIndex = generatedWallets.findIndex(w => w.publicKey === wallet.publicKey);
        
        if (walletIndex >= 0) {
          // The funder wallet pays the platform fee, not the generated wallet
          const updatedWallet = await convertToSmartWallet(
            wallet,
            options.platformKey,
            funderWallet.privateKey,
            settings.rpcUrl
          );
          
          if (updatedWallet) {
            // Update the wallet in our state
            const newWallets = [...generatedWallets];
            newWallets[walletIndex] = updatedWallet;
            setGeneratedWallets(newWallets);
            
            // Update in Supabase if user is logged in
            if (user) {
              await saveWalletsToSupabase(user.id, newWallets, supabase);
            }
            
            successCount++;
          } else {
            failCount++;
          }
        }
      }
      
      if (successCount === targetWallets.length) {
        toast({
          title: "Wallets Upgraded",
          description: `Successfully upgraded ${successCount} wallet${successCount !== 1 ? 's' : ''} to ${platformName}.`
        });
      } else if (successCount > 0) {
        toast({
          title: "Partial Success",
          description: `Upgraded ${successCount}/${targetWallets.length} wallets to ${platformName}. Some upgrades failed.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Upgrade Failed",
          description: "Failed to upgrade any wallets.",
          variant: "destructive"
        });
      }
      
      // Refresh balances after upgrades
      await refreshBalances();
      
      // Save updated balances to Supabase
      await saveAllBalancesToSupabase();
      
    } catch (error) {
      console.error("Error upgrading wallets:", error);
      toast({
        title: "Upgrade Failed",
        description: "An error occurred while upgrading wallets.",
        variant: "destructive"
      });
    } finally {
      setIsUpgrading(false);
    }
  }
  
  const handleReturnFunds = async (options: ReturnOptions) => {
    if (!funderWallet) {
      toast({
        title: "No Funder Wallet",
        description: "Please import a funder wallet first.",
        variant: "destructive"
      });
      return;
    }
    
    if (!settings.rpcUrl) {
      toast({
        title: "RPC URL Required",
        description: "Please configure an RPC URL in the settings first.",
        variant: "destructive"
      });
      return;
    }
    
    setIsReturning(true);
    
    try {
      // Get the wallet subset to return funds from
      const targetWallets = options.selectedWallets.map(index => generatedWallets[index]);
      
      // Execute the return operation
      const txResults = await returnFundsToFunder(
        targetWallets,
        funderWallet.publicKey,
        settings.rpcUrl
      );
      
      const successCount = txResults.filter(tx => tx !== null).length;
      
      if (successCount === targetWallets.length) {
        toast({
          title: "Funds Returned",
          description: `Successfully returned SOL from ${successCount} wallet${successCount !== 1 ? 's' : ''}.`
        });
      } else if (successCount > 0) {
        toast({
          title: "Partial Success",
          description: `Returned SOL from ${successCount}/${targetWallets.length} wallets. Some transactions failed.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Return Failed",
          description: "Failed to return funds from any wallets.",
          variant: "destructive"
        });
      }
      
      // Refresh balances after return
      await refreshBalances();
      
      // Save updated balances to Supabase
      await saveAllBalancesToSupabase();
      
    } catch (error) {
      console.error("Error returning funds:", error);
      toast({
        title: "Return Failed",
        description: "An error occurred while returning funds.",
        variant: "destructive"
      });
    } finally {
      setIsReturning(false);
    }
  }

  // Count wallets with enough balance for upgrades
  const walletsWithBalance = generatedWallets.filter(wallet => hasEnoughBalance(wallet)).length;

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
 );

 // Check if any wallets have large balances (for return funds warning)
 const hasWalletsWithLargeBalances = generatedWallets.some(
   wallet => wallet.balance && parseFloat(wallet.balance) > 0.1
 );
 
 return (
   <ProtectedRoute>
     <div className="p-6 max-w-[1200px] mx-auto space-y-6">
       {/* Header Section */}
       <div className="flex flex-col space-y-4">
         <div className="flex items-center justify-between">
           <h1 className="text-2xl font-bold">MAIN WALLETS</h1>
           <div className="flex items-center gap-3">
             <Button
               variant="outline"
               className="transition-transform duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
               onClick={handleRefreshBalances}
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
               disabled={!isPremium}
             >
               <Import size={16} />
               IMPORT
             </Button>
             <Button
               variant="outline"
               className="transition-transform duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
               onClick={handleSaveWallets}
               disabled={!isPremium || generatedWallets.length === 0}
             >
               <Save size={16} />
               SAVE
             </Button>
             <Button
               variant="outline"
               className="transition-transform duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
               onClick={() => setShowClearWalletsDialog(true)}
               disabled={generatedWallets.length === 0}
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
                   disabled={!cachedDevWallet || !isPremium}
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
                   <div className="font-mono text-base truncate">
                     {cachedDevWallet ? cachedDevWallet.publicKey : "No wallet imported"}
                   </div>
                   {cachedDevWallet && (
                     <Button
                       variant="ghost"
                       size="icon"
                       className="h-6 w-6 shrink-0"
                       onClick={() => handleCopy(cachedDevWallet.publicKey, "developer")}
                     >
                       {copySuccess === "developer" ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                     </Button>
                   )}
                 </div>
               </div>
               <div>
                 <label className="text-sm font-medium">Balance</label>
                 {cachedDevWallet ? (
                   <BalanceDisplay amount={cachedDevWallet.balance} />
                 ) : (
                   <div className="text-muted-foreground">Import a wallet to view balance</div>
                 )}
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
                   disabled={!cachedFundWallet || !isPremium}
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
                   <div className="font-mono text-base truncate">
                     {cachedFundWallet ? cachedFundWallet.publicKey : "No wallet imported"}
                   </div>
                   {cachedFundWallet && (
                     <Button
                       variant="ghost"
                       size="icon"
                       className="h-6 w-6 shrink-0"
                       onClick={() => handleCopy(cachedFundWallet.publicKey, "funder")}
                     >
                       {copySuccess === "funder" ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                     </Button>
                   )}
                 </div>
               </div>
               <div>
                 <label className="text-sm font-medium">Balance</label>
                 {cachedFundWallet ? (
                   <BalanceDisplay amount={cachedFundWallet.balance} />
                 ) : (
                   <div className="text-muted-foreground">Import a wallet to view balance</div>
                 )}
               </div>
             </div>
           </div>
         </Card>
       </div>

       {/* Action Buttons */}
       <div className="flex justify-center gap-4">
         <Button 
           className="bg-black text-white transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:bg-black flex items-center gap-2"
           onClick={() => setShowDistributeDialog(true)}
           disabled={!cachedFundWallet || cachedWallets.length === 0 || isDistributing}
         >
           {isDistributing ? (
             <>
               <Loader2 size={16} className="animate-spin" />
               DISTRIBUTING...
             </>
           ) : (
             <>
               <SendHorizontal size={16} />
               DISTRIBUTE FUNDS
             </>
           )}
         </Button>
         <Button 
           className="bg-black text-white transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:bg-black flex items-center gap-2"
           onClick={() => setShowUpgradeDialog(true)}
           disabled={!cachedFundWallet || walletsWithBalance === 0 || isUpgrading}
         >
           {isUpgrading ? (
             <>
               <Loader2 size={16} className="animate-spin" />
               UPGRADING...
             </>
           ) : (
             <>
               <ArrowUpCircle size={16} />
               UPGRADE WALLETS
             </>
           )}
         </Button>
         <Button 
           className="bg-black text-white transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:bg-black flex items-center gap-2"
           onClick={() => setShowReturnDialog(true)}
           disabled={!cachedFundWallet || cachedWallets.length === 0 || isReturning}
         >
           {isReturning ? (
             <>
               <Loader2 size={16} className="animate-spin" />
               RETURNING...
             </>
           ) : (
             <>
               <RotateCcw size={16} />
               RETURN FUNDS
             </>
           )}
         </Button>
       </div>

       {/* Generated Wallets Section */}
       <div className="space-y-4">
         <h2 className="text-xl font-semibold">GENERATED WALLETS ({cachedWallets.length}/100)</h2>
         {isLoading ? (
           <div className="flex justify-center items-center p-12">
             <Loader2 className="h-8 w-8 animate-spin" />
           </div>
         ) : (
           <div className="grid gap-4">
             {cachedWallets.length === 0 ? (
               <div className="text-center p-6 text-muted-foreground">
                 No wallets generated yet. Click "GENERATE" to create new wallets.
               </div>
             ) : (
               cachedWallets.map((wallet, index) => (
                 <Card key={`wallet-${wallet.publicKey}-${index}`} className="p-4">
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
                       <div className="grid sm:grid-cols-[minmax(120px,auto)_1fr] gap-3 sm:gap-6 w-full">
                         <div>
                           <label className="text-sm font-medium">Balance</label>
                           <BalanceDisplay amount={wallet.balance} />
                           
                           {/* Platform indicator badge */}
                           {wallet.platform && wallet.platform !== "NONE" && (
                             <div className="mt-1">
                               <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-300/20">
                                 {wallet.platform}
                               </span>
                             </div>
                           )}
                         </div>
                         <div className="space-y-2">
                           <div>
                             <label className="text-sm font-medium">Public Key</label>
                             <div className="flex items-center gap-1">
                               <div className="font-mono text-base truncate">{wallet.publicKey}</div>
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className="h-6 w-6 shrink-0"
                                 onClick={() => handleCopy(wallet.publicKey, `generated-${index}`)}
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
                               <div className="font-mono text-base truncate">
                                 {isPremium ? wallet.privateKey : maskPrivateKey(wallet.privateKey)}
                               </div>
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className="h-6 w-6 shrink-0"
                                 onClick={() => handleCopy(wallet.privateKey, `generated-${index}-private`)}
                                 disabled={!isPremium}
                               >
                                 {copySuccess === `generated-${index}-private` ? (
                                   <Check size={12} className="text-green-500" />
                                 ) : isPremium ? (
                                   <Copy size={12} />
                                 ) : (
                                   <Lock size={12} />
                                 )}
                               </Button>
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 </Card>
               ))
             )}
           </div>
         )}
       </div>

       {/* Dialogs */}
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
       
       <DistributeFundsDialog
         open={showDistributeDialog}
         onOpenChange={setShowDistributeDialog}
         onDistribute={handleDistributeFunds}
         maxWallets={cachedWallets.length}
         minAmount={0.0001}
         maxAmount={cachedFundWallet ? parseFloat(cachedFundWallet.balance || "0") : 1}
         isPremium={isPremium}
       />
       
       <UpgradeWalletsDialog
         open={showUpgradeDialog}
         onOpenChange={setShowUpgradeDialog}
         onUpgrade={handleUpgradeWallets}
         maxWallets={cachedWallets.length}
         isPremium={isPremium}
         wallets={cachedWallets}
       />
       
       <ReturnFundsDialog
         open={showReturnDialog}
         onOpenChange={setShowReturnDialog}
         onReturn={handleReturnFunds}
         maxWallets={cachedWallets.length}
         hasTooBigBalances={hasWalletsWithLargeBalances}
         isPremium={isPremium}
       />
     </div>
   </ProtectedRoute>
 );
}