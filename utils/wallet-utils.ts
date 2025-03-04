import { Keypair, PublicKey, Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

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
  rpcUrl: string
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
    
    // Add the tip instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: funderKeypair.publicKey,
        toPubkey: platformPubkey,
        lamports: Math.floor(platform.tipAmount * LAMPORTS_PER_SOL),
      })
    );
    
    // Sign and send the transaction
    const signature = await connection.sendTransaction(transaction, [funderKeypair]);
    await connection.confirmTransaction(signature);
    
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
  rpcUrl: string
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
          
          // Add the transfer instruction
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: funderKeypair.publicKey,
              toPubkey: destinationPubkey,
              lamports: Math.floor(amountPerWallet * LAMPORTS_PER_SOL),
            })
          );
          
          // Send and confirm transaction
          const signature = await connection.sendTransaction(transaction, [funderKeypair]);
          await connection.confirmTransaction(signature);
          
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
  rpcUrl: string
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
          
          // Calculate fee and amount to return
          const walletKeypair = parsePrivateKey(wallet.privateKey);
          const transaction = new Transaction();
          
          // Calculate the amount to send (balance - fees)
          const fee = 5000; // Approximate fee in lamports
          const amountToSend = balance - fee;
          
          if (amountToSend <= 0) {
            console.log(`Wallet ${wallet.publicKey} balance (${balance}) is too small to cover fees.`);
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
          const signature = await connection.sendTransaction(transaction, [walletKeypair]);
          await connection.confirmTransaction(signature);
          
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