import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    console.log('Fetching Jito tip data from API...');
    const response = await axios.get('https://bundles.jito.wtf/api/v1/bundles/tip_floor');
    console.log('Jito API response:', JSON.stringify(response.data, null, 2));
    
    // Return the data with proper structure
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching Jito tip:', error);
    // Return a fallback value to avoid client-side errors
    return NextResponse.json({ 
      landed_tips_75th_percentile: 5000, // 0.000005 SOL in lamports
      error: 'Error fetching data, using fallback value'
    }, { status: 200 });
  }
}