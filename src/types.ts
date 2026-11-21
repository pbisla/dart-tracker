export type LineId = 'red' | 'blue' | 'green' | 'orange' | 'silver'

export type LabelAnchor = 'top' | 'bottom' | 'left' | 'right'

export interface Point {
  x: number
  y: number
}

export interface Station extends Point {
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

export interface HeadwayBand {
  /** Start hour, e.g. 5 for 05:00. */
  from: number
  /** End hour (exclusive), e.g. 9 for 09:00. */
  to: number
  minutes: number
}

export interface ServiceWindow {
  /** Minutes since midnight, may be less than `start` for overnight service. */
  start: number
  /** Minutes since midnight on the following day (e.g. 25 * 60 = 01:00). */
  end: number
  headways: HeadwayBand[]
}

export interface ServicePattern {
  id: string
  lineId: LineId
  label: string
  stationIds: string[]
  /** Estimated end-to-end run time in minutes. */
  totalMinutes: number
  weekday: ServiceWindow
  weekend: ServiceWindow
}

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
}
