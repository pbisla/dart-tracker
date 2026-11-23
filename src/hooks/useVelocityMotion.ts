import { useEffect, useMemo, useRef, useState } from 'react'
import { getCachedGeometry, getPatternPoints, pointAtDistance } from '../lib/geometry'
import { trainKey } from '../lib/simulation'
import type { Train } from '../types'

interface MotionState {
  key: string
  distance: number
}

function geometryFor(train: Train) {
  return getCachedGeometry(
    train.patternId,
    getPatternPoints(train.lineId, train.stationIds, train.direction),
  )
}

/**
 * Eases the displayed train toward its timetable position so clock changes look
 * like movement instead of teleporting. Arrival details stay from the target.
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
    if (stateRef.current?.key !== key) {
      stateRef.current = { key, distance: train.progress * geometryFor(train).total }
      setDistance(stateRef.current.distance)
    }
  }, [train?.id])

  useEffect(() => {
    if (!train) return
    const geometry = geometryFor(train)
    const unitsPerMinute = geometry.total / Math.max(train.runMinutes, 1)
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
  }, [train?.patternId, speedMultiplier])

  return useMemo(() => {
    if (!train) return null
    const state = stateRef.current
    if (!state || state.key !== trainKey(train) || distance === null) return train

    const geometry = geometryFor(train)
    const position = pointAtDistance(geometry, distance)
    return {
      ...train,
      x: position.x,
      y: position.y,
      angle: position.angle,
      progress: position.progress,
    }
  }, [train, distance])
}
