import type { DayKind, LineId, ServiceWindow } from '../types'
import { headwayAt } from '../lib/time'

const LIGHT_RAIL_WEEKDAY: ServiceWindow = {
  start: 4 * 60 + 30,
  end: 25 * 60 + 30,
  headways: [
    { from: 0, to: 6, minutes: 40 },
    { from: 6, to: 9, minutes: 20 },
    { from: 9, to: 16, minutes: 30 },
    { from: 16, to: 19, minutes: 20 },
    { from: 19, to: 24, minutes: 30 },
  ],
}

const LIGHT_RAIL_WEEKEND: ServiceWindow = {
  start: 5 * 60,
  end: 25 * 60,
  headways: [
    { from: 0, to: 6, minutes: 40 },
    { from: 6, to: 20, minutes: 30 },
    { from: 20, to: 24, minutes: 40 },
  ],
}

const SILVER_WEEKDAY: ServiceWindow = {
  start: 5 * 60,
  end: 25 * 60,
  headways: [
    { from: 0, to: 5, minutes: 60 },
    { from: 5, to: 9, minutes: 30 },
    { from: 9, to: 15, minutes: 60 },
    { from: 15, to: 19, minutes: 30 },
    { from: 19, to: 24, minutes: 60 },
  ],
}

const SILVER_WEEKEND: ServiceWindow = {
  start: 5 * 60,
  end: 25 * 60,
  headways: [
    { from: 0, to: 5, minutes: 60 },
    { from: 5, to: 24, minutes: 60 },
  ],
}

export const SERVICE: Record<LineId, Record<DayKind, ServiceWindow>> = {
  red: { weekday: LIGHT_RAIL_WEEKDAY, weekend: LIGHT_RAIL_WEEKEND },
  blue: { weekday: LIGHT_RAIL_WEEKDAY, weekend: LIGHT_RAIL_WEEKEND },
  green: { weekday: LIGHT_RAIL_WEEKDAY, weekend: LIGHT_RAIL_WEEKEND },
  orange: { weekday: LIGHT_RAIL_WEEKDAY, weekend: LIGHT_RAIL_WEEKEND },
  silver: { weekday: SILVER_WEEKDAY, weekend: SILVER_WEEKEND },
}

export function serviceWindowFor(lineId: LineId, dayKind: DayKind): ServiceWindow {
  return SERVICE[lineId][dayKind]
}

export { headwayAt }
