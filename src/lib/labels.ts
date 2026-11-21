import { MAP_HEIGHT, MAP_WIDTH, STATIONS } from '../data/stations'
import type { LabelAnchor, Station } from '../types'

/**
 * Labels are placed once from the static station data. Text widths are measured
 * with the same font stack as the SVG, then a greedy pass followed by local
 * search chooses positions that avoid other labels, station nodes, and map edges.
 */

type TextAnchor = 'start' | 'middle' | 'end'

interface Candidate {
  dx: number
  dy: number
  anchor: TextAnchor
}

interface RankedCandidate extends Candidate {
  rank: number
}

interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

interface LabelEntry {
  station: Station
  width: number
  height: number
  nodeBox: Box
  candidates: RankedCandidate[]
}

export interface LabelPlacement {
  dx: number
  dy: number
  anchor: TextAnchor
  x: number
  y: number
  moved: boolean
  leader?: { x1: number; y1: number; x2: number; y2: number }
}

const PREFERRED: Record<LabelAnchor, Candidate> = {
  top: { dx: 0, dy: -17, anchor: 'middle' },
  bottom: { dx: 0, dy: 25, anchor: 'middle' },
  left: { dx: -16, dy: 5, anchor: 'end' },
  right: { dx: 16, dy: 5, anchor: 'start' },
}

const ALTERNATES: Candidate[] = [
  { dx: 20, dy: -24, anchor: 'start' },
  { dx: -20, dy: -24, anchor: 'end' },
  { dx: 20, dy: 30, anchor: 'start' },
  { dx: -20, dy: 30, anchor: 'end' },
  { dx: 0, dy: -36, anchor: 'middle' },
  { dx: 0, dy: 44, anchor: 'middle' },
  { dx: 42, dy: -42, anchor: 'start' },
  { dx: -42, dy: -42, anchor: 'end' },
  { dx: 42, dy: 48, anchor: 'start' },
  { dx: -42, dy: 48, anchor: 'end' },
  { dx: 70, dy: -55, anchor: 'start' },
  { dx: -70, dy: -55, anchor: 'end' },
  { dx: 70, dy: 58, anchor: 'start' },
  { dx: -70, dy: 58, anchor: 'end' },
  { dx: 0, dy: -56, anchor: 'middle' },
  { dx: 0, dy: 64, anchor: 'middle' },
  { dx: -90, dy: -8, anchor: 'end' },
  { dx: 90, dy: -8, anchor: 'start' },
  { dx: -90, dy: 18, anchor: 'end' },
  { dx: 90, dy: 18, anchor: 'start' },
]

const FONT_FAMILY =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

let measureContext: CanvasRenderingContext2D | null | undefined

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext !== undefined) return measureContext
  if (typeof document === 'undefined') {
    measureContext = null
    return null
  }
  const canvas = document.createElement('canvas')
  measureContext = canvas.getContext('2d')
  return measureContext
}

function estimateWidth(name: string, fontSize: number): number {
  let units = 0
  for (const character of name) {
    if ('il1.I'.includes(character)) units += 5
    else if ('MWmw'.includes(character)) units += 14
    else if (character === ' ') units += 5
    else units += 9.5
  }
  return ((units + 8) * fontSize) / 18
}

function measureLabel(station: Station): { width: number; height: number } {
  const isInterchange = station.lines.length > 1
  const fontSize = isInterchange ? 19 : 18
  const context = getMeasureContext()
  if (!context) return { width: estimateWidth(station.name, fontSize), height: fontSize * 1.32 }

  context.font = `${isInterchange ? 750 : 550} ${fontSize}px ${FONT_FAMILY}`
  return {
    width: context.measureText(station.name).width + 6,
    height: fontSize * 1.32,
  }
}

function makeNodeBox(station: Station): Box {
  const radius = station.lines.length > 1 ? 12 : 10
  return {
    left: station.x - radius,
    right: station.x + radius,
    top: station.y - radius,
    bottom: station.y + radius,
  }
}

function candidateBox(entry: LabelEntry, candidate: Candidate): Box {
  const { station, width, height } = entry
  const x = station.x + candidate.dx
  const y = station.y + candidate.dy
  const left =
    candidate.anchor === 'start' ? x : candidate.anchor === 'end' ? x - width : x - width / 2
  return {
    left,
    right: left + width,
    top: y - height * 0.78,
    bottom: y + height * 0.22,
  }
}

function overlapArea(a: Box, b: Box, padding = 0): number {
  const width = Math.min(a.right + padding, b.right + padding) - Math.max(a.left - padding, b.left - padding)
  const height = Math.min(a.bottom + padding, b.bottom + padding) - Math.max(a.top - padding, b.top - padding)
  return width > 0 && height > 0 ? width * height : 0
}

function outsideArea(box: Box): number {
  const left = Math.max(0, 6 - box.left)
  const right = Math.max(0, box.right - (MAP_WIDTH - 6))
  const top = Math.max(0, 6 - box.top)
  const bottom = Math.max(0, box.bottom - (MAP_HEIGHT - 6))
  return (left + right) * (box.bottom - box.top) + (top + bottom) * (box.right - box.left)
}

function preferenceCost(candidate: RankedCandidate): number {
  if (candidate.rank === 0) return 0
  return (
    8 +
    Math.log2(candidate.rank + 1) * 8 +
    Math.hypot(candidate.dx, candidate.dy) * 0.25 +
    (Math.hypot(candidate.dx, candidate.dy) > 34 ? 10 : 0)
  )
}

function layoutCost(
  entry: LabelEntry,
  candidate: RankedCandidate,
  entries: LabelEntry[],
  placements: Record<string, RankedCandidate>,
  activeIds: Set<string>,
): number {
  const box = candidateBox(entry, candidate)
  let labelOverlap = 0
  let nodeOverlap = 0

  for (const other of entries) {
    if (other.station.id === entry.station.id || !activeIds.has(other.station.id)) continue
    const otherPlacement = placements[other.station.id]
    if (!otherPlacement) continue
    labelOverlap += overlapArea(box, candidateBox(other, otherPlacement), 4)
    nodeOverlap += overlapArea(box, other.nodeBox, 2)
  }

  return labelOverlap * 2 + nodeOverlap * 12 + outsideArea(box) * 4 + preferenceCost(candidate)
}

function leaderFor(station: Station, candidate: Candidate): LabelPlacement['leader'] {
  const x = station.x + candidate.dx
  const y = station.y + candidate.dy
  const distance = Math.hypot(candidate.dx, candidate.dy)
  if (distance < 34) return undefined

  const x2 = candidate.anchor === 'start' ? x - 5 : candidate.anchor === 'end' ? x + 5 : x
  const y2 = candidate.dy > 0 ? y - 15 : y + 4
  const length = Math.hypot(x2 - station.x, y2 - station.y) || 1
  const nodeRadius = station.lines.length > 1 ? 11 : 9
  return {
    x1: station.x + ((x2 - station.x) / length) * nodeRadius,
    y1: station.y + ((y2 - station.y) / length) * nodeRadius,
    x2,
    y2,
  }
}

function buildEntries(): LabelEntry[] {
  return STATIONS.map((station) => {
    const { width, height } = measureLabel(station)
    const preferred = PREFERRED[station.label]
    const candidates = [preferred, ...ALTERNATES].map((candidate, rank): RankedCandidate => ({
      ...candidate,
      rank,
    }))
    return {
      station,
      width,
      height,
      nodeBox: makeNodeBox(station),
      candidates,
    }
  })
}

function solveLayout(entries: LabelEntry[]): Record<string, RankedCandidate> {
  const placements: Record<string, RankedCandidate> = {}
  const sorted = [...entries].sort(
    (a, b) => b.station.lines.length - a.station.lines.length || b.width - a.width,
  )

  // Start with a greedy placement so each station avoids the ones already placed.
  const placedIds = new Set<string>()
  for (const entry of sorted) {
    let best = entry.candidates[0]
    let bestCost = Number.POSITIVE_INFINITY
    for (const candidate of entry.candidates) {
      const cost = layoutCost(entry, candidate, entries, placements, placedIds)
      if (cost < bestCost) {
        bestCost = cost
        best = candidate
      }
    }
    placements[entry.station.id] = best
    placedIds.add(entry.station.id)
  }

  // Then let every label reconsider its position until no single move helps.
  const allIds = new Set(entries.map((entry) => entry.station.id))
  for (let pass = 0; pass < 12; pass++) {
    let changed = false
    for (const entry of sorted) {
      const current = placements[entry.station.id]
      const currentCost = layoutCost(entry, current, entries, placements, allIds)
      let best = current
      let bestCost = currentCost
      for (const candidate of entry.candidates) {
        if (candidate === current) continue
        const cost = layoutCost(entry, candidate, entries, placements, allIds)
        if (cost < bestCost - 0.5) {
          bestCost = cost
          best = candidate
        }
      }
      if (best !== current) {
        placements[entry.station.id] = best
        changed = true
      }
    }
    if (!changed) break
  }

  return placements
}

function buildLayout(): Record<string, LabelPlacement> {
  const entries = buildEntries()
  const placements = solveLayout(entries)
  const layout: Record<string, LabelPlacement> = {}

  for (const entry of entries) {
    const candidate = placements[entry.station.id]
    layout[entry.station.id] = {
      dx: candidate.dx,
      dy: candidate.dy,
      anchor: candidate.anchor,
      x: entry.station.x + candidate.dx,
      y: entry.station.y + candidate.dy,
      moved: candidate.rank !== 0,
      leader: leaderFor(entry.station, candidate),
    }
  }

  return layout
}

export const LABEL_LAYOUT = buildLayout()
