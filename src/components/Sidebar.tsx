import type { CSSProperties } from 'react'
import { LINE_BY_ID, LINES } from '../data/lines'
import { STATION_BY_ID } from '../data/stations'
import type { Arrival, StationSchedule } from '../lib/simulation'
import { formatDuration } from '../lib/time'
import type { LineId, Station, Train } from '../types'

interface SidebarProps {
  visibleLines: Record<LineId, boolean>
  onToggleLine: (lineId: LineId) => void
  station: Station | null
  arrivals: Arrival[]
  trainCounts: Record<LineId, number>
  focusedTrain: Train | null
  onStartDemo: () => void
  scheduleLineId: LineId
  onScheduleLineChange: (lineId: LineId) => void
  schedule: StationSchedule | null
}

export function Sidebar({
  visibleLines,
  onToggleLine,
  station,
  arrivals,
  trainCounts,
  focusedTrain,
  onStartDemo,
  scheduleLineId,
  onScheduleLineChange,
  schedule,
}: SidebarProps) {
  const focusedLine = focusedTrain ? LINE_BY_ID[focusedTrain.lineId] : null
  const fromStation = focusedTrain ? STATION_BY_ID[focusedTrain.fromStationId] : null
  const nextStation = focusedTrain ? STATION_BY_ID[focusedTrain.nextStationId] : null

  return (
    <aside className="sidebar">
      <section className="panel tracker-panel" aria-labelledby="tracker-heading">
        <div className="panel-heading">
          <div>
            <h2 id="tracker-heading">Current position</h2>
            <p>Advances from its current position by route speed and direction. Click a train to follow it.</p>
          </div>
          <span className="tracker-live" aria-hidden="true" />
        </div>

        {focusedTrain && focusedLine ? (
          <>
            <div
              className="tracker-route"
              style={{ '--line-color': focusedLine.color } as CSSProperties}
            >
              <span className="tracker-line-name">{focusedLine.name}</span>
              <span className="tracker-destination">to {focusedTrain.destination}</span>
            </div>

            <div className="tracker-position">
              <span className="tracker-label">Now between</span>
              <strong>
                {fromStation?.name ?? 'station'} → {nextStation?.name ?? 'station'}
              </strong>
            </div>

            <div className="tracker-progress" aria-hidden="true">
              <span
                style={{
                  width: `${Math.round(focusedTrain.segmentFraction * 100)}%`,
                  background: focusedLine.color,
                }}
              />
            </div>

            <div className="tracker-next">
              <div>
                <span className="tracker-label">Next station</span>
                <strong>{nextStation?.name ?? 'station'}</strong>
              </div>
              <span className="tracker-next-eta">{formatDuration(focusedTrain.etaMinutes)}</span>
            </div>

            <button type="button" className="button tracker-demo" onClick={onStartDemo}>
              Animate train
            </button>
          </>
        ) : (
          <p className="empty-note">Click a train on the map to follow its current position.</p>
        )}
      </section>

      <section className="panel" aria-labelledby="lines-heading">
        <div className="panel-heading">
          <div>
            <h2 id="lines-heading">Lines</h2>
            <p>Tap to show or hide a route.</p>
          </div>
        </div>
        <div className="line-list">
          {LINES.map((line) => (
            <button
              key={line.id}
              type="button"
              className={`line-chip ${visibleLines[line.id] ? '' : 'line-chip-off'}`}
              style={{ '--line-color': line.color } as CSSProperties}
              aria-pressed={visibleLines[line.id]}
              onClick={() => onToggleLine(line.id)}
            >
              <span className="line-swatch" aria-hidden="true" />
              <span className="line-name">{line.name}</span>
              <span className="line-count">{trainCounts[line.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="station-heading">
        <div className="panel-heading">
          <div>
            <h2 id="station-heading">Next trains</h2>
            <p>
              {station
                ? 'Illustrative arrivals at the selected stop, split by direction.'
                : 'Select a station on the map.'}
            </p>
          </div>
        </div>

        {station ? (
          <>
            <div className="selected-station">
              <h3>{station.name}</h3>
              <div className="badge-row">
                {station.lines.map((lineId) => {
                  const line = LINES.find((item) => item.id === lineId)
                  if (!line) return null
                  return (
                    <span
                      key={lineId}
                      className="line-badge"
                      style={{ '--line-color': line.color } as CSSProperties}
                    >
                      {line.name.replace(' Line', '')}
                    </span>
                  )
                })}
              </div>
            </div>

            {arrivals.length > 0 ? (
              <div className="arrival-directions">
                {([1, -1] as const).map((direction) => {
                  const entries = arrivals.filter((arrival) => arrival.direction === direction)
                  const destinations = [...new Set(entries.map((arrival) => arrival.destination))]
                  return (
                    <section key={direction} className="arrival-direction">
                      <div className="arrival-direction-head">
                        <span className="arrival-direction-arrow" aria-hidden="true">
                          {direction === 1 ? '→' : '←'}
                        </span>
                        <div>
                          <strong>{direction === 1 ? 'Forward' : 'Reverse'}</strong>
                          <small>
                            {destinations.length > 0 ? destinations.join(' · ') : 'No upcoming trains'}
                          </small>
                        </div>
                      </div>

                      {entries.length > 0 ? (
                        <ul className="arrival-list">
                          {entries.map((arrival, index) => {
                            const line = LINES.find((item) => item.id === arrival.lineId)
                            return (
                              <li
                                key={`${direction}-${arrival.lineId}-${arrival.time}-${index}`}
                                className="arrival-row"
                              >
                                <span
                                  className="arrival-line"
                                  style={
                                    { '--line-color': line?.color ?? '#64748b' } as CSSProperties
                                  }
                                >
                                  {line?.name.replace(' Line', '') ?? arrival.lineId}
                                </span>
                                <span className="arrival-destination">{arrival.destination}</span>
                                <span className="arrival-eta">
                                  {arrival.minutes < 1 ? 'Due' : `${Math.round(arrival.minutes)} min`}
                                </span>
                                <span className="arrival-time">{arrival.time}</span>
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <p className="empty-note">No upcoming trains.</p>
                      )}
                    </section>
                  )
                })}
              </div>
            ) : (
              <p className="empty-note">No service in the visible lines right now.</p>
            )}
          </>
        ) : (
          <p className="empty-note">Choose any station to see simulated departures.</p>
        )}
      </section>

      <section className="panel schedule-panel" aria-labelledby="schedule-heading">
        <div className="panel-heading">
          <div>
            <h2 id="schedule-heading">Schedule · both directions</h2>
            <p>{station ? `Next departures from ${station.name}.` : 'Select a station to see a schedule.'}</p>
          </div>
        </div>

        {station ? (
          <>
            <div className="schedule-tabs" role="group" aria-label="Schedule line">
              {station.lines.map((lineId) => {
                const tabLine = LINE_BY_ID[lineId]
                return (
                  <button
                    key={lineId}
                    type="button"
                    className={lineId === scheduleLineId ? 'schedule-tab schedule-tab-active' : 'schedule-tab'}
                    style={{ '--line-color': tabLine.color } as CSSProperties}
                    aria-pressed={lineId === scheduleLineId}
                    onClick={() => onScheduleLineChange(lineId)}
                  >
                    {tabLine.name.replace(' Line', '')}
                  </button>
                )
              })}
            </div>

            {schedule ? (
              <>
                <div className="schedule-summary">
                  <span>{LINE_BY_ID[schedule.lineId].name}</span>
                  <span>{schedule.serviceWindow}</span>
                  <span>{schedule.headway}</span>
                </div>

                <div className="schedule-directions">
                  {schedule.directions.map((direction) => (
                    <div
                      key={direction.direction}
                      className="schedule-direction"
                      style={{ '--line-color': LINE_BY_ID[schedule.lineId].color } as CSSProperties}
                    >
                      <div className="schedule-direction-head">
                        <span className="schedule-arrow" aria-hidden="true">
                          {direction.direction === 1 ? '→' : '←'}
                        </span>
                        <div>
                          <strong>To {direction.destination}</strong>
                          <small>{direction.direction === 1 ? 'Forward' : 'Reverse'}</small>
                        </div>
                      </div>

                      {direction.entries.length > 0 ? (
                        <ol className="schedule-times">
                          {direction.entries.map((entry, index) => (
                            <li key={`${direction.direction}-${entry.time}-${index}`}>
                              <span className="schedule-time">{entry.time}</span>
                              <span className="schedule-eta">
                                {entry.minutes < 1 ? 'Due' : `${Math.round(entry.minutes)} min`}
                              </span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="empty-note">No more departures today.</p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="empty-note">That line does not serve this station.</p>
            )}
          </>
        ) : (
          <p className="empty-note">Choose any station to see both directions.</p>
        )}
      </section>

      <section className="panel note-panel">
        <h2>About this map</h2>
        <p>
          Routes, station names and service windows are static, best-effort reference data. Train
          positions and arrival times are calculated from the clock — this is <strong>not</strong>{' '}
          live DART tracking, a journey planner, or an official DART product.
        </p>
        <p className="note-small">
          Silver Line opened in October 2025. Schematic geometry is illustrative, not to scale. The
          Streets view uses OpenStreetMap road data.
        </p>
      </section>
    </aside>
  )
}
