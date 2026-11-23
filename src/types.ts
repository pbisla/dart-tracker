export type LineId = 'red' | 'blue' | 'green' | 'orange' | 'silver'

export type LabelAnchor = 'top' | 'bottom' | 'left' | 'right'

export interface Point {
  x: number
  y: number
}

export interface LatLng {
  lat: number
  lng: number
}

export interface Station extends Point, LatLng {
  id: string
  name: string
  label: LabelAnchor
  lines: LineId[]
}

export interface Line {
  id: LineId
  name: string
  color: string
  /** Ordered from one terminus to the other. */
  stationIds: string[]
  /** Parallel-track offset in schematic units, perpendicular to this line's travel direction. */
  offset: number
}

export type DayKind = 'weekday' | 'weekend'

export interface Train {
  id: string
  lineId: LineId
  patternId: string
  /** Scheduled departure time in service minutes; stable for this run. */
  departureTime: number
  direction: 1 | -1
  x: number
  y: number
  angle: number
  /** Fraction of the full route completed, 0–1. */
  progress: number
  fromStationId: string
  nextStationId: string
  /** Fraction of the way from `fromStationId` to `nextStationId`, 0–1. */
  segmentFraction: number
  etaMinutes: number
  destination: string
  /** Duration of this scheduled trip, in minutes. */
  runMinutes: number
  /** Stations this scheduled trip serves, in travel order. */
  stationIds: string[]
}
