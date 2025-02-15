"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getTopRanking } from "../lib/supabase"

interface RankingItem {
  name: string
  score: number
}

export default function AlgebraGame() {
  const [leaderboard, setLeaderboard] = useState<RankingItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true)
      const data = await getTopRanking()
      setLeaderboard(data || [])
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" onClick={fetchLeaderboard} className="mb-4">
            Show Leaderboard
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Top 12 Players</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <p className="text-center">Loading...</p>
            ) : leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index < 3 ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-bold ${
                          index === 0
                            ? "text-yellow-500"
                            : index === 1
                              ? "text-gray-400"
                              : index === 2
                                ? "text-amber-600"
                                : ""
                        }`}
                      >
                        {index + 1}.
                      </span>
                      <span>{item.name}</span>
                    </div>
                    <span className="font-mono font-bold">{item.score}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No rankings available yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rest of your game components */}
    </div>
  )
}

