// Scoreboard.jsx
import React, { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { Card, CardContent } from "@/components/ui/card"

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function Scoreboard() {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("scores")
      .select("score, users(name)")
      .then(({ data, error }) => {
        if (error) {
          throw error
        }

        const formatted = (data || []).map((row) => ({
          user: row.users?.name ?? "",
          score: row.score,
        }))
        const sorted = [...formatted].sort((a, b) => b.score - a.score)
        setScores(sorted)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to load scores:", err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="text-center text-white mt-8">Loading scores...</div>
  }

  return (
    <div className="mt-12 w-full">
      <Card className="bg-black/50 border border-gray-700 rounded-2xl shadow-xl backdrop-blur-md text-white">
        <CardContent className="p-6">
          <h2 className="text-3xl font-bold text-white text-center mb-6 drop-shadow-md">
            ðŸ† Leaderboard ðŸ†
          </h2>
          <table className="w-full text-left border-collapse text-sm md:text-base text-white">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="py-2 px-4">#</th>
                <th className="py-2 px-4">User</th>
                <th className="py-2 px-4 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((row, index) => (
                <tr
                  key={row.user}
                  className="border-b border-slate-700 hover:bg-white/10 transition"
                >
                  <td className="py-2 px-4 font-mono text-white">{index + 1}</td>
                  <td className="py-2 px-4 text-white">{row.user}</td>
                  <td className="py-2 px-4 text-right font-semibold text-white">{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
