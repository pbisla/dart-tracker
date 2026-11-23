import type { DayKind } from '../types'

const MS_PER_MINUTE = 60_000
const MINUTES_PER_DAY = 24 * 60

interface CentralParts {
  hour: number
  minute: number
  second: number
  weekday: string
}

const centralFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  hour12: false,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function centralParts(date: Date): CentralParts {
  const parts = centralFormatter.formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '0'
  return {
    hour: Number(value('hour')) % 24,
    minute: Number(value('minute')),
    second: Number(value('second')),
    weekday: value('weekday'),
  }
}

/** Minutes since midnight, with a 03:00 rollover for overnight service. */
export function serviceMinutes(nowMinutes: number): number {
  return nowMinutes < 180 ? nowMinutes + MINUTES_PER_DAY : nowMinutes
}

export function dayKindForDate(date: Date): DayKind {
  const weekday = centralParts(date).weekday
  return weekday === 'Sun' || weekday === 'Sat' ? 'weekend' : 'weekday'
}

export function formatClock(minutes: number, includeSeconds = false): string {
  const totalSeconds = Math.max(0, Math.round(minutes * 60))
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minute = totalMinutes % 60
  const hour = Math.floor(totalMinutes / 60) % 24
  const hh = String(hour).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  return includeSeconds ? `${hh}:${mm}:${String(seconds).padStart(2, '0')}` : `${hh}:${mm}`
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return 'Due'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`
}

/** Current time in America/Chicago, expressed as minutes since midnight. */
export function dateToMinutes(date: Date): number {
  const parts = centralParts(date)
  return (
    parts.hour * 60 +
    parts.minute +
    parts.second / 60 +
    date.getMilliseconds() / MS_PER_MINUTE
  )
}
