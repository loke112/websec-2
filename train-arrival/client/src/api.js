const API_BASE = 'http://127.0.0.1:5001/api'

export async function searchStations(query) {
  const res = await fetch(`${API_BASE}/stations/search?q=${encodeURIComponent(query)}`)
  if (!res.ok) throw new Error('search failed')
  const data = await res.json()
  return data.stations || []
}

export async function getNearbyStations(lat, lng) {
  const res = await fetch(`${API_BASE}/stations/near?lat=${lat}&lng=${lng}`)
  if (!res.ok) throw new Error('nearby failed')
  const data = await res.json()
  return data.stations || []
}

export async function getStationSchedule(code, date) {
  const res = await fetch(`${API_BASE}/stations/${encodeURIComponent(code)}/schedule?date=${date}`)
  if (!res.ok) throw new Error('schedule failed')
  return res.json()
}

export async function searchRoutes(from, to, date, transfers = false) {
  const res = await fetch(
    `${API_BASE}/routes/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}&transfers=${transfers}`
  )
  if (!res.ok) throw new Error('route failed')
  return res.json()
}