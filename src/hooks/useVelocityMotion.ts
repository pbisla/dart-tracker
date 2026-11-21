import { useEffect, useMemo, useRef, useState } from 'react'
import { LINE_BY_ID } from '../data/lines'
import { getCachedGeometry, getLinePoints, pointAtDistance, reversePoints } from '../lib/geometry'
import { getLineRunMinutes, trainKey } from '../lib/simulation'
import type { Train } from '../types'

interface MotionState {
  key: string
  distance: number
}

function geometryFor(train: Train) {
  const points = getLinePoints(train.lineId)
  const directedPoints = train.direction === 1 ? points : reversePoints(points)
  return getCachedGeometry(`${train.lineId}-${train.direction}-motion`, directedPoints)
}

/**
 * Moves the displayed train from its current position toward the timetable target
 * at a speed derived from the route length and run time. Scrubs and clock changes
 * are therefore followed smoothly instead of teleporting.
 */
export function useVelocityMotion(train: Train | null, speedMultiplier: number): Train | null {
  const [distance, setDistance] = useState<number | null>(null)
  const stateRef = useRef<MotionState | null>(null)
  const targetRef = useRef<Train | null>(train)
  targetRef.current = train

  useEffect(() => {
    if (!train) {
      stateRef.current = null
      setDistance(null)
      return
    }
    const key = trainKey(train)
    const geometry = geometryFor(train)
    if (stateRef.current?.key !== key) {
      stateRef.current = { key, distance: train.progress * geometry.total }
      setDistance(stateRef.current.distance)
    }
  }, [train?.id, train?.lineId, train?.direction])

  useEffect(() => {
    if (!train) return
    const geometry = geometryFor(train)
    const unitsPerMinute = geometry.total / getLineRunMinutes(train.lineId)
    let frame = 0
    let last = performance.now()

    const step = (now: number) => {
      const deltaMs = Math.min(now - last, 100)
      last = now
      const state = stateRef.current
      const target = targetRef.current

      if (state && target && trainKey(target) === state.key) {
        const targetDistance = Math.max(
          0,
          Math.min(geometry.total, target.progress * geometry.total),
        )
        const maxStep = (unitsPerMinute * speedMultiplier * deltaMs) / 60_000
        const delta = targetDistance - state.distance
        const before = state.distance

        if (Math.abs(delta) <= maxStep) state.distance = targetDistance
        else state.distance += Math.sign(delta) * maxStep

        if (Math.abs(state.distance - before) > 0.01) setDistance(state.distance)
      }

      frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [train?.lineId, train?.direction, speedMultiplier])

  return useMemo(() => {
    if (!train) return null
    const state = stateRef.current
    if (!state || state.key !== trainKey(train) || distance === null) return train

    const geometry = geometryFor(train)
    const clamped = Math.max(0, Math.min(geometry.total, distance))
    const position = pointAtDistance(geometry, clamped)
    const progress = geometry.total === 0 ? 0 : clamped / geometry.total

    const line = LINE_BY_ID[train.lineId]
    const segments = Math.max(0, line.stationIds.length - 1)
    const raw = Math.min(segments, progress * segments)
    const previous = segments === 0 ? 0 : Math.min(segments - 1, Math.floor(raw))
    const next = previous + 1
    const segmentFraction = segments === 0 ? 0 : Math.min(1, raw - previous)
    const fromIndex = train.direction === 1 ? previous : segments - previous
    const nextIndex = train.direction === 1 ? next : segments - next
    const etaMinutes =
      segments === 0 ? 0 : Math.max(0, (next - raw) * (getLineRunMinutes(train.lineId) / segments))

    return {
      ...train,
      x: position.x,
      y: position.y,
      angle: position.angle,
      progress,
      fromStationId: line.stationIds[fromIndex] ?? line.stationIds[0],
      nextStationId: line.stationIds[nextIndex] ?? line.stationIds[0],
      segmentFraction,
      etaMinutes,
    }
  }, [train, distance])
}
