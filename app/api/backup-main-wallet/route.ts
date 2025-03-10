import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key (server-side only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate request data
    if (!data.userId || !data.wallet || !data.walletType || !['developer', 'funder'].includes(data.walletType)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    
    // Create backup record
    const { error } = await supabaseAdmin
      .from('main_wallets_backups')
      .insert({
        user_id: data.userId,
        wallet_type: data.walletType,
        wallet_data: data.wallet,
        created_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error saving main wallet backup:', error);
      return NextResponse.json({ error: 'Failed to save backup' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in backup-main-wallet API:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}