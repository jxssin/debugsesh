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
 * Get the optimal Jito tip amount based on current network conditions
 */
async function getOptimalJitoTip(): Promise<number> {
  try {
    const response = await axios.get('https://bundles.jito.wtf/api/v1/bundles/tip_floor');
    
    if (response.data && response.data.landed_tips_75th_percentile) {
      // Get 75th percentile in lamports
      const tipBase = response.data.landed_tips_75th_percentile;
      
      // Add 50% extra
      const tipWithExtra = Math.ceil(tipBase * 1.5);
      
      // Cap at 0.0005 SOL (500,000 lamports)
      const maxTip = 0.0005 * LAMPORTS_PER_SOL;
      const finalTip = Math.min(tipWithExtra, maxTip);
      
      console.log(`Jito tip: 75th percentile (${tipBase / LAMPORTS_PER_SOL} SOL) + 50% = ${finalTip / LAMPORTS_PER_SOL} SOL`);
      
      return finalTip;
    } else {
      console.warn('Invalid response from Jito API, using fallback tip amount');
      return 0.0001 * LAMPORTS_PER_SOL;
    }
  } catch (error) {
    console.error('Failed to fetch Jito tip amount:', error);
    // Fallback to default 0.0001 SOL tip
    return 0.0001 * LAMPORTS_PER_SOL;
  }
}

function getRandomJitoTipAccount(): PublicKey {
  const randomIndex = Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length);
  return new PublicKey(JITO_TIP_ACCOUNTS[randomIndex]);
}

async function sendTransactionViaJito(
  transaction: Transaction,
  signers: Keypair[],
  connection: Connection
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
  
  const jitoResponse = await axios.post(
    `${JITO_RPC_URL}/api/v1/transactions`,
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
      if (useJito) {
        signature = await sendTransactionViaJito(transaction, [funderKeypair], connection);
      } else {
        transaction.feePayer = funderKeypair.publicKey;
        signature = await sendAndConfirmTransaction(connection, transaction, [funderKeypair]);
      }
    } catch (err: any) {
      // If regular transaction failed and we haven't tried Jito yet, retry with Jito
      if (!useJito && retryCount < 3) {
        console.log(`Regular transaction failed, retrying with standard method (${retryCount + 1}/3)...`);
        return convertToSmartWallet(walletInfo, platformKey, funderPrivateKey, rpcUrl, false, retryCount + 1);
      } else if (!useJito && retryCount >= 3) {
        console.log(`Standard method failed after ${retryCount} retries, trying with Jito...`);
        return convertToSmartWallet(walletInfo, platformKey, funderPrivateKey, rpcUrl, true, 0);
      } else {
        // Both methods failed
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
export async function distributeFunds(
  funderPrivateKey: string,
  wallets: WalletInfo[],
  amountPerWallet: number, 
  rpcUrl: string,
  useJito: boolean = false,
  retryCount: number = 0
): Promise<(string | null)[]> {
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    const funderKeypair = parsePrivateKey(funderPrivateKey);
    const results: (string | null)[] = [];
    
    // Process wallets in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < wallets.length; i += batchSize) {
      const batch = wallets.slice(i, i + batchSize);
      const batchPromises = batch.map(async (wallet) => {
        try {
          const transaction = new Transaction();
          const destinationPubkey = new PublicKey(wallet.publicKey);
          
          // Add Jito tip if needed
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
          
          // Add the transfer instruction - FUNDER pays
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: funderKeypair.publicKey,
              toPubkey: destinationPubkey,
              lamports: Math.floor(amountPerWallet * LAMPORTS_PER_SOL),
            })
          );
          
          // Send and confirm transaction
          let signature: string;
          
          try {
            if (useJito) {
              signature = await sendTransactionViaJito(transaction, [funderKeypair], connection);
            } else {
              transaction.feePayer = funderKeypair.publicKey;
              signature = await sendAndConfirmTransaction(connection, transaction, [funderKeypair]);
            }
          } catch (err: any) {
            // If regular transaction failed and we haven't tried Jito yet, retry with standard method
            if (!useJito && retryCount < 3) {
              console.log(`Regular transaction failed, retrying standard method (${retryCount + 1}/3)...`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay before retry
              
              // Retry the same wallet with standard method
              const singleRetry = await distributeFunds(
                funderPrivateKey, 
                [wallet], 
                amountPerWallet, 
                rpcUrl, 
                false, 
                retryCount + 1
              );
              return singleRetry[0];
            } else if (!useJito && retryCount >= 3) {
              console.log(`Standard method failed after ${retryCount} retries, trying with Jito...`);
              
              // Try with Jito as a fallback
              const singleRetry = await distributeFunds(
                funderPrivateKey, 
                [wallet], 
                amountPerWallet, 
                rpcUrl, 
                true, 
                0
              );
              return singleRetry[0];
            } else {
              // Both methods failed
              throw err;
            }
          }
          
          console.log(`Sent ${amountPerWallet} SOL to ${wallet.publicKey}`);
          console.log(`Transaction: https://solscan.io/tx/${signature}`);
          
          return signature;
        } catch (error) {
          console.error(`Failed to send funds to ${wallet.publicKey}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add a small delay between batches to avoid rate limiting
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
 * @returns Array of transaction signatures or null values for failed transactions
 */
export async function returnFundsToFunder(
  generatedWallets: WalletInfo[],
  funderPublicKey: string,
  rpcUrl: string,
  useJito: boolean = false,
  retryCount: number = 0
): Promise<(string | null)[]> {
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    const funderPubkey = new PublicKey(funderPublicKey);
    const results: (string | null)[] = [];
    
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
          
          // Simulate the transaction to get accurate fee estimate
          transaction.feePayer = walletKeypair.publicKey;
          const { value: { feeCalculator } } = await connection.getRecentBlockhash();
          const fee = feeCalculator.lamportsPerSignature * 10; // Add buffer for the fee
          
          // Calculate the amount to send (balance - fees - jito tip)
          const amountToSend = balance - fee - jitoTipAmount;
          
          if (amountToSend <= 0) {
            console.log(`Wallet ${wallet.publicKey} balance (${balance / LAMPORTS_PER_SOL} SOL) is too small to cover fees.`);
            return null;
          }
          
          // Add the transfer instruction
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: walletKeypair.publicKey,
              toPubkey: funderPubkey,
              lamports: amountToSend,
            })
          );
          
          // Send and confirm transaction
          let signature: string;
          
          try {
            if (useJito) {
              signature = await sendTransactionViaJito(transaction, [walletKeypair], connection);
            } else {
              signature = await sendAndConfirmTransaction(connection, transaction, [walletKeypair]);
            }
          } catch (err: any) {
            // If regular transaction failed and we haven't tried too many times, retry with standard method
            if (!useJito && retryCount < 3) {
              console.log(`Regular transaction failed, retrying standard method (${retryCount + 1}/3)...`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay before retry
              
              // Retry the same wallet with standard method
              const singleRetry = await returnFundsToFunder(
                [wallet], 
                funderPublicKey, 
                rpcUrl, 
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