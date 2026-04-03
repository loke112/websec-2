import { useCallback, useState } from 'react'
import './App.css'
import MapView from './MapView'
import { getNearbyStations, getStationSchedule, searchStations, searchRoutes } from './api'

function App() {
  const [nearby, setNearby] = useState([])
  const [selectedStation, setSelectedStation] = useState(null)
  const [marker, setMarker] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  const [mode, setMode] = useState('station') // 'station' | 'route'
  const [routeFrom, setRouteFrom] = useState(null)
  const [routeTo, setRouteTo] = useState(null)
  const [routes, setRoutes] = useState(null)

  const handleSearchChange = useCallback(async (event) => {
    const value = event.target.value
    setSearchQuery(value)

    const trimmed = value.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      return
    }

    try {
      setError('')
      const stations = await searchStations(trimmed)
      setSearchResults(stations)
    } catch {
      setError('Не удалось выполнить поиск станции')
    }
  }, [])

  function selectStationForMode(station) {
    if (mode === 'route') {
      if (!routeFrom) {
        setRouteFrom(station)
      } else if (!routeTo) {
        setRouteTo(station)
      } else {
        setRouteFrom(station)
        setRouteTo(null)
      }
      setRoutes(null)
    } else {
      setSelectedStation(station)
      setSchedule(null)
    }

    if (station.latitude != null && station.longitude != null) {
      setMarker({ lat: station.latitude, lng: station.longitude })
    } else if (station.lat != null && station.lng != null) {
      setMarker({ lat: station.lat, lng: station.lng })
    }
  }

  function handleSelectFromSearch(station) {
    selectStationForMode(station)
  }

  function handleSelectNearby(station) {
    selectStationForMode(station)
  }

  const handleMapClick = useCallback(async ({ lat, lng }) => {
    try {
      setError('')
      if (mode === 'station') {
        setSchedule(null)
        setSelectedStation(null)
      }
      setMarker({ lat, lng })
      const data = await getNearbyStations(lat, lng)
      setNearby(data)
    } catch {
      setError('Не удалось получить ближайшие станции')
    }
  }, [mode])

  async function loadSchedule() {
    if (!selectedStation) {
      setError('Сначала выберите станцию')
      return
    }
    try {
      setError('')
      const data = await getStationSchedule(selectedStation.code, date)
      setSchedule(data)
    } catch {
      setError('Не удалось загрузить расписание станции')
    }
  }

  async function loadRoutes() {
    if (!routeFrom || !routeTo) {
      setError('Выберите станции отправления и прибытия')
      return
    }
    try {
      setError('')
      const data = await searchRoutes(routeFrom.code, routeTo.code, date, false)
      setRoutes(data)
    } catch {
      setError('Не удалось загрузить маршруты')
    }
  }

  const markers = []

if (mode === 'route') {
  if (routeFrom && routeFrom.latitude != null && routeFrom.longitude != null) {
    markers.push({ lat: routeFrom.latitude, lng: routeFrom.longitude })
  }
  if (routeTo && routeTo.latitude != null && routeTo.longitude != null) {
    markers.push({ lat: routeTo.latitude, lng: routeTo.longitude })
  }
}

if (!markers.length && marker) {
  markers.push(marker)
}

  return (
    <div className="page">
      <header className="header">
        <h1>Прибывалка для электричек</h1>
        <p>Выберите станцию по карте и посмотрите расписание</p>
      </header>

      <main className="layout">
        <section className="panel controls">
          <div className="block">
            <h2>Поиск станции</h2>
            <p className="hint">Начните вводить название станции или населённого пункта</p>
            <input
              type="text"
              placeholder="Например, Самара"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <div className="search-list">
              {searchResults.length ? (
                searchResults.map(st => (
                  <button
                    key={`search-${st.code}`}
                    className={`list-item ${selectedStation?.code === st.code ? 'active' : ''}`}
                    onClick={() => handleSelectFromSearch(st)}
                  >
                    <span className="list-title">{st.title}</span>
                    <span className="list-subtitle">
                      {st.settlementTitle || st.regionTitle || st.countryTitle}
                    </span>
                  </button>
                ))
              ) : (
                <div className="empty small">Ничего не найдено</div>
              )}
            </div>
          </div>

          <div className="block">
            <h2>Ближайшие станции</h2>
            <p className="hint">Нажмите по карте, чтобы получить список станций рядом</p>
            <div className="list list-nearby">
              {nearby.length ? nearby.map(st => (
                <button
                  key={st.code}
                  className={`list-item ${selectedStation?.code === st.code ? 'active' : ''}`}
                  onClick={() => handleSelectNearby(st)}
                >
                  <span className="list-title">{st.title}</span>
                  <span className="list-subtitle">
                    {st.distance ? `${st.distance.toFixed(2)} км` : ''}
                  </span>
                </button>
              )) : <div className="empty small">Список пуст. Кликните по карте.</div>}
            </div>
          </div>

          <div className="block">
            <label htmlFor="date">Дата</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
            {mode === 'station' ? (
              <button className="full-button" onClick={loadSchedule}>
                Показать расписание станции
              </button>
            ) : (
              <button className="full-button" onClick={loadRoutes}>
                Показать маршруты
              </button>
            )}
          </div>

          {error && <div className="error">{error}</div>}
        </section>

        <section className="panel map-panel">
  <MapView markers={markers} onMapClick={handleMapClick} />
</section>

        <section className="panel results">
          <div className="mode-toggle">
            <button
              className={`mode-button ${mode === 'station' ? 'active' : ''}`}
              onClick={() => setMode('station')}
            >
              По станции
            </button>
            <button
              className={`mode-button ${mode === 'route' ? 'active' : ''}`}
              onClick={() => {
                setMode('route')
                setSchedule(null)
              }}
            >
              Между станциями
            </button>
          </div>

          {mode === 'station' ? (
            <>
              {selectedStation ? (
                <div className="selected-box">
                  <div className="selected-title">{selectedStation.title}</div>
                  <div className="selected-subtitle">{selectedStation.code}</div>
                </div>
              ) : (
                <div className="selected-box">Станция не выбрана</div>
              )}

              {schedule ? (
                <div className="schedule-scroll">
                  <div className="result-header">
                    <h2>Расписание по станции</h2>
                    <p>{schedule.station?.title || selectedStation?.title}</p>
                  </div>

                  <div className="result-section">
                    <h3>Отправление</h3>
                    <div className="cards">
                      {schedule.departure?.length ? (
                        schedule.departure.map((item, index) => (
                          <article className="card" key={`dep-${item.uid || index}`}>
                            <h3>{item.title || 'Электричка'}</h3>
                            <p><strong>Номер:</strong> {item.number || '—'}</p>
                            <p><strong>Направление:</strong> {item.direction || '—'}</p>
                            <p><strong>Отправление:</strong> {item.departure || '—'}</p>
                            <p><strong>Прибытие:</strong> {item.arrival || '—'}</p>
                            <p><strong>Платформа:</strong> {item.platform || '—'}</p>
                            <p><strong>Дни:</strong> {item.days || '—'}</p>
                            <p><strong>Перевозчик:</strong> {item.carrier || '—'}</p>
                          </article>
                        ))
                      ) : (
                        <div className="empty">Нет отправлений на выбранную дату</div>
                      )}
                    </div>
                  </div>

                  <div className="result-section">
                    <h3>Прибытие</h3>
                    <div className="cards">
                      {schedule.arrival?.length ? (
                        schedule.arrival.map((item, index) => (
                          <article className="card" key={`arr-${item.uid || index}`}>
                            <h3>{item.title || 'Электричка'}</h3>
                            <p><strong>Номер:</strong> {item.number || '—'}</p>
                            <p><strong>Направление:</strong> {item.direction || '—'}</p>
                            <p><strong>Прибытие:</strong> {item.arrival || '—'}</p>
                            <p><strong>Отправление:</strong> {item.departure || '—'}</p>
                            <p><strong>Платформа:</strong> {item.platform || '—'}</p>
                            <p><strong>Дни:</strong> {item.days || '—'}</p>
                            <p><strong>Перевозчик:</strong> {item.carrier || '—'}</p>
                          </article>
                        ))
                      ) : (
                        <div className="empty">Нет прибытий на выбранную дату</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty">Расписание не загружено</div>
              )}
            </>
          ) : (
            <div className="schedule-scroll">
              <div className="result-header">
                <h2>Маршрут между станциями</h2>
                <p>Выберите станции слева и нажмите «Показать маршруты»</p>
              </div>

              <div className="route-form">
                <div className="route-field">
                  <div className="route-label">Откуда</div>
                  <div className="route-value">
                    {routeFrom ? `${routeFrom.title} (${routeFrom.code})` : 'Не выбрано'}
                  </div>
                </div>

                <div className="route-field">
                  <div className="route-label">Куда</div>
                  <div className="route-value">
                    {routeTo ? `${routeTo.title} (${routeTo.code})` : 'Не выбрано'}
                  </div>
                </div>
              </div>

              {routes ? (
                routes.segments?.length ? (
                  <div className="result-section">
                    <h3>Найденные маршруты</h3>
                    <div className="cards">
                      {routes.segments.map((seg, index) => (
                        <article className="card" key={`seg-${seg.uid || index}`}>
                          <h3>{seg.title || 'Маршрут'}</h3>
                          <p><strong>Отправление:</strong> {seg.departure || '—'}</p>
                          <p><strong>Прибытие:</strong> {seg.arrival || '—'}</p>
                          <p><strong>Номер:</strong> {seg.number || '—'}</p>
                          <p><strong>Перевозчик:</strong> {seg.carrier || '—'}</p>
                          <p><strong>Станции:</strong> {seg.fromTitle} → {seg.toTitle}</p>
                          <p><strong>Пересадки:</strong> {seg.hasTransfers ? 'есть' : 'нет'}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="empty">Маршрутов на выбранную дату не найдено</div>
                )
              ) : null}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App