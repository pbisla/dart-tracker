import { GTFS_PATTERNS, GTFS_TRIPS } from '../data/gtfsSchedule'
import { LINE_BY_ID, LINES } from '../data/lines'
import { STATION_BY_ID } from '../data/stations'
import type { DayKind, LineId, Train } from '../types'
import { getCachedGeometry, getPatternPoints, pointBetweenStations } from './geometry'
import { formatClock, serviceMinutes } from './time'

interface ScheduledTrip {
  id: string
  patternId: string
  lineId: LineId
  direction: 1 | -1
  destination: string
  stationIds: string[]
  /** Arrival times in service minutes, aligned with `stationIds`. */
  minutes: number[]
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

const tripCache = new Map<string, ScheduledTrip[]>()

function tripsFor(lineId: LineId, dayKind: DayKind): ScheduledTrip[] {
  const key = `${lineId}-${dayKind}`
  const cached = tripCache.get(key)
  if (cached) return cached

  const trips = GTFS_TRIPS[lineId][dayKind].map((ref) => {
    const pattern = GTFS_PATTERNS[ref.patternId]
    return {
      id: ref.id,
      patternId: ref.patternId,
      lineId: pattern.lineId,
      direction: pattern.direction,
      destination: pattern.destination,
      stationIds: pattern.stationIds,
      minutes: pattern.offsets.map((offset) => ref.start + offset),
    }
  })
  tripCache.set(key, trips)
  return trips
}

function endpoint(lineId: LineId, direction: 1 | -1): string {
  const stationIds = LINE_BY_ID[lineId].stationIds
  const id = direction === 1 ? stationIds[stationIds.length - 1] : stationIds[0]
  return STATION_BY_ID[id]?.name ?? 'station'
}

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

export function getTrains(nowMinutes: number, dayKind: DayKind): Train[] {
  const now = serviceMinutes(nowMinutes)
  const trains: Train[] = []

  for (const line of LINES) {
    for (const trip of tripsFor(line.id, dayKind)) {
      const start = trip.minutes[0]
      const end = trip.minutes[trip.minutes.length - 1]
      if (now < start || now > end) continue

      let segment = 0
      while (segment < trip.minutes.length - 2 && trip.minutes[segment + 1] < now) segment += 1
      const fromTime = trip.minutes[segment]
      const toTime = trip.minutes[segment + 1]
      const segmentFraction = toTime > fromTime ? (now - fromTime) / (toTime - fromTime) : 0

      const geometry = getCachedGeometry(
        trip.patternId,
        getPatternPoints(trip.lineId, trip.stationIds, trip.direction),
      )
      const position = pointBetweenStations(geometry, segment, segment + 1, segmentFraction)

      trains.push({
        id: `gtfs-${trip.id}`,
        lineId: line.id,
        patternId: trip.patternId,
        departureTime: start,
        direction: trip.direction,
        x: position.x,
        y: position.y,
        angle: position.angle,
        progress: position.progress,
        fromStationId: trip.stationIds[segment],
        nextStationId: trip.stationIds[segment + 1],
        segmentFraction,
        etaMinutes: Math.max(0, toTime - now),
        destination: trip.destination,
        runMinutes: end - start,
        stationIds: trip.stationIds,
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
    for (const trip of tripsFor(line.id, dayKind)) {
      const index = trip.stationIds.indexOf(stationId)
      if (index === -1) continue
      const arrivalTime = trip.minutes[index]
      if (arrivalTime < now - 0.25) continue

      byDirection[trip.direction].push({
        lineId: line.id,
        direction: trip.direction,
        destination: trip.destination,
        minutes: arrivalTime - now,
        time: formatClock(arrivalTime),
      })
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
  if (!line.stationIds.includes(stationId)) return null

  const now = serviceMinutes(nowMinutes)
  const trips = tripsFor(lineId, dayKind)
  const stationTimes: number[] = []
  const perDirection: Record<1 | -1, { time: number; destination: string }[]> = { 1: [], [-1]: [] }

  for (const trip of trips) {
    const index = trip.stationIds.indexOf(stationId)
    if (index === -1) continue
    const time = trip.minutes[index]
    stationTimes.push(time)
    if (time >= now - 0.25) {
      perDirection[trip.direction].push({ time, destination: trip.destination })
    }
  }

  stationTimes.sort((a, b) => a - b)
  const upcoming = stationTimes.filter((time) => time >= now - 0.25 && time <= now + 120)
  const gaps = upcoming.slice(1).map((time, index) => time - upcoming[index])
  const headway = gaps.length
    ? `~${Math.round(median(gaps))} min at this hour`
    : stationTimes.length
      ? `${stationTimes.length} scheduled ${stationTimes.length === 1 ? 'trip' : 'trips'}`
      : 'No scheduled service'

  const directions = ([1, -1] as const).map((direction) => {
    const matches = perDirection[direction].sort((a, b) => a.time - b.time)
    return {
      direction,
      destination: mostCommon(matches.map((match) => match.destination)) ?? endpoint(lineId, direction),
      entries: matches.slice(0, count).map(({ time }) => ({
        time: formatClock(time),
        minutes: time - now,
      })),
    }
  })

  return {
    lineId,
    serviceWindow: stationTimes.length
      ? `${formatClock(stationTimes[0])} – ${formatClock(stationTimes[stationTimes.length - 1])}`
      : 'No service',
    headway,
    directions,
  }
}

export function getLineColor(lineId: LineId): string {
  return LINE_BY_ID[lineId].color
}

/** Stable selector for one timetabled run. */
export function trainKey(train: Pick<Train, 'id'>): string {
  return train.id
}
