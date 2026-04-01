// DailyPredictions.jsx
import React, { useEffect, useState } from "react"

const USERS = ["Roee", "Dagan Harakuvich", "Saban", "Doron"]

export default function DailyPredictions() {
  const [predictions, setPredictions] = useState([])

  useEffect(() => {
    const fetchPredictions = () => {
      fetch("/api/dailyPredictions")
        .then((res) => res.json())
        .then((data) => setPredictions(data))
        .catch((err) => console.error("âŒ Failed to fetch predictions", err))
    }

    fetchPredictions()
    const interval = setInterval(fetchPredictions, 30000)

    return () => clearInterval(interval)
  }, [])

  const grouped = USERS.map((user) => {
    const userPreds = predictions.filter((p) => p.user === user)
    return {
      user,
      picks: userPreds.length > 0
        ? userPreds.map((p) => ({ pick: p.pick }))
        : null,
    }
  })

  return (
    <div className="mt-12 rounded-2xl border border-red-500 bg-black/50 shadow-[0_0_15px_rgba(255,0,0,0.5)] backdrop-blur-md text-white p-6 w-full overflow-x-auto">
      <h2 className="text-xl md:text-2xl font-semibold text-white mb-6 flex items-center gap-2">
         Today's Predictions ðŸ—’ï¸
      </h2>
      <table className="w-full table-auto text-sm md:text-base border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-left text-white/70">
            <th className="p-3">User</th>
            <th className="p-3">Pick(s)</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map((row, idx) => (
            <tr
              key={idx}
              className="border-b border-white/5 hover:bg-white/5 transition"
            >
              <td className="p-3 font-medium text-white">{row.user}</td>
              <td className="p-3">
                {row.picks ? (
                  row.picks.map((p, i) => (
                    <div key={i} className="text-white">{p.pick}</div>
                  ))
                ) : (
                  <span className="text-red-500 font-semibold">
                    No prediction submitted
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
