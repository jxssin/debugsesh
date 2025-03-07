// pages/api/jito-tip.ts
import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await axios.get('https://bundles.jito.wtf/api/v1/bundles/tip_floor');
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching Jito tip:', error);
    res.status(500).json({ error: 'Failed to fetch tip' });
  }
}