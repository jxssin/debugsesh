// hooks/use-cached-balances.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  refreshWalletBalances, 
  WalletInfo, 
  saveWalletsToSupabase, 
  saveMainWalletToSupabase,
  getWalletBalance
} from '@/utils/wallet-utils';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Define main wallet type to improve type safety
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
  const [wallets, setWallets] = useState<WalletInfo[]>(generatedWallets);
  const [devWallet, setDevWallet] = useState<MainWallet | null>(developerWallet);
  const [fundWallet, setFundWallet] = useState<MainWallet | null>(funderWallet);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update internal state when external props change
  useEffect(() => {
    setWallets(generatedWallets);
    setDevWallet(developerWallet);
    setFundWallet(funderWallet);
  }, [generatedWallets, developerWallet, funderWallet]);

  // Direct balance fetch for any wallet
  const fetchDirectBalance = async (publicKey: string, rpcUrl: string): Promise<string> => {
    try {
      const connection = new Connection(rpcUrl, 'confirmed');
      const pubKey = new PublicKey(publicKey);
      const balance = await connection.getBalance(pubKey);
      return (balance / LAMPORTS_PER_SOL).toFixed(9);
    } catch (error) {
      console.error(`Error fetching balance for ${publicKey}:`, error);
      throw error;
    }
  };

  // Function to refresh and save a batch of wallets
  const refreshAndSaveWalletsBatch = async (
    walletsToRefresh: WalletInfo[],
    rpcUrl: string,
    userId?: string
  ): Promise<WalletInfo[]> => {  // Fixed: Added => arrow function syntax
    // First refresh the balances
    const refreshedWallets = await refreshWalletBalances(walletsToRefresh, rpcUrl);
    
    // Then save to Supabase if we have a user ID and supabase client
    if (userId && supabaseClient && refreshedWallets.length > 0) {
      console.log(`Saving ${refreshedWallets.length} refreshed wallets to Supabase`);
      await saveWalletsToSupabase(userId, refreshedWallets, supabaseClient);
    }
    
    return refreshedWallets;
  };

  // Function to refresh and save a single main wallet
  const refreshAndSaveMainWallet = async (
    wallet: MainWallet | null,
    walletType: 'developer' | 'funder',
    rpcUrl: string,
    userId?: string
  ): Promise<MainWallet | null> => {  // Fixed: Added => arrow function syntax
    if (!wallet || !wallet.publicKey || !rpcUrl) return wallet;
    
    try {
      // Fetch the fresh balance
      const balance = await fetchDirectBalance(wallet.publicKey, rpcUrl);
      
      // Create updated wallet object
      const updatedWallet = {
        ...wallet,
        balance
      };
      
      // Save to Supabase if we have a user ID and supabase client
      if (userId && supabaseClient) {
        console.log(`Saving ${walletType} wallet to Supabase: ${wallet.publicKey.substring(0, 8)} with balance ${balance}`);
        await saveMainWalletToSupabase(userId, walletType, updatedWallet, supabaseClient);
      }
      
      return updatedWallet;
    } catch (error) {
      console.error(`Error refreshing ${walletType} wallet:`, error);
      return wallet;
    }
  };

  // Refresh all wallets
  const refreshBalances = useCallback(async () => {
    if (!rpcUrl) return;
    
    console.log("Starting wallet balance refresh...");
    setIsRefreshing(true);
    
    // Mark all wallets as loading
    setWallets(prev => prev.map(w => ({...w, balance: null})));
    if (devWallet) setDevWallet({...devWallet, balance: null});
    if (fundWallet) setFundWallet({...fundWallet, balance: null});
    
    try {
      // Refresh generated wallets and save to Supabase in one operation
      if (generatedWallets.length > 0) {
        console.log(`Refreshing ${generatedWallets.length} generated wallets...`);
        const userId = user?.id;
        const refreshedWallets = await refreshAndSaveWalletsBatch(
          generatedWallets, 
          rpcUrl,
          userId
        );
        setWallets(refreshedWallets);
      }
      
      // Refresh developer wallet
      if (developerWallet?.publicKey) {
        console.log(`Refreshing developer wallet: ${developerWallet.publicKey.substring(0, 8)}...`);
        try {
          const userId = user?.id;
          const updatedDevWallet = await refreshAndSaveMainWallet(
            developerWallet,
            'developer',
            rpcUrl,
            userId
          );
          setDevWallet(updatedDevWallet);
        } catch (error) {
          console.error("Failed to refresh developer wallet:", error);
          // Restore the previous wallet but with null balance
          setDevWallet(developerWallet);
        }
      }
      
      // Refresh funder wallet
      if (funderWallet?.publicKey) {
        console.log(`Refreshing funder wallet: ${funderWallet.publicKey.substring(0, 8)}...`);
        try {
          const userId = user?.id;
          const updatedFundWallet = await refreshAndSaveMainWallet(
            funderWallet,
            'funder',
            rpcUrl,
            userId
          );
          setFundWallet(updatedFundWallet);
        } catch (error) {
          console.error("Failed to refresh funder wallet:", error);
          // Restore the previous wallet but with null balance
          setFundWallet(funderWallet);
        }
      }
    } catch (error) {
      console.error("Failed to refresh balances:", error);
    } finally {
      setIsRefreshing(false);
      console.log("Wallet refresh complete");
    }
  }, [rpcUrl, generatedWallets, developerWallet, funderWallet, user, supabaseClient]);

  return {
    wallets,
    developerWallet: devWallet,
    funderWallet: fundWallet,
    isRefreshing,
    refreshBalances
  };
}