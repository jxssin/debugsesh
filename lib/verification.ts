// This is a simplified email verification service
// In a real app, you would integrate with a service like Twilio Verify, SendGrid, etc.

// Store verification codes in memory (should use a real database in production)
const verificationCodes: Record<string, { code: string, expires: number }> = {};

// Generate a random 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification code to email (simulated)
export function sendVerificationCode(email: string): string {
  // Generate a verification code
  const code = generateVerificationCode();
  
  // Store the code with a 10-minute expiration
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  verificationCodes[email] = { code, expires: expiresAt };
  
  // In a real app, you would send an email with the code
  console.log(`Verification code for ${email}: ${code}`);
  
  return code;
}

// Verify the code
export function verifyCode(email: string, code: string): boolean {
  const storedData = verificationCodes[email];
  
  // If no code exists or has expired
  if (!storedData || Date.now() > storedData.expires) {
    return false;
  }
  
  // Check if the code matches
  const isValid = storedData.code === code;
  
  // Remove the code after verification (successful or not)
  if (isValid) {
    delete verificationCodes[email];
  }
  
  return isValid;
}