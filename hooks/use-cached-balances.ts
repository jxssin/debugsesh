// hooks/use-cached-balances.ts
// IMPORTANT: Completely rewritten to always fetch fresh balances from blockchain
// and never use caching - directly from blockchain to Supabase

import { useState } from 'react';
import { 
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
  
  // Get wallet balance from network - always fresh, no caching
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

  // Direct blockchain balance fetch for generated wallets
  // Never use cached data - always fresh from blockchain
  const refreshGeneratedWallets = async (wallets: WalletInfo[]): Promise<WalletInfo[]> => {
    if (!rpcUrl) return [...wallets];
    
    const connection = new Connection(rpcUrl, 'confirmed');
    const updatedWallets = [...wallets];
    
    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < updatedWallets.length; i += batchSize) {
      const batch = updatedWallets.slice(i, i + batchSize);
      const requests = batch.map(wallet => 
        connection.getBalance(new PublicKey(wallet.publicKey))
          .then(balance => ({ publicKey: wallet.publicKey, balance }))
          .catch(error => {
            console.error(`Error fetching balance for ${wallet.publicKey}:`, error);
            return { publicKey: wallet.publicKey, balance: 0 };
          })
      );
      
      const results = await Promise.all(requests);
      
      results.forEach(result => {
        const walletIndex = updatedWallets.findIndex(w => w.publicKey === result.publicKey);
        if (walletIndex >= 0) {
          updatedWallets[walletIndex].balance = (result.balance / LAMPORTS_PER_SOL).toFixed(9);
        }
      });
      
      // Add a small delay between batches
      if (i + batchSize < updatedWallets.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return updatedWallets;
  };
  
  // Refresh all wallets directly from blockchain, no caching
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

    try {
      // 1. Refresh generated wallets - direct from blockchain
      let updatedGeneratedWallets: WalletInfo[] = [...generatedWallets];
      
      if (generatedWallets.length > 0) {
        // Always get fresh balances directly from blockchain using our custom function
        updatedGeneratedWallets = await refreshGeneratedWallets(generatedWallets);
        
        // Save to Supabase immediately
        if (user?.id && supabaseClient) {
          await saveWalletsToSupabase(user.id, updatedGeneratedWallets, supabaseClient);
        }
      }
      
      // 2. Refresh developer wallet - always fresh
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
      
      // 3. Refresh funder wallet - always fresh
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