// hooks/use-cached-balances.ts
import { useState, useEffect, useCallback } from 'react';
import { refreshWalletBalances, WalletInfo } from '@/utils/wallet-utils';

// Global cache to persist between component unmounts
type BalanceCache = {
  wallets: Record<string, { balance: string; timestamp: number }>;
  mainWallets: Record<string, { balance: string; timestamp: number }>;
};

// Initialize global cache
const globalCache: BalanceCache = {
  wallets: {},
  mainWallets: {}
};

export function useCachedBalances(
  generatedWallets: WalletInfo[] = [], 
  developerWallet: { publicKey: string; privateKey: string; balance: string | null } | null = null,
  funderWallet: { publicKey: string; privateKey: string; balance: string | null } | null = null,
  rpcUrl: string | null = null
) {
  const [wallets, setWallets] = useState<WalletInfo[]>(generatedWallets);
  const [devWallet, setDevWallet] = useState(developerWallet);
  const [fundWallet, setFundWallet] = useState(funderWallet);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Apply cached data on initial load
  useEffect(() => {
    // Apply cached balances to wallets
    if (generatedWallets && generatedWallets.length > 0) {
      const updatedWallets = generatedWallets.map(wallet => {
        const cached = globalCache.wallets[wallet.publicKey];
        if (cached) {
          return { ...wallet, balance: cached.balance };
        }
        return wallet;
      });
      setWallets(updatedWallets);
    } else {
      setWallets(generatedWallets);
    }
    
    // Apply cached developer wallet data
    if (developerWallet && globalCache.mainWallets[developerWallet.publicKey]) {
      setDevWallet({
        ...developerWallet,
        balance: globalCache.mainWallets[developerWallet.publicKey].balance
      });
    } else {
      setDevWallet(developerWallet);
    }
    
    // Apply cached funder wallet data
    if (funderWallet && globalCache.mainWallets[funderWallet.publicKey]) {
      setFundWallet({
        ...funderWallet,
        balance: globalCache.mainWallets[funderWallet.publicKey].balance
      });
    } else {
      setFundWallet(funderWallet);
    }
  }, [generatedWallets, developerWallet, funderWallet]);

  // ONLY refresh balances when explicitly called
  const refreshBalances = useCallback(async () => {
    if (!rpcUrl) return;
    
    setIsRefreshing(true);
    
    try {
      // Refresh generated wallets
      if (generatedWallets.length > 0) {
        const updatedWallets = await refreshWalletBalances(generatedWallets, rpcUrl);
        
        // Update cache
        updatedWallets.forEach(wallet => {
          if (wallet.balance) {
            globalCache.wallets[wallet.publicKey] = {
              balance: wallet.balance,
              timestamp: Date.now()
            };
          }
        });
        
        setWallets(updatedWallets);
      }
      
      // Refresh developer wallet
      if (developerWallet) {
        const devWalletInfo = { 
          publicKey: developerWallet.publicKey, 
          privateKey: developerWallet.privateKey,
          balance: null
        };
        
        const [updatedDeveloper] = await refreshWalletBalances([devWalletInfo], rpcUrl);
        
        if (updatedDeveloper.balance) {
          globalCache.mainWallets[developerWallet.publicKey] = {
            balance: updatedDeveloper.balance,
            timestamp: Date.now()
          };
          
          setDevWallet({
            ...developerWallet,
            balance: updatedDeveloper.balance
          });
        }
      }
      
      // Refresh funder wallet
      if (funderWallet) {
        const funderWalletInfo = { 
          publicKey: funderWallet.publicKey, 
          privateKey: funderWallet.privateKey,
          balance: null
        };
        
        const [updatedFunder] = await refreshWalletBalances([funderWalletInfo], rpcUrl);
        
        if (updatedFunder.balance) {
          globalCache.mainWallets[funderWallet.publicKey] = {
            balance: updatedFunder.balance,
            timestamp: Date.now()
          };
          
          setFundWallet({
            ...funderWallet,
            balance: updatedFunder.balance
          });
        }
      }
    } catch (error) {
      console.error("Error refreshing balances:", error);
    } finally {
      setIsRefreshing(false);
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