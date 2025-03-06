// hooks/use-cached-balances.ts
import { useState } from 'react';
import { 
  refreshWalletBalances, 
  WalletInfo, 
  saveWalletsToSupabase,
  saveMainWalletToSupabase,
} from '@/utils/wallet-utils';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Define main wallet type
type MainWallet = {
  publicKey: string;
  privateKey: string;
  balance: string | null;
};

export function useCachedBalances(
  generatedWallets: WalletInfo[] = [], 
  developerWallet: MainWallet | null = null,
  funderWallet: MainWallet | null = null,
  rpcUrl: string | null = null,
  user: any = null,
  supabaseClient: any = null
) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Get wallet balance from network
  const fetchWalletBalance = async (publicKey: string): Promise<string> => {
    if (!rpcUrl) return "0.000000000";
    
    try {
      const connection = new Connection(rpcUrl, 'confirmed');
      const pubKey = new PublicKey(publicKey);
      const balance = await connection.getBalance(pubKey);
      return (balance / LAMPORTS_PER_SOL).toFixed(9);
    } catch (error) {
      console.error(`Error fetching balance for ${publicKey}:`, error);
      return "0.000000000";
    }
  };

  // Refresh all wallets at once
  const refreshBalances = async (): Promise<{
    updatedGeneratedWallets: WalletInfo[],
    updatedDevWallet: MainWallet | null,
    updatedFundWallet: MainWallet | null
  }> => {
    if (!rpcUrl || isRefreshing) {
      return { 
        updatedGeneratedWallets: [...generatedWallets], 
        updatedDevWallet: developerWallet, 
        updatedFundWallet: funderWallet 
      };
    }
    
    setIsRefreshing(true);
    console.log("Starting wallet balance refresh...");

    try {
      // 1. Refresh generated wallets
      let updatedGeneratedWallets: WalletInfo[] = [...generatedWallets];
      
      if (generatedWallets.length > 0) {
        console.log(`Refreshing ${generatedWallets.length} generated wallets...`);
        updatedGeneratedWallets = await refreshWalletBalances(generatedWallets, rpcUrl);
        
        // Save to Supabase
        if (user?.id && supabaseClient) {
          await saveWalletsToSupabase(user.id, updatedGeneratedWallets, supabaseClient);
        }
      }
      
      // 2. Refresh developer wallet
      let updatedDevWallet = developerWallet;
      if (developerWallet?.publicKey) {
        console.log(`Refreshing developer wallet: ${developerWallet.publicKey.slice(0, 8)}...`);
        const balance = await fetchWalletBalance(developerWallet.publicKey);
        updatedDevWallet = { ...developerWallet, balance };
        
        // Save to Supabase
        if (user?.id && supabaseClient) {
          await saveMainWalletToSupabase(user.id, 'developer', updatedDevWallet, supabaseClient);
        }
      }
      
      // 3. Refresh funder wallet
      let updatedFundWallet = funderWallet;
      if (funderWallet?.publicKey) {
        console.log(`Refreshing funder wallet: ${funderWallet.publicKey.slice(0, 8)}...`);
        const balance = await fetchWalletBalance(funderWallet.publicKey);
        updatedFundWallet = { ...funderWallet, balance };
        
        // Save to Supabase
        if (user?.id && supabaseClient) {
          await saveMainWalletToSupabase(user.id, 'funder', updatedFundWallet, supabaseClient);
        }
      }
      
      console.log("Wallet refresh completed successfully");
      return { updatedGeneratedWallets, updatedDevWallet, updatedFundWallet };
    } catch (error) {
      console.error("Failed to refresh balances:", error);
      return { 
        updatedGeneratedWallets: [...generatedWallets], 
        updatedDevWallet: developerWallet, 
        updatedFundWallet: funderWallet 
      };
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    isRefreshing,
    refreshBalances
  };
}