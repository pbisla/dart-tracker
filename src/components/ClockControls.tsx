import type { DayKind } from '../types'

export interface ClockControlsProps {
  live: boolean
  playing: boolean
  speed: number
  minutes: number
  label: string
  dayKind: DayKind
  onToggleLive: () => void
  onTogglePlaying: () => void
  onSpeedChange: (speed: number) => void
  onScrub: (minutes: number) => void
  onDayKindChange: (dayKind: DayKind) => void
  onReset: () => void
}

const SPEEDS = [1, 60, 300, 900]

export function ClockControls({
  live,
  playing,
  speed,
  minutes,
  label,
  dayKind,
  onToggleLive,
  onTogglePlaying,
  onSpeedChange,
  onScrub,
  onDayKindChange,
  onReset,
}: ClockControlsProps) {
  return (
    <section className="header-clock" aria-label="Simulation clock">
      <div className="clock-display">
        <span className="clock-time">{label}</span>
        <span className="clock-zone">Central Time</span>
      </div>

      <div className="header-clock-controls">
        <span className={`status-pill ${live ? 'status-live' : 'status-sim'}`}>
          {live ? 'LIVE' : 'SIMULATED'}
        </span>

        <div className="button-row">
          <button
            type="button"
            className={live ? 'button button-active' : 'button'}
            onClick={onToggleLive}
          >
            {live ? 'Go manual' : 'Go live'}
          </button>
          <button type="button" className="button" onClick={onTogglePlaying}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" className="button" onClick={onReset}>
            Reset
          </button>
        </div>

        <div className="control-row">
          <label className="control-label" htmlFor="clock-speed">
            <span>Speed</span>
          </label>
          <select
            id="clock-speed"
            className="select"
            value={speed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
          >
            {SPEEDS.map((value) => (
              <option key={value} value={value}>
                {value === 1 ? '1× real time' : `${value}×`}
              </option>
            ))}
          </select>
        </div>

        <div className="segmented" role="group" aria-label="Service day">
          {(['weekday', 'weekend'] as DayKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              className={dayKind === kind ? 'segment segment-active' : 'segment'}
              aria-pressed={dayKind === kind}
              onClick={() => onDayKindChange(kind)}
            >
              {kind === 'weekday' ? 'Weekday' : 'Weekend'}
            </button>
          ))}
        </div>
      </div>

      <div className="header-clock-scrub">
        <label className="control-label" htmlFor="clock-scrubber">
          <span>Time of day</span>
          <span className="control-value">{formatScrubLabel(minutes)}</span>
        </label>
        <input
          id="clock-scrubber"
          className="scrubber"
          type="range"
          min={0}
          max={1439}
          step={1}
          value={Math.round(minutes) % 1440}
          onChange={(event) => onScrub(Number(event.target.value))}
        />
      </div>
    </section>
  )
}

function formatScrubLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24
  const minute = Math.floor(minutes % 60)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}
