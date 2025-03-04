"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"

export function SolanaPrice() {
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [blinking, setBlinking] = useState(true)

  const fetchSolanaPrice = async () => {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
      )
      
      if (!response.ok) {
        throw new Error("Failed to fetch price")
      }
      
      const data = await response.json()
      if (data?.solana?.usd) {
        setPrice(data.solana.usd)
      }
      
      setLoading(false)
    } catch (error) {
      console.error("Error fetching Solana price:", error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSolanaPrice()
    
    // Refresh price every 60 seconds
    const intervalId = setInterval(fetchSolanaPrice, 60000)
    
    // Cleanup interval on component unmount
    return () => clearInterval(intervalId)
  }, [])

  // Blink effect for the live indicator
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinking(prev => !prev)
    }, 1000)
    
    return () => clearInterval(blinkInterval)
  }, [])

  return (
    <div className="flex items-center px-6 py-3 border-b justify-start">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-6 h-6">
          <img
            src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
            alt="Solana"
            className="w-5 h-5 rounded-full"
          />
        </div>
        <span className="text-sm">
          {loading ? "$--.-" : `${price?.toFixed(2)}`}
        </span>
        
        <div className="flex items-center gap-1 ml-1">
          <div className={`w-2 h-2 rounded-full ${blinking ? 'bg-green-500' : 'bg-green-300'} transition-colors duration-300`}></div>
          <span className="text-xs text-muted-foreground">LIVE</span>
        </div>
      </div>
    </div>
  )
}