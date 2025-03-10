"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSettings } from "@/contexts/settings-context";
import { useUser } from "@/contexts/user-context";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import bs58 from 'bs58';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Components
import { GenerateWalletsDialog } from "@/components/dialogs/generate-wallets-dialog";
import { ImportWalletsDialog } from "@/components/dialogs/import-wallets-dialog";
import { ImportPrivateKeyDialog } from "@/components/dialogs/import-private-key-dialog";
import { ClearWalletsDialog } from "@/components/dialogs/clear-wallets-dialog";
import { DistributeFundsDialog, DistributeOptions } from "@/components/dialogs/distribute-funds-dialog";
import { UpgradeWalletsDialog, UpgradeOptions } from "@/components/dialogs/upgrade-wallets-dialog";
import { ReturnFundsDialog, ReturnOptions } from "@/components/dialogs/return-funds-dialog";
import ProtectedRoute from "@/components/protected-route";

// Hooks
import { useToast } from "@/hooks/use-toast";
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
  WalletInfo,
  WalletInfo as WalletInfoType,
  parsePrivateKey
} from "@/utils/wallet-utils";

// MainWallet interface
interface MainWallet {
  publicKey: string;
  privateKey: string;
  balance: string | null;
}

export default function WalletsPage() {
  // Wallet state management
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefetchingData, setIsRefetchingData] = useState(false);
  const dataLoadedRef = useRef(false);

  const { toast } = useToast();
  const { settings } = useSettings();
  const { isPremium } = useUser();
  const { user } = useAuth();

  // UI state
  const [isClearingWallets, setIsClearingWallets] = useState(false)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showDistributeDialog, setShowDistributeDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [showImportPrivateKeyDialog, setShowImportPrivateKeyDialog] = useState(false);
  const [showClearWalletsDialog, setShowClearWalletsDialog] = useState(false);
  const [importingWalletType, setImportingWalletType] = useState<"developer" | "funder" | null>(null);
  const [showWalletWarningDialog, setShowWalletWarningDialog] = useState(false);
  const [pendingWalletImport, setPendingWalletImport] = useState<{
    type: "developer" | "funder";
    wallet: any;
  } | null>(null);

  // Wallet data state
  const [generatedWallets, setGeneratedWallets] = useState<WalletInfoType[]>([]);
  const [developerWallet, setDeveloperWallet] = useState<MainWallet | null>(null);
  const [funderWallet, setFunderWallet] = useState<MainWallet | null>(null);

  // Processing states
  const [isDistributing, setIsDistributing] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use cached balances hook
  const { 
    isRefreshing, 
    refreshBalances 
  } = useCachedBalances(
    generatedWallets,
    developerWallet,
    funderWallet,
    settings.rpcUrl || null,
    user,
    supabase
  );

  // Direct Supabase backup for main wallets
const backupMainWallet = async (walletData: any, walletType: 'developer' | 'funder') => {
  if (!user) return;
  
  try {
    await supabase
      .from('emergency_wallet_backups')
      .insert({
        user_id: user.id,
        wallet_data: {
          wallet: walletData
        },
        backup_type: walletType, // Now uses 'developer' or 'funder' directly
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error(`${walletType} wallet backup attempt error:`, error);
  }
};

// Direct Supabase backup for generated wallets
const backupGeneratedWallets = async (walletsData: WalletInfo[], operationType: string = 'generated') => {
  if (!user) return;
  
  try {
    await supabase
      .from('emergency_wallet_backups')
      .insert({
        user_id: user.id,
        wallet_data: {
          wallets: walletsData,
          count: walletsData.length,
          operation: operationType
        },
        backup_type: 'generated',
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error("Generated wallets backup attempt error:", error);
  }
};

  // Simple function to refresh balances
  const handleRefreshBalances = async () => {
    try {
      const { 
        updatedGeneratedWallets, 
        updatedDevWallet, 
        updatedFundWallet 
      } = await refreshBalances();
      
      // Update state with refreshed data
      setGeneratedWallets(updatedGeneratedWallets);
      if (updatedDevWallet) setDeveloperWallet(updatedDevWallet);
      if (updatedFundWallet) setFunderWallet(updatedFundWallet);
      
      toast({
        title: "Success",
        description: "Wallet balances refreshed successfully",
      });
    } catch (error) {
      console.error("Error refreshing balances:", error);
      toast({
        title: "Error",
        description: "Failed to refresh wallet balances",
        variant: "destructive"
      });
    }
  };
  
  // Load wallets from Supabase on initial render
  useEffect(() => {
    async function loadSavedWallets() {
      if (!user) return;
      
      if (!dataLoadedRef.current) {
        setIsInitialLoading(true);
      } else {
        setIsRefetchingData(true);
      }
      
      try {
        const wallets = await loadWalletsFromSupabase(user.id, supabase);
        if (wallets && wallets.length > 0) {
          setGeneratedWallets(wallets);
        }
        
        const mainWallets = await loadMainWalletsFromSupabase(user.id, supabase);
        if (mainWallets.developer) setDeveloperWallet(mainWallets.developer);
        if (mainWallets.funder) setFunderWallet(mainWallets.funder);
        
        dataLoadedRef.current = true;
      } catch (error) {
        console.error("Error loading saved wallets:", error);
        toast({
          title: "Error",
          description: "Failed to load your saved wallets",
          variant: "destructive"
        });
      } finally {
        setIsInitialLoading(false);
        setIsRefetchingData(false);
      }
    }
    
    loadSavedWallets();
  }, [user, supabase, toast]);

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
        description: (<>You can only generate a maximum of 100 wallets.<br/>You currently have {generatedWallets.length} wallets.</>),
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
        
        // Add silent backup call
        await backupGeneratedWallets(formattedWallets, 'generated');
      }
      
      toast({
        title: "Wallets Generated",
        description: (<>Successfully generated {amount} new wallet{amount > 1 ? 's' : ''}.</>)
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

  // Modify the main wallet import functionality
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
        // Store the pending wallet for later use
        setPendingWalletImport({
          type: importingWalletType,
          wallet: {
            publicKey: publicKey,
            privateKey: bs58.encode(keypair.secretKey),
            balance: null
          }
        });
        
        // Show warning dialog
        setShowWalletWarningDialog(true);
        return; // Exit the function to wait for user confirmation
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
        
        // Add silent backup call for developer wallet
        await backupMainWallet(newWallet, 'developer');
        
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
        
        // Add silent backup call for funder wallet
        await backupMainWallet(newWallet, 'funder');
        
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
  
  const handleConfirmSameWalletImport = async () => {
    if (!pendingWalletImport || !user) return;
    
    const { type, wallet } = pendingWalletImport;
    
    // Update the appropriate wallet by creating a new object reference
    if (type === "developer") {
      const newWallet = {...wallet};
      
      // Fetch the balance immediately if we have an RPC URL
      if (settings.rpcUrl) {
        try {
          const connection = new Connection(settings.rpcUrl, 'confirmed');
          const pubKey = new PublicKey(newWallet.publicKey);
          const balance = await connection.getBalance(pubKey);
          const balanceString = (balance / LAMPORTS_PER_SOL).toFixed(9);
          newWallet.balance = balanceString;
        } catch (err) {
          console.error("Error fetching initial balance:", err);
        }
      }
      
      setDeveloperWallet(newWallet);
      await saveMainWalletToSupabase(user.id, 'developer', newWallet, supabase);
      await backupMainWallet(newWallet, 'developer');
      
      toast({
        title: "Developer Wallet Imported",
        description: (<>Successfully imported developer wallet. <br/>This same wallet is also being used as your funder wallet.</>)
      });
    } else if (type === "funder") {
      const newWallet = {...wallet};
      
      // Fetch the balance immediately if we have an RPC URL
      if (settings.rpcUrl) {
        try {
          const connection = new Connection(settings.rpcUrl, 'confirmed');
          const pubKey = new PublicKey(newWallet.publicKey);
          const balance = await connection.getBalance(pubKey);
          const balanceString = (balance / LAMPORTS_PER_SOL).toFixed(9);
          newWallet.balance = balanceString;
        } catch (err) {
          console.error("Error fetching initial balance:", err);
        }
      }
      
      setFunderWallet(newWallet);
      await saveMainWalletToSupabase(user.id, 'funder', newWallet, supabase);
      await backupMainWallet(newWallet, 'funder');
      
      toast({
        title: "Funder Wallet Imported",
        description: (<>Successfully imported funder wallet.<br/><br/><span className="text-xs text-red-500 dark:text-red-500">Note: This same wallet is also being used as your developer wallet.</span></>)
      });
    }
    
    // Close dialogs and reset state
    setShowWalletWarningDialog(false);
    setShowImportPrivateKeyDialog(false);
    setPendingWalletImport(null);
    setImportingWalletType(null);
  };

  const handleImportWallets = (file: File) => {
    if (!isPremium) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        let importedWallets: WalletInfo[] = [];
        
        // Handle different possible formats
        if (Array.isArray(data)) {
          // Array of wallets
          importedWallets = data.map(wallet => ({
            publicKey: wallet.publicKey || wallet.pubkey || wallet.public_key || Date.now().toString(),
            privateKey: wallet.privateKey || wallet.secretKey || wallet.secret_key || wallet.private_key,
            balance: null,
            platform: wallet.platform || "NONE",
            hasTipped: wallet.hasTipped || false
          }));
        } else if (data.wallets) {
          // { wallets: [...] } format
          importedWallets = data.wallets.map((wallet: any) => ({
            publicKey: wallet.publicKey || wallet.pubkey || wallet.public_key || Date.now().toString(),
            privateKey: wallet.privateKey || wallet.secretKey || wallet.secret_key || wallet.private_key,
            balance: null,
            platform: wallet.platform || "NONE",
            hasTipped: wallet.hasTipped || false
          }));
        } else if (data.generated) {
          // Our own format
          importedWallets = data.generated;
        }
        
        // Validate wallets
        const validWallets = importedWallets.filter(w => 
          w.publicKey && w.privateKey && 
          typeof w.publicKey === 'string' && 
          typeof w.privateKey === 'string'
        );
        
        if (validWallets.length === 0) {
          toast({
            title: "Import Failed",
            description: "No valid wallets found in the file.",
            variant: "destructive"
          });
          return;
        }
        
        const updatedWallets = [...generatedWallets, ...validWallets];
        setGeneratedWallets(updatedWallets);
        
        // Save to Supabase if user is logged in
        if (user) {
          await saveWalletsToSupabase(user.id, updatedWallets, supabase);
          
          // Add silent backup call for imported wallets
          await backupGeneratedWallets(validWallets, 'imported');
        }
        
        toast({
          title: "Wallets Imported",
          description: `Successfully imported ${validWallets.length} wallet${validWallets.length > 1 ? 's' : ''}.`
        });
        
        // Refresh balances
        await handleRefreshBalances();
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
  };

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
    try {
      setIsClearingWallets(true);
      
      // First try to return funds if possible - with better validation
      let returnSuccess = true;
      let skippedReturnDueToNoFunder = false;
      const walletsWithBalance = generatedWallets.filter(w => parseFloat(w.balance || "0") > 0);
      
      console.log(`Clear wallets: Found ${walletsWithBalance.length} wallets with balance`);
      
      if (walletsWithBalance.length > 0) {
        // Check if we have a funder wallet to return to
        if (!funderWallet || !funderWallet.publicKey) {
          console.log("Clear wallets: No funder wallet available for returns");
          skippedReturnDueToNoFunder = true;
          toast({
            title: "Warning",
            description: (<>Can't return funds - no funder wallet configured.<br/>Wallets will be removed anyway.</>),
            variant: "destructive"
          });
        } else {
          try {
            console.log("Attempting to return funds before clearing wallets...");
            
            // Create the indices of wallets with balance
            const walletsWithBalanceIndices = walletsWithBalance.map(w => 
              generatedWallets.findIndex(gw => gw.publicKey === w.publicKey)
            ).filter(index => index !== -1);
            
            console.log(`Clear wallets: Returning funds from indices: ${walletsWithBalanceIndices.join(', ')}`);
            
            // Return funds with more robust error handling
            let returnResults: (string | null)[] = [];
            let successCount = 0;
  
            try {
              const result = await handleReturnFunds({
                selectedWallets: walletsWithBalanceIndices,
                closeSplAccounts: true
              });
              
              // Make sure result is an array
              returnResults = Array.isArray(result) ? result : [];
              
              // Calculate success count
              successCount = returnResults.length > 0 ? 
                returnResults.filter((item: string | null) => item !== null).length : 0;
                
              console.log(`Clear wallets: ${successCount}/${walletsWithBalanceIndices.length} returns successful`);
            } catch (error) {
              console.error("Error in handleReturnFunds:", error);
              returnResults = []; // Default to empty array on error
              successCount = 0;
            }
            
            if (successCount === 0 && walletsWithBalanceIndices.length > 0) {
              returnSuccess = false;
              toast({
                title: "Fund Return Failed",
                description: (<>Failed to return funds.<br/>Wallets will still be removed from your list.</>),
                variant: "destructive"
              });
            } else if (successCount < walletsWithBalanceIndices.length) {
              toast({
                title: "Partial Fund Return",
                description: (<>Returned funds from ${successCount}/${walletsWithBalanceIndices.length} wallets.<br/>All wallets will be removed.</>),
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error("Failed to return funds:", error);
            returnSuccess = false;
            
            toast({
              title: "Fund Return Failed",
              description: (<>Error returning funds.<br/>Wallets will still be removed from your list.</>),
              variant: "destructive"
            });
          }
        }
      } else {
        console.log("Clear wallets: No wallets with balance to return");
      }
      
      // Store the public keys of wallets to delete from Supabase
      const walletsToDelete = [...generatedWallets];
      console.log(`Clear wallets: Removing ${walletsToDelete.length} wallets from UI and database`);
      
      // Now clear the wallets array regardless of return success
      setGeneratedWallets([]);
      
      // Delete from Supabase if user is logged in
      try {
        if (user && walletsToDelete.length > 0) {
          await deleteWalletsFromSupabase(
            user.id, 
            walletsToDelete.map(w => w.publicKey), 
            supabase
          );
          console.log("Clear wallets: Successfully deleted from Supabase");
        }
        
        // Show appropriate toast message
        if (walletsWithBalance.length === 0) {
          toast({
            title: "Wallets Cleared",
            description: (
              <>All generated wallets have been removed.<br/>No funds needed to be returned.</>)
          });
        } else if (skippedReturnDueToNoFunder) {
          // Already showed a toast about this above
        } else if (returnSuccess) {
          toast({
            title: "Wallets Cleared",
            description: "Funds returned and all generated wallets have been removed."
          });
        } // Other failure cases already show toasts
      } catch (dbError) {
        console.error("Failed to delete wallets from database:", dbError);
        toast({
          title: "Database Error",
          description: "Wallets were removed from view but there was an error updating the database.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Unexpected error in clearAllWallets:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while clearing wallets.",
        variant: "destructive"
      });
    } finally {
      setIsClearingWallets(false);
    }
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
      
      // Validate minimum amount (0.0015 SOL)
      if (options.amount < 0.0015) {
        toast({
          title: "Amount Too Small",
          description: "Minimum distribution amount is 0.0015 SOL per wallet.",
          variant: "destructive"
        });
        setIsDistributing(false);
        return;
      }
      
      // Same amount for all wallets
      const amounts = targetWallets.map(() => options.amount);
      
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
      await handleRefreshBalances();
      
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
            settings.rpcUrl,
            settings.jitoProxyless || false
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
      await handleRefreshBalances();
      
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
      
      // Execute the return operation - passing the funder private key to use as fee payer
      const txResults = await returnFundsToFunder(
        targetWallets,
        funderWallet.publicKey,
        settings.rpcUrl,
        funderWallet.privateKey // Pass the funder private key to use as fee payer
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
      await handleRefreshBalances();
      
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
    
    // Wallet Warning Dialog Component
    const WalletWarningDialog = () => (
      <Dialog open={showWalletWarningDialog} onOpenChange={setShowWalletWarningDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Warning: Same Wallet Detected</DialogTitle>
            <DialogDescription className="py-4">
              You're trying to use the same wallet as developer and/or funder.<br/>This is not recommended.
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 rounded-md border border-red-600 dark:border-red-600 text-red-600 dark:text-white">
                <strong>Best practice:</strong> Use separate wallets for developer and funder.
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowWalletWarningDialog(false);
              setPendingWalletImport(null);
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmSameWalletImport}
            >
              Use Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
   
    return (
      <ProtectedRoute>
        <div className="p-6 max-w-[1200px] mx-auto space-y-6">
          {/* Header Section */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">MAIN WALLETS</h1>
              <div className="flex items-center gap-3">
                {isRefetchingData && (
                  <div className="flex items-center gap-3">
                </div>
                )}
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
                      disabled={!developerWallet || !isPremium}
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
                        {developerWallet ? developerWallet.publicKey : "No wallet imported"}
                      </div>
                      {developerWallet && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleCopy(developerWallet.publicKey, "developer")}
                        >
                          {copySuccess === "developer" ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Balance</label>
                    {developerWallet ? (
                      <BalanceDisplay amount={developerWallet.balance} />
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
                      disabled={!funderWallet || !isPremium}
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
                        {funderWallet ? funderWallet.publicKey : "No wallet imported"}
                      </div>
                      {funderWallet && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleCopy(funderWallet.publicKey, "funder")}
                        >
                          {copySuccess === "funder" ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Balance</label>
                    {funderWallet ? (
                      <BalanceDisplay amount={funderWallet.balance} />
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
              disabled={!funderWallet || generatedWallets.length === 0 || isDistributing}
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
              disabled={!funderWallet || walletsWithBalance === 0 || isUpgrading}
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
              disabled={!funderWallet || generatedWallets.length === 0 || isReturning}
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
            <h2 className="text-xl font-semibold">GENERATED WALLETS ({generatedWallets.length}/100)</h2>
            {isInitialLoading ? (
              <div className="flex justify-center items-center p-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-4">
                {generatedWallets.length === 0 ? (
                  <div className="text-center p-6 text-muted-foreground">
                    No wallets generated yet. Click "GENERATE" to create new wallets.
                  </div>
                ) : (
                  generatedWallets.map((wallet, index) => (
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
            isLoading={isClearingWallets}
          />
          
          <DistributeFundsDialog
            open={showDistributeDialog}
            onOpenChange={setShowDistributeDialog}
            onDistribute={handleDistributeFunds}
            maxWallets={generatedWallets.length}
            funderBalance={funderWallet ? parseFloat(funderWallet.balance || "0") : 0}
            isPremium={isPremium}
          />
          
          <UpgradeWalletsDialog
            open={showUpgradeDialog}
            onOpenChange={setShowUpgradeDialog}
            onUpgrade={handleUpgradeWallets}
            maxWallets={generatedWallets.length}
            isPremium={isPremium}
            wallets={generatedWallets}
          />
          
          <ReturnFundsDialog
            open={showReturnDialog}
            onOpenChange={setShowReturnDialog}
            onReturn={handleReturnFunds}
            maxWallets={generatedWallets.length}
            hasTooBigBalances={hasWalletsWithLargeBalances}
            isPremium={isPremium}
          />
  
          {/* Same Wallet Warning Dialog */}
          <WalletWarningDialog />
        </div>
      </ProtectedRoute>
    );
  }