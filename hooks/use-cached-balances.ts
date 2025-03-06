// hooks/use-cached-balances.ts
import { useState, useEffect, useCallback } from 'react';
import { refreshWalletBalances, WalletInfo } from '@/utils/wallet-utils';
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
  rpcUrl: string | null = null
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
      // Refresh generated wallets
      if (generatedWallets.length > 0) {
        console.log(`Refreshing ${generatedWallets.length} generated wallets...`);
        const refreshedWallets = await refreshWalletBalances(generatedWallets, rpcUrl);
        setWallets(refreshedWallets);
      }
      
      // Refresh developer wallet
      if (developerWallet?.publicKey) {
        console.log(`Refreshing developer wallet: ${developerWallet.publicKey.substring(0, 8)}...`);
        try {
          const balance = await fetchDirectBalance(developerWallet.publicKey, rpcUrl);
          console.log(`Developer wallet balance: ${balance} SOL`);
          setDevWallet({...developerWallet, balance});
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
          const balance = await fetchDirectBalance(funderWallet.publicKey, rpcUrl);
          console.log(`Funder wallet balance: ${balance} SOL`);
          setFundWallet({...funderWallet, balance});
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
  }, [rpcUrl, generatedWallets, developerWallet, funderWallet]);

  return {
    wallets,
    developerWallet: devWallet,
    funderWallet: fundWallet,
    isRefreshing,
    refreshBalances
  };
}