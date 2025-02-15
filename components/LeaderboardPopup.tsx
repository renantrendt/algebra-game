"use client"

import { useState, useEffect } from "react"
import { getTop3Ranking, getTop12Ranking } from "../lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface RankingItem {
  name: string
  score: number
  id?: number
  created_at?: string
}

export function LeaderboardPopup() {
  const [top3, setTop3] = useState<RankingItem[]>([])
  const [fullRanking, setFullRanking] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFullRanking, setShowFullRanking] = useState(false)

  useEffect(() => {
    async function fetchRanking() {
      try {
        setLoading(true)
        const [top3Data, fullData] = await Promise.all([
          getTop3Ranking(),
          getTop12Ranking()
        ])
        setTop3(top3Data)
        setFullRanking(fullData)
      } catch (err) {
        setError("Failed to fetch leaderboard")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchRanking()
  }, [])

  if (loading) return <div>Loading leaderboard...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <>
      <div className="leaderboard-popup bg-white/10 backdrop-blur-sm rounded-lg p-4 shadow-lg">
        <h3 className="text-xl font-bold mb-2 text-white">Top 3 Players</h3>
        {top3.length > 0 ? (
          <div className="space-y-2">
            {top3.map((item, index) => (
              <div
                key={index}
                className={`flex justify-between items-center ${index === 0 ? 'text-yellow-300' : index === 1 ? 'text-gray-300' : 'text-yellow-600'}`}
              >
                <span>{item.name}</span>
                <span>{item.score}</span>
              </div>
            ))}
            {fullRanking.length > 3 && (
              <button
                onClick={() => setShowFullRanking(true)}
                className="mt-2 text-white hover:text-gray-300 transition-colors"
              >
                ...
              </button>
            )}
          </div>
        ) : (
          <p className="text-white">No rankings available yet.</p>
        )}
      </div>

      <Dialog open={showFullRanking} onOpenChange={setShowFullRanking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Full Ranking</DialogTitle>
            <DialogDescription>
              Top players from 4th to 12th place
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {fullRanking.slice(3).map((player, index) => (
              <div
                key={player.id || index}
                className="flex justify-between items-center p-2 bg-gray-100 rounded">
                <span>#{index + 4} {player.name}</span>
                <span>{player.score}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

