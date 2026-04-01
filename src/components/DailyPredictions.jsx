// DailyPredictions.jsx
import React, { useEffect, useState } from "react"

function isGameStarted(gameTime, gameDate) {
  if (!gameTime || !gameDate) return false
  const todayIL = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
  if (gameDate < todayIL) return true
  if (gameDate > todayIL) return false
  const [h, m] = gameTime.split(":").map(Number)
  const now = new Date()
  const nowIL = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }))
  return nowIL.getHours() > h || (nowIL.getHours() === h && nowIL.getMinutes() >= m)
}

export default function DailyPredictions({ currentUserId }) {
  const [predictions, setPredictions] = useState([])

  useEffect(() => {
    const fetchPredictions = () => {
      fetch("/api/dailyPredictions")
        .then((res) => res.json())
        .then((data) => setPredictions(data))
        .catch((err) => console.error("Failed to fetch predictions", err))
    }

    fetchPredictions()
    const interval = setInterval(fetchPredictions, 30000)

    return () => clearInterval(interval)
  }, [])

  const users = [...new Map(predictions.map((p) => [p.user_id, p.user])).entries()]

  const grouped = users.map(([userId, userName]) => {
    const userPreds = predictions.filter((p) => p.user_id === userId)
    return {
      user: userName,
      userId,
      picks: userPreds.map((p) => ({
        pick: p.pick,
        game_time: p.game_time,
        date: p.date,
      })),
    }
  })

  return (
    <div className="mt-12 rounded-2xl border border-red-500 bg-black/50 shadow-[0_0_15px_rgba(255,0,0,0.5)] backdrop-blur-md text-white p-6 w-full overflow-x-auto">
      <h2 className="text-xl md:text-2xl font-semibold text-white mb-6 flex items-center gap-2">
        Today's Predictions 🗒️
      </h2>
      <table className="w-full table-auto text-sm md:text-base border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-left text-white/70">
            <th className="p-3">User</th>
            <th className="p-3">Pick(s)</th>
          </tr>
        </thead>
        <tbody>
          {grouped.length === 0 ? (
            <tr>
              <td colSpan={2} className="p-3 text-center text-slate-400">
                No predictions yet
              </td>
            </tr>
          ) : (
          grouped.map((row, idx) => (
            <tr
              key={idx}
              className="border-b border-white/5 hover:bg-white/5 transition"
            >
              <td className="p-3 font-medium text-white">{row.user}</td>
              <td className="p-3">
                {row.picks.map((p, i) => {
                  const started = isGameStarted(p.game_time, p.date)
                  const isOwn = row.userId === currentUserId
                  return (
                    <div key={i} className="text-white">
                      {started || isOwn ? p.pick : <span className="text-slate-500 italic">Hidden</span>}
                    </div>
                  )
                })}
              </td>
            </tr>
          ))
          )}
        </tbody>
      </table>
    </div>
  )
}
