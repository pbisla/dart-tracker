import { useEffect, useMemo, useState } from 'react'
import { ClockControls } from './components/ClockControls'
import type { ClockControlsProps } from './components/ClockControls'
import { GeoMap } from './components/GeoMap'
import { Sidebar } from './components/Sidebar'
import { TransitMap } from './components/TransitMap'
import { useVelocityMotion } from './hooks/useVelocityMotion'
import { LINES } from './data/lines'
import { STATION_BY_ID } from './data/stations'
import { getNextArrivals, getStationSchedule, getTrains, trainKey } from './lib/simulation'
import { dateToMinutes, dayKindForDate, formatClock } from './lib/time'
import type { DayKind, LineId } from './types'

const DEFAULT_MANUAL_MINUTES = 8 * 60 + 30
const TICK_MS = 200

function initialVisibility(): Record<LineId, boolean> {
  return Object.fromEntries(LINES.map((line) => [line.id, true])) as Record<LineId, boolean>
}

export default function App() {
  const [live, setLive] = useState(true)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(60)
  const [nowDate, setNowDate] = useState(() => new Date())
  const [manualMinutes, setManualMinutes] = useState(DEFAULT_MANUAL_MINUTES)
  const [dayKind, setDayKind] = useState<DayKind>(() => dayKindForDate(new Date()))
  const [visibleLines, setVisibleLines] = useState<Record<LineId, boolean>>(initialVisibility)
  const [selectedStationId, setSelectedStationId] = useState<string | null>('akard')
  const [focusedTrainKey, setFocusedTrainKey] = useState<string | null>(null)
  const [mapMode, setMapMode] = useState<'schematic' | 'streets'>('schematic')
  const [scheduleLineId, setScheduleLineId] = useState<LineId | null>(null)

  useEffect(() => {
    if (!playing) return
    const interval = window.setInterval(() => {
      if (live) {
        const date = new Date()
        setNowDate(date)
        setDayKind(dayKindForDate(date))
      } else {
        setManualMinutes((minutes) => (minutes + (speed * TICK_MS) / 60_000) % (24 * 60))
      }
    }, TICK_MS)
    return () => window.clearInterval(interval)
  }, [live, playing, speed])

  const clockMinutes = live ? dateToMinutes(nowDate) : manualMinutes
  const clockLabel = formatClock(clockMinutes, live)

  const trains = useMemo(() => getTrains(clockMinutes, dayKind), [clockMinutes, dayKind])
  const visibleTrains = useMemo(
    () => trains.filter((train) => visibleLines[train.lineId]),
    [trains, visibleLines],
  )
  const focusedTrain = useMemo(
    () => visibleTrains.find((train) => trainKey(train) === focusedTrainKey) ?? null,
    [visibleTrains, focusedTrainKey],
  )
  const motionTrain = useVelocityMotion(focusedTrain, live ? 1 : speed)
  const renderTrains = useMemo(() => {
    if (!motionTrain) return visibleTrains
    const motionKey = trainKey(motionTrain)
    return visibleTrains.map((train) => (trainKey(train) === motionKey ? motionTrain : train))
  }, [visibleTrains, motionTrain])
  const trainCounts = useMemo(() => {
    const counts = Object.fromEntries(LINES.map((line) => [line.id, 0])) as Record<LineId, number>
    for (const train of trains) counts[train.lineId] += 1
    return counts
  }, [trains])

  const arrivals = useMemo(
    () =>
      selectedStationId
        ? getNextArrivals(selectedStationId, clockMinutes, dayKind, visibleLines)
        : [],
    [selectedStationId, clockMinutes, dayKind, visibleLines],
  )

  const selectedStation = selectedStationId ? STATION_BY_ID[selectedStationId] ?? null : null
  const scheduleLine: LineId =
    scheduleLineId ??
    (selectedStation && focusedTrain && selectedStation.lines.includes(focusedTrain.lineId)
      ? focusedTrain.lineId
      : selectedStation?.lines[0] ?? focusedTrain?.lineId ?? 'silver')
  const schedule = useMemo(
    () =>
      selectedStation ? getStationSchedule(selectedStation.id, scheduleLine, clockMinutes, dayKind) : null,
    [selectedStation, scheduleLine, clockMinutes, dayKind],
  )

  const selectStation = (stationId: string) => {
    setSelectedStationId(stationId)
    setFocusedTrainKey(null)
    setScheduleLineId(null)
  }

  const toggleLive = () => {
    if (live) {
      setManualMinutes(clockMinutes)
      setLive(false)
    } else {
      setLive(true)
      setPlaying(true)
    }
  }

  const scrubClock = (minutes: number) => {
    setLive(false)
    setPlaying(false)
    setManualMinutes(minutes)
  }

  const changeDayKind = (kind: DayKind) => {
    if (kind === dayKind) return
    if (live) {
      setManualMinutes(clockMinutes)
      setLive(false)
    }
    setDayKind(kind)
  }

  const resetClock = () => {
    setLive(false)
    setPlaying(false)
    setManualMinutes(DEFAULT_MANUAL_MINUTES)
    setDayKind('weekday')
  }

  const startDemo = () => {
    setLive(false)
    setDayKind('weekday')
    setManualMinutes(DEFAULT_MANUAL_MINUTES)
    setSpeed(300)
    setPlaying(true)
  }

  const clockProps: ClockControlsProps = {
    live,
    playing,
    speed,
    minutes: clockMinutes,
    label: clockLabel,
    dayKind,
    onToggleLive: toggleLive,
    onTogglePlaying: () => setPlaying((value) => !value),
    onSpeedChange: setSpeed,
    onScrub: scrubClock,
    onDayKindChange: changeDayKind,
    onReset: resetClock,
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            D
          </div>
          <div>
            <h1>DART Rail Tracker</h1>
            <p>Red · Blue · Green · Orange · Silver</p>
          </div>
        </div>
        <ClockControls {...clockProps} />

        <div className="topbar-note">
          <span className="topbar-dot" aria-hidden="true" />
          Static simulation — not live tracking
        </div>
      </header>

      <main className="layout">
        <section className="map-card" aria-label="Rail map">
          <div className="map-toolbar">
            <div className="segmented map-mode" role="group" aria-label="Map style">
              <button
                type="button"
                className={mapMode === 'schematic' ? 'segment segment-active' : 'segment'}
                aria-pressed={mapMode === 'schematic'}
                onClick={() => setMapMode('schematic')}
              >
                Schematic
              </button>
              <button
                type="button"
                className={mapMode === 'streets' ? 'segment segment-active' : 'segment'}
                aria-pressed={mapMode === 'streets'}
                onClick={() => setMapMode('streets')}
              >
                Streets
              </button>
            </div>
            <span className="map-toolbar-note">
              {mapMode === 'schematic'
                ? 'Traditional transit diagram'
                : 'OpenStreetMap road view'}
            </span>
          </div>

          {mapMode === 'schematic' ? (
            <TransitMap
              visibleLines={visibleLines}
              trains={renderTrains}
              selectedStationId={selectedStationId}
              onSelectStation={selectStation}
              selectedTrainKey={focusedTrainKey}
              onSelectTrain={setFocusedTrainKey}
            />
          ) : (
            <GeoMap
              visibleLines={visibleLines}
              trains={renderTrains}
              selectedStationId={selectedStationId}
              onSelectStation={selectStation}
              selectedTrainKey={focusedTrainKey}
              onSelectTrain={setFocusedTrainKey}
            />
          )}
        </section>

        <Sidebar
          visibleLines={visibleLines}
          onToggleLine={(lineId) =>
            setVisibleLines((current) => ({ ...current, [lineId]: !current[lineId] }))
          }
          station={selectedStation}
          arrivals={arrivals}
          trainCounts={trainCounts}
          focusedTrain={motionTrain}
          onStartDemo={startDemo}
          scheduleLineId={scheduleLine}
          onScheduleLineChange={setScheduleLineId}
          schedule={schedule}
        />
      </main>

      <footer className="footer">
        <span>
          Train positions interpolate between DART GTFS scheduled stops. Not live tracking or
          navigation-grade data.
        </span>
        <span>Schedules: DART static GTFS (mdb-152). Schematic layout is hand-authored.</span>
      </footer>
    </div>
  )
}
