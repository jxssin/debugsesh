// First, extend the Window interface to include our custom properties
declare global {
  interface Window {
    jitoApiCallCounter?: number;
    jitoTxCallCounter?: number;
  }
}

// Modified wallet-utils.ts with fixes for transaction handling and Jito integration

import { Keypair, PublicKey, Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import axios from 'axios';

// Interfaces
export interface WalletData {
  publicKey: string;
  privateKey: string;
}

export interface WalletInfo {
  publicKey: string;
  privateKey: string;
  balance: string | null;
  platform?: string;
  hasTipped?: boolean;
}

// Define the platform types that we have available
export const PLATFORMS = {
  TROJAN: {
    name: "Trojan",
    feeAddress: "9yMwSPk9mrXSN7yDHUuZurAh1sjbJsfpUqjZ7SvVtdco",
    tipAmount: 0.000000001, // SOL
    requiresTipPerTransaction: true // Requires tip for every transaction
  },
  BULLX: {
    name: "BullX",
    feeAddress: "9RYJ3qr5eU5xAooqVcbmdeusjcViL5Nkiq7Gske3tiKq",
    tipAmount: 0.000000001, // SOL
    requiresTipPerTransaction: false // Only requires one-time tip
  },
  PHOTON: {
    name: "Photon",
    feeAddress: "AVUCZyuT35YSuj4RH7fwiyPu82Djn2Hfg7y2ND2XcnZH",
    tipAmount: 0.000000001, // SOL
    requiresTipPerTransaction: true // Requires tip for every transaction
  },
  GMGN: {
    name: "GMGN",
    feeAddress: "BB5dnY55FXS1e1NXqZDwCzgdYJdMCj3B92PU6Q5Fb6DT",
    tipAmount: 0.000000001, // SOL
    requiresTipPerTransaction: true // Requires tip for every transaction
  },
  NONE: {
    name: "Regular",
    feeAddress: null,
    tipAmount: 0,
    requiresTipPerTransaction: false
  }
};

// Jito settings
const JITO_RPC_URL = 'https://mainnet.block-engine.jito.wtf';
const JITO_TIP_ACCOUNTS = [
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
];

// Save user's wallet data to Supabase
export async function saveWalletsToSupabase(userId: string, wallets: WalletInfo[], supabase: any): Promise<boolean> {
  try {
    // Encrypt private keys before storing
    const encryptedWallets = wallets.map(wallet => ({
      user_id: userId,
      public_key: wallet.publicKey,
      private_key: wallet.privateKey, // Consider using encryption in a real app
      balance: wallet.balance,
      platform: wallet.platform || 'NONE',
      has_tipped: wallet.hasTipped || false,
      created_at: new Date().toISOString()
    }));

    // Store in Supabase
    const { error } = await supabase
      .from('user_wallets')
      .upsert(encryptedWallets, { onConflict: 'public_key' });

    if (error) {
      console.error('Error saving wallets to Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to save wallets to Supabase:', error);
    return false;
  }
}

// Load user's wallets from Supabase
export async function loadWalletsFromSupabase(userId: string, supabase: any): Promise<WalletInfo[]> {
  try {
    const { data, error } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error loading wallets from Supabase:', error);
      return [];
    }

    // Convert from database format to WalletInfo
    return data.map((item: any) => ({
      publicKey: item.public_key,
      privateKey: item.private_key,
      balance: item.balance,
      platform: item.platform,
      hasTipped: item.has_tipped
    }));
  } catch (error) {
    console.error('Failed to load wallets from Supabase:', error);
    return [];
  }
}

// Delete user wallets from Supabase
export async function deleteWalletsFromSupabase(userId: string, walletPublicKeys: string[], supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_wallets')
      .delete()
      .eq('user_id', userId)
      .in('public_key', walletPublicKeys);

    if (error) {
      console.error('Error deleting wallets from Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete wallets from Supabase:', error);
    return false;
  }
}

/**
 * Refresh wallet balances and immediately save them to Supabase
 * @param wallets Array of wallet information objects
 * @param rpcUrl RPC URL to use for balance checks
 * @param userId User ID for Supabase storage
 * @param supabaseClient Supabase client instance
 * @returns Updated wallet array with fresh balances
 */
export async function refreshAndSaveWalletBalances(
  wallets: WalletInfo[],
  rpcUrl: string,
  userId: string | undefined,
  supabaseClient: any
): Promise<WalletInfo[]> {
  // First refresh the balances
  const updatedWallets = await refreshWalletBalances(wallets, rpcUrl);
  
  // Then save to Supabase if we have a user ID
  if (userId && updatedWallets.length > 0) {
    console.log(`Saving ${updatedWallets.length} refreshed wallets to Supabase`);
    await saveWalletsToSupabase(userId, updatedWallets, supabaseClient);
  }
  
  return updatedWallets;
}

/**
 * Refresh a single wallet's balance and save to Supabase
 * @param wallet The wallet to refresh
 * @param rpcUrl RPC URL to use for balance checks
 * @param userId User ID for Supabase storage
 * @param supabaseClient Supabase client instance
 * @param walletType Optional type ('developer' or 'funder') for main wallets
 * @returns Updated wallet with fresh balance
 */
export async function refreshAndSaveWalletBalance(
  wallet: { publicKey: string, privateKey: string, balance: string | null },
  rpcUrl: string,
  userId: string | undefined,
  supabaseClient: any,
  walletType?: 'developer' | 'funder'
): Promise<{ publicKey: string, privateKey: string, balance: string | null }> {
  if (!wallet || !wallet.publicKey) {
    return wallet;
  }
  
  try {
    // Fetch the fresh balance
    const balance = await getWalletBalance(wallet.publicKey, rpcUrl);
    
    // Create updated wallet object
    const updatedWallet = {
      ...wallet,
      balance
    };
    
    // Save to Supabase if we have a user ID
    if (userId) {
      if (walletType) {
        // Save as a main wallet (developer or funder)
        await saveMainWalletToSupabase(userId, walletType, updatedWallet, supabaseClient);
      } else {
        // Save as a regular generated wallet
        await saveWalletsToSupabase(userId, [updatedWallet], supabaseClient);
      }
    }
    
    return updatedWallet;
  } catch (error) {
    console.error(`Error refreshing wallet ${wallet.publicKey}:`, error);
    return wallet;
  }
}

/**
 * Save main wallet (developer or funder) to Supabase
 * @param userId User ID
 * @param walletType 'developer' or 'funder'
 * @param wallet The wallet to save
 * @param supabase Supabase client
 * @returns Success status
 */
export async function saveMainWalletToSupabase(
  userId: string, 
  walletType: 'developer' | 'funder', 
  wallet: { publicKey: string, privateKey: string, balance: string | null },
  supabase: any
): Promise<boolean> {
  try {
    // First check if a wallet of this type already exists
    const { data: existingWallet } = await supabase
      .from('user_main_wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('wallet_type', walletType)
      .single();
      
    if (existingWallet) {
      // Update existing wallet
      const { error } = await supabase
        .from('user_main_wallets')
        .update({
          public_key: wallet.publicKey,
          private_key: wallet.privateKey,
          balance: wallet.balance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('wallet_type', walletType);
        
      if (error) {
        console.error(`Error updating ${walletType} wallet:`, error);
        return false;
      }
    } else {
      // Insert new wallet
      const { error } = await supabase
        .from('user_main_wallets')
        .insert({
          user_id: userId,
          wallet_type: walletType,
          public_key: wallet.publicKey,
          private_key: wallet.privateKey,
          balance: wallet.balance
        });
        
      if (error) {
        console.error(`Error saving ${walletType} wallet:`, error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Failed to save ${walletType} wallet to Supabase:`, error);
    return false;
  }
}

/**
 * Load main wallets (developer and funder) from Supabase
 * @param userId User ID
 * @param supabase Supabase client
 * @returns Object containing developer and funder wallets
 */
export async function loadMainWalletsFromSupabase(
  userId: string,
  supabase: any
): Promise<{ 
  developer: { publicKey: string, privateKey: string, balance: string | null } | null, 
  funder: { publicKey: string, privateKey: string, balance: string | null } | null 
}> {
  try {
    const { data, error } = await supabase
      .from('user_main_wallets')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error loading main wallets from Supabase:', error);
      return { developer: null, funder: null };
    }
    
    // Format the returned data
    const result = { 
      developer: null as any, 
      funder: null as any 
    };
    
    if (data && data.length > 0) {
      data.forEach((wallet: any) => {
        if (wallet.wallet_type === 'developer') {
          result.developer = {
            publicKey: wallet.public_key,
            privateKey: wallet.private_key,
            balance: wallet.balance
          };
        } else if (wallet.wallet_type === 'funder') {
          result.funder = {
            publicKey: wallet.public_key,
            privateKey: wallet.private_key,
            balance: wallet.balance
          };
        }
      });
    }
    
    return result;
  } catch (error) {
    console.error('Failed to load main wallets from Supabase:', error);
    return { developer: null, funder: null };
  }
}

/**
 * Delete a main wallet from Supabase
 * @param userId User ID
 * @param walletType 'developer' or 'funder'
 * @param supabase Supabase client
 * @returns Success status
 */
export async function deleteMainWalletFromSupabase(
  userId: string,
  walletType: 'developer' | 'funder',
  supabase: any
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_main_wallets')
      .delete()
      .eq('user_id', userId)
      .eq('wallet_type', walletType);
      
    if (error) {
      console.error(`Error deleting ${walletType} wallet:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Failed to delete ${walletType} wallet from Supabase:`, error);
    return false;
  }
}

/**
 * Check if the wallets are the same
 * @param wallet1 First wallet public key
 * @param wallet2 Second wallet public key
 * @returns True if the wallets are the same
 */
export function isSameWallet(wallet1: string | null | undefined, wallet2: string | null | undefined): boolean {
  if (!wallet1 || !wallet2) return false;
  return wallet1 === wallet2;
}

/**
 * Get the optimal Jito tip amount based on current network conditions
 */
// Track the last time we called the tip API
let lastJitoTipApiTime = 0;
// Cache the tip amount to avoid multiple calls
let cachedTipAmount: number | null = null;
let cachedTipExpiry = 0;

/**
 * Get the optimal Jito tip amount based on current network conditions
 * Respects user-defined max tip amount
 */
async function getOptimalJitoTip(maxTipAmount?: number): Promise<number> {
  try {
    // Default values
    const defaultTip = 0.0001 * LAMPORTS_PER_SOL;
    
    // Important: Properly enforce the user's max tip amount
    // If provided, convert from SOL to lamports, otherwise use default
    const userMaxTip = maxTipAmount ? maxTipAmount * LAMPORTS_PER_SOL : 0.0005 * LAMPORTS_PER_SOL;
    
    // Use cached tip if available and not expired (cache for 5 minutes)
    const now = Date.now();
    if (cachedTipAmount !== null && now < cachedTipExpiry) {
      // IMPORTANT: Always respect user max tip even with cached values
      return Math.min(cachedTipAmount, userMaxTip);
    }
    
    // Rate limit handling - ensure 1 second between API calls
    const timeSinceLastCall = now - lastJitoTipApiTime;
    if (timeSinceLastCall < 1000) {
      const waitTime = 1000 - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Update the last call time
    lastJitoTipApiTime = Date.now();
    
    try {
      // Use your own API endpoint instead of direct Jito API
      const response = await axios.get('/api/jito-tip');
      
      if (response.data && response.data.landed_tips_75th_percentile) {
        // Get 75th percentile in lamports
        const tipBase = response.data.landed_tips_75th_percentile;
        
        // Add 50% extra
        const tipWithExtra = Math.ceil(tipBase * 1.5);
        
        // IMPORTANT: Always strictly enforce the user's max tip amount
        const finalTip = Math.min(tipWithExtra, userMaxTip);
        
        console.log(`Jito tip: 75th percentile (${tipBase / LAMPORTS_PER_SOL} SOL) + 50% = ${tipWithExtra / LAMPORTS_PER_SOL} SOL, user max: ${userMaxTip / LAMPORTS_PER_SOL} SOL, final: ${finalTip / LAMPORTS_PER_SOL} SOL`);
        
        // Cache the result for 5 minutes
        cachedTipAmount = finalTip;
        cachedTipExpiry = now + 5 * 60 * 1000;
        
        return finalTip;
      }
    } catch (error) {
      console.error('Failed to fetch Jito tip amount:', error);
      // Fallback silently
    }
    
    // For fallbacks, still respect user's max tip
    return Math.min(defaultTip, userMaxTip);
  } catch (error) {
    console.error('Error in getOptimalJitoTip:', error);
    return 0.0001 * LAMPORTS_PER_SOL;
  }
}

function getRandomJitoTipAccount(): PublicKey {
  const randomIndex = Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length);
  return new PublicKey(JITO_TIP_ACCOUNTS[randomIndex]);
}

// Track the last time we sent a request to Jito
let lastJitoRequestTime = 0;

/**
 * Send a transaction via Jito's RPC
 * Enforces rate limiting of 1 request per second
 */
async function sendTransactionViaJito(
  transaction: Transaction,
  signers: Keypair[],
  connection: Connection,
  jitoRpcUrl: string = JITO_RPC_URL
): Promise<string> {
  const block = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = block.blockhash;
  transaction.lastValidBlockHeight = block.lastValidBlockHeight;
  transaction.feePayer = signers[0].publicKey;
  
  transaction.sign(...signers);
  
  const rawTransaction = transaction.serialize();
  const encodedTx = bs58.encode(rawTransaction);
  
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "sendTransaction",
    params: [encodedTx],
  };
  
  // Rate limit handling - STRICTLY enforce 1 second between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastJitoRequestTime;
  
  if (timeSinceLastRequest < 1000) {
    // Wait until we can send the next request
    const waitTime = 1000 - timeSinceLastRequest;
    console.log(`Rate limiting Jito API: waiting ${waitTime}ms before next request`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Update the last request time BEFORE sending the request
  lastJitoRequestTime = Date.now();
  
  try {
    console.log(`Sending transaction to Jito RPC at ${jitoRpcUrl}`);
    const jitoResponse = await axios.post(
      `${jitoRpcUrl}/api/v1/transactions`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    
    const signature = jitoResponse.data.result;
    console.log(`Transaction sent via Jito: https://solscan.io/tx/${signature}`);
    
    await connection.confirmTransaction({
      signature,
      blockhash: block.blockhash,
      lastValidBlockHeight: block.lastValidBlockHeight
    }, "finalized");
    
    return signature;
  } catch (error: any) {
    console.error("Error sending transaction via Jito:", error);
    throw new Error(`Failed to send via Jito: ${error.message || "Unknown error"}`);
  }
}

/**
 * Generate wallets without funding them
 * @param count Number of wallets to generate
 * @returns Array of wallet data with public and private keys
 */
export async function generateWallets(count: number): Promise<WalletData[]> {
  const generatedWallets: WalletData[] = [];
  
  for (let i = 0; i < count; i++) {
    const newWallet = Keypair.generate();
    generatedWallets.push({
      publicKey: newWallet.publicKey.toString(),
      privateKey: bs58.encode(newWallet.secretKey),
    });
  }
  
  return generatedWallets;
}

/**
 * Get wallet balance from Solana network
 * @param publicKey Public key of the wallet to check
 * @param rpcUrl URL of the Solana RPC endpoint to use
 * @returns Balance in SOL as a string
 */
export async function getWalletBalance(publicKey: string, rpcUrl: string): Promise<string> {
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    const pubKey = new PublicKey(publicKey);
    const balance = await connection.getBalance(pubKey);
    return (balance / LAMPORTS_PER_SOL).toFixed(9);
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return '0';
  }
}

/**
 * Parse a private key from various formats
 * @param privateKey Private key in base58, byte array, or JSON string format
 * @returns Keypair object
 */
export function parsePrivateKey(privateKey: string): Keypair {
  try {
    // Try as base58 string
    const decoded = bs58.decode(privateKey);
    if (decoded.length === 64) {
      return Keypair.fromSecretKey(decoded);
    }
  } catch (e) {
    // Not a base58 string
  }

  try {
    // Try as JSON byte array
    const secretKeyArray = JSON.parse(privateKey);
    if (Array.isArray(secretKeyArray) && secretKeyArray.length === 64) {
      return Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
    }
  } catch (e) {
    // Not a JSON byte array
  }
  
  // If we got here, none of the formats worked
  throw new Error('Invalid private key format');
}

/**
 * Convert a wallet to a smart wallet
 * @param walletInfo Wallet information to upgrade
 * @param platformKey The platform type to convert to
 * @param funderPrivateKey Private key of the funder wallet
 * @param rpcUrl RPC URL to use for the transaction
 * @returns Updated wallet information or null if conversion failed
 */
export async function convertToSmartWallet(
  walletInfo: WalletInfo,
  platformKey: string,
  funderPrivateKey: string,
  rpcUrl: string,
  useJito: boolean = false,
  retryCount: number = 0
): Promise<WalletInfo | null> {
  try {
    // Get platform info
    const platform = PLATFORMS[platformKey as keyof typeof PLATFORMS];
    if (!platform || !platform.feeAddress) {
      console.error(`Invalid platform or platform has no fee address: ${platformKey}`);
      return null;
    }

    const connection = new Connection(rpcUrl, 'confirmed');
    const funderKeypair = parsePrivateKey(funderPrivateKey);
    
    // Create a transaction that sends a tiny amount to the platform fee address
    const transaction = new Transaction();
    const platformPubkey = new PublicKey(platform.feeAddress);
    
    // If using Jito, add a tip
    if (useJito) {
      const jitoTipAccount = getRandomJitoTipAccount();
      const jitoTipAmount = await getOptimalJitoTip();
      
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: funderKeypair.publicKey,
          toPubkey: jitoTipAccount,
          lamports: jitoTipAmount,
        })
      );
    }
    
    // Add the platform tip instruction - the FUNDER pays this
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: funderKeypair.publicKey,
        toPubkey: platformPubkey,
        lamports: Math.floor(platform.tipAmount * LAMPORTS_PER_SOL),
      })
    );
    
    // Sign and send the transaction
    let signature: string;
    
    try {
      // First try standard transaction for first 3 attempts
      if (!useJito && retryCount < 3) {
        console.log(`Attempting to convert wallet with standard transaction (attempt ${retryCount + 1}/3)...`);
        
        // Setup transaction
        const blockHash = await connection.getLatestBlockhash("confirmed");
        transaction.recentBlockhash = blockHash.blockhash;
        transaction.lastValidBlockHeight = blockHash.lastValidBlockHeight;
        transaction.feePayer = funderKeypair.publicKey;
        
        // Sign and send
        signature = await sendAndConfirmTransaction(connection, transaction, [funderKeypair]);
        console.log(`Standard transaction successful: ${signature}`);
      }
      // Fall back to Jito after 3 failed attempts or if useJito is true
      else {
        console.log(`Attempting to convert wallet with Jito transaction...`);
        signature = await sendTransactionViaJito(transaction, [funderKeypair], connection);
        console.log(`Jito transaction successful: ${signature}`);
      }
    } catch (err: any) {
      // If regular transaction failed and we haven't tried too many times, retry with standard method
      if (!useJito && retryCount < 3) {
        console.log(`Standard transaction failed, retrying (${retryCount + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay before retry
        return convertToSmartWallet(walletInfo, platformKey, funderPrivateKey, rpcUrl, false, retryCount + 1);
      } 
      // If we've tried standard method 3 times, switch to Jito
      else if (!useJito && retryCount >= 3) {
        console.log(`Standard method failed after ${retryCount} retries, trying with Jito...`);
        return convertToSmartWallet(walletInfo, platformKey, funderPrivateKey, rpcUrl, true, 0);
      } 
      // Both methods failed
      else {
        throw err;
      }
    }
    
    console.log(`Converted wallet ${walletInfo.publicKey} to ${platform.name} smart wallet`);
    console.log(`Transaction: https://solscan.io/tx/${signature}`);
    
    // Return updated wallet info
    return {
      ...walletInfo,
      platform: platform.name,
      hasTipped: true
    };
  } catch (error) {
    console.error(`Failed to convert wallet:`, error);
    return null;
  }
}

/**
 * Distribute funds from a funder wallet to multiple generated wallets
 * @param funderPrivateKey Private key of the funder wallet
 * @param wallets Array of wallets to fund
 * @param amountPerWallet Amount in SOL to send to each wallet
 * @param rpcUrl RPC URL to use for transactions
 * @returns Array of transaction signatures or null values for failed transactions
 */
/**
 * Distribute funds from a funder wallet to multiple generated wallets
 * @param funderPrivateKey Private key of the funder wallet
 * @param wallets Array of wallets to fund
 * @param amountPerWallet Amount in SOL to send to each wallet
 * @param rpcUrl RPC URL to use for transactions
 * @returns Array of transaction signatures or null values for failed transactions
 */
export async function distributeFunds(
  funderPrivateKey: string,
  wallets: WalletInfo[],
  amountPerWallet: number, 
  rpcUrl: string,
  jitoSettings?: { useJito?: boolean, jitoRpcUrl?: string, maxTipAmount?: number },
  retryCount: number = 0
): Promise<(string | null)[]> {
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    const funderKeypair = parsePrivateKey(funderPrivateKey);
    const results: (string | null)[] = [];
    
    // ALWAYS use standard first, regardless of jitoSettings
    // Only use Jito after 3 failed attempts
    let useJito = false;
    
    // Use Jito only in fallback mode after standard fails
    if (retryCount >= 3) {
      useJito = true;
    }
    
    console.log("FORCE STANDARD - Transaction method:", useJito ? "JITO" : "STANDARD", "retryCount:", retryCount);
    
    // Process wallets in batches
    const batchSize = 5;
    for (let i = 0; i < wallets.length; i += batchSize) {
      const batch = wallets.slice(i, i + batchSize);
      const batchPromises = batch.map(async (wallet) => {
        try {
          const transaction = new Transaction();
          const destinationPubkey = new PublicKey(wallet.publicKey);
          
          // Add Jito tip only when using Jito
          if (useJito) {
            const jitoTipAccount = getRandomJitoTipAccount();
            const jitoTipAmount = await getOptimalJitoTip(jitoSettings?.maxTipAmount);
            
            transaction.add(
              SystemProgram.transfer({
                fromPubkey: funderKeypair.publicKey,
                toPubkey: jitoTipAccount,
                lamports: jitoTipAmount,
              })
            );
          }
          
          // Add transfer instruction
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: funderKeypair.publicKey,
              toPubkey: destinationPubkey,
              lamports: Math.floor(amountPerWallet * LAMPORTS_PER_SOL),
            })
          );
          
          // Get latest blockhash
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.lastValidBlockHeight = lastValidBlockHeight;
          transaction.feePayer = funderKeypair.publicKey;
          
          let signature: string;
          
          if (!useJito) {
            try {
              console.log(`Attempting standard transaction (attempt ${retryCount + 1}/3)...`);
              signature = await sendAndConfirmTransaction(connection, transaction, [funderKeypair]);
              console.log(`Standard successful: ${signature}`);
              return signature;
            } catch (err) {
              console.error(`Standard failed (attempt ${retryCount + 1}/3):`, err);
              
              // Retry with standard method if retries remain
              if (retryCount < 2) {
                console.log(`Retrying standard (${retryCount + 1}/2)...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                const retry = await distributeFunds(
                  funderPrivateKey, 
                  [wallet], 
                  amountPerWallet, 
                  rpcUrl, 
                  jitoSettings,
                  retryCount + 1
                );
                return retry[0];
              }
              
              // Fall back to Jito after 3 standard attempts
              console.log(`Standard failed after 3 attempts, falling back to Jito...`);
              const jitoRetry = await distributeFunds(
                funderPrivateKey,
                [wallet],
                amountPerWallet,
                rpcUrl,
                jitoSettings,
                3 // Set retryCount to 3 to trigger Jito
              );
              return jitoRetry[0];
            }
          } 
          // Jito fallback path
          else {
            try {
              console.log(`Attempting Jito transaction...`);
              signature = await sendTransactionViaJito(
                transaction, 
                [funderKeypair], 
                connection, 
                jitoSettings?.jitoRpcUrl || JITO_RPC_URL
              );
              console.log(`Jito successful: ${signature}`);
              return signature;
            } catch (jitoErr) {
              console.error("Jito failed:", jitoErr);
              return null;
            }
          }
        } catch (error) {
          console.error(`Failed to send to ${wallet.publicKey}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      if (i + batchSize < wallets.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  } catch (error) {
    console.error('Failed to distribute funds:', error);
    return wallets.map(() => null);
  }
}

/**
 * Return funds from generated wallets back to the funder wallet
 * @param generatedWallets Array of generated wallets
 * @param funderPublicKey Public key of the funder wallet to return funds to
 * @param rpcUrl RPC URL to use for transactions
 * @param funderPrivateKey Optional funder private key to use as fee payer (to prevent rent errors)
 * @returns Array of transaction signatures or null values for failed transactions
 */
export async function returnFundsToFunder(
  generatedWallets: WalletInfo[],
  funderPublicKey: string,
  rpcUrl: string,
  funderPrivateKey?: string,
  useJito: boolean = false,
  retryCount: number = 0
): Promise<(string | null)[]> {
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    const funderPubkey = new PublicKey(funderPublicKey);
    const results: (string | null)[] = [];
    
    // Parse funder keypair if provided
    let funderKeypair: Keypair | null = null;
    if (funderPrivateKey) {
      funderKeypair = parsePrivateKey(funderPrivateKey);
    }
    
    // Process wallets in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < generatedWallets.length; i += batchSize) {
      const batch = generatedWallets.slice(i, i + batchSize);
      const batchPromises = batch.map(async (wallet) => {
        try {
          // Skip wallets with no balance
          const balance = await connection.getBalance(new PublicKey(wallet.publicKey));
          if (balance <= 0) {
            console.log(`Wallet ${wallet.publicKey} has no balance to return.`);
            return null;
          }
          
          const walletKeypair = parsePrivateKey(wallet.privateKey);
          const transaction = new Transaction();
          
          // Add Jito tip if using Jito
          let jitoTipAmount = 0;
          if (useJito) {
            const jitoTipAccount = getRandomJitoTipAccount();
            jitoTipAmount = await getOptimalJitoTip();
            
            transaction.add(
              SystemProgram.transfer({
                fromPubkey: walletKeypair.publicKey,
                toPubkey: jitoTipAccount,
                lamports: jitoTipAmount,
              })
            );
          }
          
          // Determine who pays the fees - use funder if available
          let feePayer = funderKeypair ? funderKeypair.publicKey : walletKeypair.publicKey;
          transaction.feePayer = feePayer;
          
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
          
          // If wallet is paying fees
          let amountToSend = balance;
          if (!funderKeypair) {
            // Reserve funds for fees
            const fee = 5000 * 10; // Use fixed fee estimate of 5000 lamports per signature with buffer
            amountToSend = balance - fee - jitoTipAmount;
            
            if (amountToSend <= 0) {
              console.log(`Wallet ${wallet.publicKey} balance (${balance / LAMPORTS_PER_SOL} SOL) is too small to cover fees.`);
              return null;
            }
          }
          
          // Add the transfer instruction
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: walletKeypair.publicKey,
              toPubkey: funderPubkey,
              lamports: amountToSend,
            })
          );
          
          // Set transaction parameters
          transaction.recentBlockhash = blockhash;
          transaction.lastValidBlockHeight = lastValidBlockHeight;
          
          // Send and confirm transaction
          let signature: string;
          
          // Determine signers
          const signers = funderKeypair 
            ? [walletKeypair, funderKeypair] 
            : [walletKeypair];
            
          try {
            if (useJito) {
              signature = await sendTransactionViaJito(transaction, signers, connection);
            } else {
              signature = await sendAndConfirmTransaction(connection, transaction, signers);
            }
          } catch (err: any) {
            console.error(`Return funds transaction failed:`, err);
            
            // If it's an insufficient funds for rent error and we're not using funder as fee payer,
            // try again by making the funder the fee payer if possible
            if (
              !funderKeypair && 
              funderPrivateKey && 
              err.message && 
              (err.message.includes("Insufficient funds") || err.message.includes("InsufficientFundsForRent"))
            ) {
              console.log("Insufficient funds for rent error detected, retrying with funder as fee payer...");
              
              const singleRetry = await returnFundsToFunder(
                [wallet], 
                funderPublicKey, 
                rpcUrl, 
                funderPrivateKey,
                useJito, 
                0
              );
              return singleRetry[0];
            }
            
            // Regular retry logic
            if (!useJito && retryCount < 3) {
              console.log(`Regular transaction failed, retrying standard method (${retryCount + 1}/3)...`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay before retry
              
              // Retry the same wallet with standard method
              const singleRetry = await returnFundsToFunder(
                [wallet], 
                funderPublicKey, 
                rpcUrl, 
                funderPrivateKey,
                false, 
                retryCount + 1
              );
              return singleRetry[0];
            } else if (!useJito && retryCount >= 3) {
              console.log(`Standard method failed after ${retryCount} retries, trying with Jito...`);
              
              // Try with Jito as a fallback
              const singleRetry = await returnFundsToFunder(
                [wallet], 
                funderPublicKey, 
                rpcUrl, 
                funderPrivateKey,
                true, 
                0
              );
              return singleRetry[0];
            } else {
              // Both methods failed
              throw err;
            }
          }
          
          console.log(`Returned ${amountToSend / LAMPORTS_PER_SOL} SOL from ${wallet.publicKey} to funder`);
          console.log(`Transaction: https://solscan.io/tx/${signature}`);
          
          return signature;
        } catch (error) {
          console.error(`Failed to return funds from ${wallet.publicKey}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < generatedWallets.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  } catch (error) {
    console.error('Failed to return funds:', error);
    return generatedWallets.map(() => null);
  }
}

/**
 * Refresh wallet balances for all wallets
 * @param wallets Array of wallet information objects
 * @param rpcUrl RPC URL to use for balance checks
 * @returns Updated wallet array with fresh balances
 */
export async function refreshWalletBalances(
  wallets: WalletInfo[],
  rpcUrl: string
): Promise<WalletInfo[]> {
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
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return updatedWallets;
}

/**
 * Check if a wallet has enough balance to cover transaction fees
 * @param walletInfo The wallet to check
 * @returns Boolean indicating if the wallet has enough balance
 */
export function hasEnoughBalance(walletInfo: WalletInfo): boolean {
  if (!walletInfo.balance) return false;
  
  // Minimum balance to cover fees (0.0001 SOL)
  const minBalance = 0.0001;
  
  return parseFloat(walletInfo.balance) >= minBalance;
}

/**
 * Mask a private key for display purposes (for non-premium users)
 * @param privateKey The private key to mask
 * @returns Masked private key
 */
export function maskPrivateKey(privateKey: string): string {
  if (!privateKey) return "";
  
  // Show first 4 and last 4 characters
  const length = privateKey.length;
  if (length <= 8) return privateKey;
  
  return privateKey.substring(0, 4) + "••••••••••••••••••" + privateKey.substring(length - 4);
}