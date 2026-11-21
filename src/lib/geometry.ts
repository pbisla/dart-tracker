import { LINE_BY_ID } from '../data/lines'
import { STATION_BY_ID } from '../data/stations'
import type { LineId, Point } from '../types'

interface LineGeometry {
  points: Point[]
  cumulative: number[]
  total: number
}

const cache = new Map<string, LineGeometry>()

function normalize(vector: Point): Point {
  const length = Math.hypot(vector.x, vector.y)
  return length === 0 ? { x: 0, y: 0 } : { x: vector.x / length, y: vector.y / length }
}

function normal(vector: Point): Point {
  return { x: -vector.y, y: vector.x }
}

function add(point: Point, vector: Point): Point {
  return { x: point.x + vector.x, y: point.y + vector.y }
}

/** Offset a polyline to one side, using mitred joins where segments meet. */
export function offsetPolyline(points: Point[], offset: number): Point[] {
  if (offset === 0 || points.length < 2) return points

  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)]
    const next = points[Math.min(points.length - 1, index + 1)]

    if (index === 0) {
      return add(point, scale(normal(normalize({ x: next.x - point.x, y: next.y - point.y })), offset))
    }
    if (index === points.length - 1) {
      return add(point, scale(normal(normalize({ x: point.x - previous.x, y: point.y - previous.y })), offset))
    }

    const incoming = normalize({ x: point.x - previous.x, y: point.y - previous.y })
    const outgoing = normalize({ x: next.x - point.x, y: next.y - point.y })
    const n1 = normal(incoming)
    const n2 = normal(outgoing)
    const bisector = normalize({ x: n1.x + n2.x, y: n1.y + n2.y })
    const denominator = bisector.x * n1.x + bisector.y * n1.y
    const magnitude = Math.abs(denominator) < 0.01 ? offset : offset / denominator
    const clamped = Math.max(-Math.abs(offset) * 4, Math.min(Math.abs(offset) * 4, magnitude))
    return add(point, scale(bisector, clamped))
  })
}

function scale(vector: Point, factor: number): Point {
  return { x: vector.x * factor, y: vector.y * factor }
}

/** SVG path data with short rounded corners at each bend. */
export function buildRoundedPath(points: Point[], radius = 18): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${round(points[0].x)} ${round(points[0].y)}`

  const commands: string[] = [`M ${round(points[0].x)} ${round(points[0].y)}`]

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const next = points[index + 1]
    const incoming = normalize({ x: current.x - previous.x, y: current.y - previous.y })
    const outgoing = normalize({ x: next.x - current.x, y: next.y - current.y })
    const incomingLength = Math.hypot(current.x - previous.x, current.y - previous.y)
    const outgoingLength = Math.hypot(next.x - current.x, next.y - current.y)
    const cut = Math.min(radius, incomingLength / 2, outgoingLength / 2)
    const before = add(current, scale(incoming, -cut))
    const after = add(current, scale(outgoing, cut))
    commands.push(`L ${round(before.x)} ${round(before.y)}`)
    commands.push(`Q ${round(current.x)} ${round(current.y)} ${round(after.x)} ${round(after.y)}`)
  }

  const last = points[points.length - 1]
  commands.push(`L ${round(last.x)} ${round(last.y)}`)
  return commands.join(' ')
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

export function getLinePoints(lineId: LineId): Point[] {
  const line = LINE_BY_ID[lineId]
  return offsetPolyline(
    line.stationIds.map((id) => STATION_BY_ID[id]).filter(Boolean),
    line.offset,
  )
}

export function reversePoints(points: Point[]): Point[] {
  return [...points].reverse()
}

export function getLineGeometry(points: Point[]): LineGeometry {
  const cumulative = [0]
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(
      cumulative[index - 1] + Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y),
    )
  }
  return { points, cumulative, total: cumulative[cumulative.length - 1] ?? 0 }
}

export function getCachedGeometry(key: string, points: Point[]): LineGeometry {
  let geometry = cache.get(key)
  if (!geometry) {
    geometry = getLineGeometry(points)
    cache.set(key, geometry)
  }
  return geometry
}

export interface PositionOnLine extends Point {
  angle: number
}

export function pointAtDistance(geometry: LineGeometry, distance: number): PositionOnLine {
  const { points, cumulative, total } = geometry
  if (points.length === 0) return { x: 0, y: 0, angle: 0 }
  if (points.length === 1 || total === 0) return { ...points[0], angle: 0 }

  const clamped = Math.max(0, Math.min(total, distance))
  let segment = 0
  while (segment < cumulative.length - 2 && cumulative[segment + 1] < clamped) segment += 1

  const start = points[segment]
  const end = points[segment + 1]
  const segmentLength = cumulative[segment + 1] - cumulative[segment]
  const ratio = segmentLength === 0 ? 0 : (clamped - cumulative[segment]) / segmentLength
  const angle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI

  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
    angle,
  }
}
