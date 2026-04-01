import { useCallback, useState } from 'react'
import './App.css'
import MapView from './MapView'
import { getNearbyStations, getStationSchedule } from './api'

function App() {
  const [nearby, setNearby] = useState([])
  const [selectedStation, setSelectedStation] = useState(null)
  const [marker, setMarker] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState('')

  const handleMapClick = useCallback(async ({ lat, lng }) => {
    try {
      setError('')
      setSchedule(null)
      setSelectedStation(null)
      setMarker({ lat, lng })
      const data = await getNearbyStations(lat, lng)
      setNearby(data)
    } catch {
      setError('Не удалось получить ближайшие станции')
    }
  }, [])

  async function loadSchedule() {
  if (!selectedStation) {
    setError('Сначала выберите станцию')
    return
  }
  try {
    setError('')
    const data = await getStationSchedule(selectedStation.code, date)
    console.log('schedule data', data)
    setSchedule(data)
  } catch {
    setError('Не удалось загрузить расписание станции')
  }
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
            <h2>Ближайшие станции</h2>
            <p className="hint">Нажмите по карте, чтобы получить список станций рядом</p>
            <div className="list">
              {nearby.length ? nearby.map(st => (
                <button
                  key={st.code}
                  className={`list-item ${selectedStation?.code === st.code ? 'active' : ''}`}
                  onClick={() => setSelectedStation(st)}
                >
                  <span className="list-title">{st.title}</span>
                  <span className="list-subtitle">
                    {st.distance ? `${st.distance} км` : ''}
                  </span>
                </button>
              )) : <div className="empty">Список пуст. Кликните по карте.</div>}
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
            <button className="full-button" onClick={loadSchedule}>
              Показать расписание станции
            </button>
          </div>

          {error && <div className="error">{error}</div>}
        </section>

        <section className="panel map-panel">
          <MapView marker={marker} onMapClick={handleMapClick} />
        </section>

        <section className="panel results">
          {selectedStation ? (
            <div className="selected-box">
              <div className="selected-title">{selectedStation.title}</div>
              <div className="selected-subtitle">{selectedStation.code}</div>
            </div>
          ) : (
            <div className="selected-box">Станция не выбрана</div>
          )}

          {schedule ? (
  <>
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
  </>
) : (
  <div className="empty">Расписание не загружено</div>
)}
          
        </section>
      </main>
    </div>
  )
}

export default App