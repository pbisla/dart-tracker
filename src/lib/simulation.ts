import { LINE_BY_ID, LINES } from '../data/lines'
import { serviceWindowFor } from '../data/service'
import { STATION_BY_ID } from '../data/stations'
import type { DayKind, LineId, ServicePattern, Train } from '../types'
import { getCachedGeometry, getLinePoints, pointAtDistance, reversePoints } from './geometry'
import { formatClock, headwayAt, serviceMinutes } from './time'

interface Departure {
  time: number
  direction: 1 | -1
}

export interface Arrival {
  lineId: LineId
  /** Direction of travel along the line's station order. */
  direction: 1 | -1
  destination: string
  minutes: number
  time: string
}

export interface ScheduleEntry {
  time: string
  minutes: number
}

export interface ScheduleDirection {
  direction: 1 | -1
  destination: string
  entries: ScheduleEntry[]
}

export interface StationSchedule {
  lineId: LineId
  serviceWindow: string
  headway: string
  directions: ScheduleDirection[]
}

const PATTERNS: Record<LineId, ServicePattern> = Object.fromEntries(
  LINES.map((line) => {
    const totalMinutes = line.id === 'silver' ? 55 : Math.round((line.stationIds.length - 1) * 2.6)
    const weekday = serviceWindowFor(line.id, 'weekday')
    const weekend = serviceWindowFor(line.id, 'weekend')
    return [
      line.id,
      {
        id: `${line.id}-full`,
        lineId: line.id,
        label: `Full route · ${line.stationIds.length} stops`,
        stationIds: line.stationIds,
        totalMinutes,
        weekday,
        weekend,
      },
    ]
  }),
) as Record<LineId, ServicePattern>

const departureCache = new Map<string, Departure[]>()

function departuresFor(lineId: LineId, dayKind: DayKind): Departure[] {
  const key = `${lineId}-${dayKind}`
  const cached = departureCache.get(key)
  if (cached) return cached

  const window = serviceWindowFor(lineId, dayKind)
  const result: Departure[] = []
  for (const direction of [1, -1] as const) {
    const initialHeadway = headwayAt(window, window.start)
    const phase = direction === 1 ? 0 : Math.round(initialHeadway / 2)
    let time = window.start + phase
    while (time < window.end) {
      result.push({ time, direction })
      time += headwayAt(window, time)
    }
  }
  result.sort((a, b) => a.time - b.time)
  departureCache.set(key, result)
  return result
}

export function getLineRunMinutes(lineId: LineId): number {
  return PATTERNS[lineId].totalMinutes
}

export function getTrains(nowMinutes: number, dayKind: DayKind): Train[] {
  const now = serviceMinutes(nowMinutes)
  const trains: Train[] = []

  for (const line of LINES) {
    const pattern = PATTERNS[line.id]
    const points = getLinePoints(line.id)
    const forward = getCachedGeometry(`${line.id}-forward`, points)
    const backward = getCachedGeometry(`${line.id}-backward`, reversePoints(points))
    const stopSegments = line.stationIds.length - 1
    const firstStation = STATION_BY_ID[line.stationIds[0]]
    const lastStation = STATION_BY_ID[line.stationIds[line.stationIds.length - 1]]

    for (const departure of departuresFor(line.id, dayKind)) {
      const elapsed = now - departure.time
      if (elapsed < 0 || elapsed > pattern.totalMinutes) continue

      const progress = elapsed / pattern.totalMinutes
      const geometry = departure.direction === 1 ? forward : backward
      const position = pointAtDistance(geometry, progress * geometry.total)

      const rawSegment = Math.min(stopSegments, progress * stopSegments)
      const previousSegment = Math.min(stopSegments - 1, Math.floor(rawSegment))
      const nextSegment = previousSegment + 1
      const segmentFraction = stopSegments === 0 ? 0 : Math.min(1, rawSegment - previousSegment)
      const fromIndex =
        departure.direction === 1 ? previousSegment : stopSegments - previousSegment
      const nextIndex = departure.direction === 1 ? nextSegment : stopSegments - nextSegment
      const etaMinutes =
        progress >= 1 ? 0 : (nextSegment / stopSegments - progress) * pattern.totalMinutes

      trains.push({
        id: `${pattern.id}-${departure.direction}-${departure.time}`,
        lineId: line.id,
        patternId: pattern.id,
        departureTime: departure.time,
        direction: departure.direction,
        x: position.x,
        y: position.y,
        angle: position.angle,
        progress,
        fromStationId: line.stationIds[fromIndex] ?? line.stationIds[0],
        nextStationId: line.stationIds[nextIndex] ?? line.stationIds[0],
        segmentFraction,
        etaMinutes,
        destination: departure.direction === 1 ? lastStation.name : firstStation.name,
      })
    }
  }

  return trains.sort((a, b) => a.lineId.localeCompare(b.lineId) || a.etaMinutes - b.etaMinutes)
}

export function getNextArrivals(
  stationId: string,
  nowMinutes: number,
  dayKind: DayKind,
  visibleLines?: Record<LineId, boolean>,
  count = 5,
): Arrival[] {
  const now = serviceMinutes(nowMinutes)
  const byDirection: Record<1 | -1, Arrival[]> = { 1: [], [-1]: [] }

  for (const line of LINES) {
    if (visibleLines && !visibleLines[line.id]) continue
    const index = line.stationIds.indexOf(stationId)
    if (index === -1) continue

    const pattern = PATTERNS[line.id]
    const segments = line.stationIds.length - 1
    const firstStation = STATION_BY_ID[line.stationIds[0]]
    const lastStation = STATION_BY_ID[line.stationIds[line.stationIds.length - 1]]

    for (const direction of [1, -1] as const) {
      const fraction = direction === 1 ? index / segments : (segments - index) / segments
      for (const departure of departuresFor(line.id, dayKind)) {
        if (departure.direction !== direction) continue
        const arrivalTime = departure.time + fraction * pattern.totalMinutes
        if (arrivalTime < now - 0.25) continue

        byDirection[direction].push({
          lineId: line.id,
          direction,
          destination: direction === 1 ? lastStation.name : firstStation.name,
          minutes: arrivalTime - now,
          time: formatClock(arrivalTime),
        })
      }
    }
  }

  return ([1, -1] as const)
    .flatMap((direction) =>
      byDirection[direction].sort((a, b) => a.minutes - b.minutes).slice(0, count),
    )
    .sort((a, b) => a.minutes - b.minutes)
}

/** Next departures from a station, grouped by travel direction. */
export function getStationSchedule(
  stationId: string,
  lineId: LineId,
  nowMinutes: number,
  dayKind: DayKind,
  count = 4,
): StationSchedule | null {
  const line = LINE_BY_ID[lineId]
  const index = line.stationIds.indexOf(stationId)
  if (index === -1) return null

  const pattern = PATTERNS[lineId]
  const window = serviceWindowFor(lineId, dayKind)
  const now = serviceMinutes(nowMinutes)
  const segments = line.stationIds.length - 1
  const firstStation = STATION_BY_ID[line.stationIds[0]]
  const lastStation = STATION_BY_ID[line.stationIds[line.stationIds.length - 1]]

  const directions = ([1, -1] as const).map((direction) => {
    const fraction = direction === 1 ? index / segments : (segments - index) / segments
    const entries = departuresFor(lineId, dayKind)
      .filter((departure) => departure.direction === direction)
      .map((departure) => departure.time + fraction * pattern.totalMinutes)
      .filter((time) => time >= now - 0.25)
      .slice(0, count)
      .map((time) => ({ time: formatClock(time), minutes: time - now }))

    return {
      direction,
      destination: direction === 1 ? lastStation.name : firstStation.name,
      entries,
    }
  })

  return {
    lineId,
    serviceWindow: `${formatClock(window.start)} – ${formatClock(window.end)}`,
    headway: `Every ${headwayAt(window, now)} min at this hour`,
    directions,
  }
}

export function getLineColor(lineId: LineId): string {
  return LINE_BY_ID[lineId].color
}

/** Stable selector for one run, unique even when several trains share a line/direction. */
export function trainKey(train: Pick<Train, 'lineId' | 'direction' | 'departureTime'>): string {
  return `${train.lineId}-${train.direction}-${train.departureTime}`
}
