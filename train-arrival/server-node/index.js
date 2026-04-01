const express = require('express')
const cors = require('cors')
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

const BASE_URL = 'https://api.rasp.yandex-net.ru/v3.0'
const API_KEY = process.env.YANDEX_RASP_API_KEY || process.env.YANDEX_API_KEY

async function yandexRequest(path, params = {}) {
  const url = new URL(BASE_URL + path)

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  const res = await fetch(url.href, {
    headers: {
      Authorization: API_KEY
    }
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Yandex error ${res.status}: ${text}`)
  }

  return res.json()
}

let stationsCache = []

async function loadStations() {
  const data = await yandexRequest('/stations_list/', {})
  const results = []

  for (const country of data.countries || []) {
    for (const region of country.regions || []) {
      for (const settlement of region.settlements || []) {
        for (const station of settlement.stations || []) {
          const code = station.codes?.yandex_code
          const title = station.title || ''
          const stationType = (station.station_type || '').toLowerCase()
          const transportType = (station.transport_type || '').toLowerCase()
          const lat = station.latitude
          const lng = station.longitude

          if (!code || !title || lat == null || lng == null) continue

          const isRailway =
            transportType.includes('поезд') ||
            transportType.includes('электрич') ||
            stationType.includes('станц') ||
            stationType.includes('платформ') ||
            stationType.includes('вокзал')

          if (!isRailway) continue

          results.push({
            code,
            title,
            region: region.title || '',
            settlement: settlement.title || '',
            country: country.title || '',
            lat,
            lng,
            stationType: station.station_type || '',
            transportType: station.transport_type || '',
            direction: station.direction || ''
          })
        }
      }
    }
  }

  stationsCache = results
}

app.get('/api/ping', (req, res) => {
  res.json({ ok: true, backend: 'node' })
})

app.get('/api/debug/stations-raw', async (req, res) => {
  try {
    const data = await yandexRequest('/stations_list/', {})
    res.json({ hasCountries: Array.isArray(data.countries), countriesLength: (data.countries || []).length })
  } catch (error) {
    res.status(500).json({ error: 'debug failed', message: String(error) })
  }
})

app.get('/api/stations/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase()

    if (q.length < 2) {
      return res.json({ stations: [] })
    }

    const data = await yandexRequest('/stations_list/', {
      lang: 'ru_RU',
      format: 'json'
    })

    const stations = []
    const seen = new Set()

    for (const country of data.countries || []) {
      for (const region of country.regions || []) {
        for (const settlement of region.settlements || []) {
          for (const station of settlement.stations || []) {
            const code = station.codes?.yandex_code || station.codes?.yandex || station.code
            const title = station.title || ''
            const popularTitle = station.popular_title || title
            const shortTitle = station.short_title || title
            const transportType = String(station.transport_type || '').toLowerCase()
            const text = `${title} ${popularTitle} ${shortTitle} ${settlement.title || ''} ${region.title || ''}`.toLowerCase()

            const isRail =
              transportType === 'suburban' ||
              transportType === 'train'

            if (!isRail) continue
            if (!code || seen.has(code)) continue
            if (!text.includes(q)) continue

            seen.add(code)

            stations.push({
              code,
              title,
              popularTitle,
              shortTitle,
              stationType: station.station_type || '',
              transportType: station.transport_type || '',
              latitude: Number(station.latitude || station.lat || 0),
              longitude: Number(station.longitude || station.lng || 0),
              settlementTitle: settlement.title || '',
              regionTitle: region.title || '',
              countryTitle: country.title || ''
            })

            if (stations.length >= 10) break
          }
          if (stations.length >= 10) break
        }
        if (stations.length >= 10) break
      }
      if (stations.length >= 10) break
    }

    res.json({ stations })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.get('/api/stations/near', async (req, res) => {
  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ message: 'Нужно передать корректные координаты lat и lng.' })
  }

  try {
    const data = await yandexRequest('/nearest_stations/', {
      lang: 'ru_RU',
      format: 'json',
      lat,
      lng,
      distance: 25,
      limit: 10,
      station_types: 'station,platform,stop,train_station',
      transport_types: 'train,suburban'
    })

    const stations = (data.stations || []).map(station => ({
      code: station.code || station.codes?.yandex_code || '',
      title: station.title || '',
      popularTitle: station.popular_title || station.title || '',
      shortTitle: station.short_title || station.title || '',
      stationType: station.station_type || '',
      transportType: station.transport_type || '',
      latitude: Number(station.lat || station.latitude || 0),
      longitude: Number(station.lng || station.longitude || 0),
      distance: Number(station.distance || 0)
    }))

    res.json({ stations })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.get('/api/stations/:code/schedule', async (req, res) => {
  const stationCode = String(req.params.code || '').trim()
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || ''))
    ? String(req.query.date)
    : new Date().toISOString().slice(0, 10)

  try {
    const [departureData, arrivalData] = await Promise.all([
      yandexRequest('/schedule/', {
        lang: 'ru_RU',
        format: 'json',
        date,
        station: stationCode,
        transport_types: 'suburban',
        event: 'departure'
      }),
      yandexRequest('/schedule/', {
        lang: 'ru_RU',
        format: 'json',
        date,
        station: stationCode,
        transport_types: 'suburban',
        event: 'arrival'
      })
    ])

    const departure = (departureData.schedule || []).map(entry => ({
      uid: entry.thread?.uid || '',
      title: entry.thread?.title || 'Без названия',
      number: entry.thread?.number || '',
      direction: entry.direction || entry.thread?.short_title || '',
      carrier: entry.thread?.carrier?.title || 'Перевозчик не указан',
      departure: entry.departure || null,
      arrival: entry.arrival || null,
      platform: entry.platform || entry.departure_platform || entry.arrival_platform || '',
      vehicle: entry.thread?.vehicle || entry.thread?.transport_subtype?.title || 'Пригородный поезд',
      stops: entry.stops || '',
      isExpress: Boolean(entry.thread?.express_type),
      days: entry.days || ''
    }))

    const arrival = (arrivalData.schedule || []).map(entry => ({
      uid: entry.thread?.uid || '',
      title: entry.thread?.title || 'Без названия',
      number: entry.thread?.number || '',
      direction: entry.direction || entry.thread?.short_title || '',
      carrier: entry.thread?.carrier?.title || 'Перевозчик не указан',
      departure: entry.departure || null,
      arrival: entry.arrival || null,
      platform: entry.platform || entry.departure_platform || entry.arrival_platform || '',
      vehicle: entry.thread?.vehicle || entry.thread?.transport_subtype?.title || 'Пригородный поезд',
      stops: entry.stops || '',
      isExpress: Boolean(entry.thread?.express_type),
      days: entry.days || ''
    }))

    res.json({
      station: departureData.station || arrivalData.station || null,
      date,
      departure,
      arrival,
      directions: departureData.directions || arrivalData.directions || []
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

app.get('/api/routes/search', async (req, res) => {
  const from = String(req.query.from || '').trim()
  const to = String(req.query.to || '').trim()
  const transfers = String(req.query.transfers || 'false') === 'true'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || ''))
    ? String(req.query.date)
    : new Date().toISOString().slice(0, 10)

  if (!from || !to) {
    return res.status(400).json({ message: 'Для поиска маршрута нужны обе станции: from и to.' })
  }

  try {
    const data = await yandexRequest('/search/', {
      lang: 'ru_RU',
      format: 'json',
      from,
      to,
      date,
      transport_types: 'suburban',
      transfers,
      limit: 24
    })

    const segments = (data.segments || []).map(entry => ({
      uid: entry.thread?.uid || '',
      title: entry.thread?.title || 'Маршрут без названия',
      number: entry.thread?.number || '',
      carrier: entry.thread?.carrier?.title || 'Перевозчик не указан',
      departure: entry.departure || null,
      arrival: entry.arrival || null,
      duration: Number(entry.duration || 0),
      departurePlatform: entry.departure_platform || '',
      arrivalPlatform: entry.arrival_platform || '',
      hasTransfers: Boolean(entry.has_transfers),
      fromTitle: entry.from?.title || '',
      toTitle: entry.to?.title || '',
      transportLabel: entry.thread?.transport_subtype?.title || entry.thread?.vehicle || 'Пригородный поезд',
      days: entry.thread?.schedule || ''
    }))

    res.json({ date, segments })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

const PORT = 5001
loadStations()
  .then(() => {
    console.log('Stations loaded:', stationsCache.length)
    app.listen(5001, () => {
      console.log('Server started on http://localhost:5001')
    })
  })
  .catch(error => {
    console.error('Failed to load stations', error)
  })
app.listen(PORT, () => {
  console.log(`Node backend listening on http://localhost:${PORT}`)
})