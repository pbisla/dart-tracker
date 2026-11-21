import { STATION_BY_ID } from '../data/stations'
import type { LatLng, Train } from '../types'

const toRadians = (degrees: number) => (degrees * Math.PI) / 180
const toDegrees = (radians: number) => (radians * 180) / Math.PI

/** Interpolates a train's position between its current and next station. */
export function trainLatLng(train: Train): LatLng {
  const from = STATION_BY_ID[train.fromStationId]
  const to = STATION_BY_ID[train.nextStationId]
  if (!from || !to) return { lat: 32.78, lng: -96.8 }

  const fraction = Math.max(0, Math.min(1, train.segmentFraction))
  return {
    lat: from.lat + (to.lat - from.lat) * fraction,
    lng: from.lng + (to.lng - from.lng) * fraction,
  }
}

/** Compass bearing in degrees, used to rotate the train marker. */
export function trainBearing(train: Train): number {
  const from = STATION_BY_ID[train.fromStationId]
  const to = STATION_BY_ID[train.nextStationId]
  if (!from || !to) return 0

  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const deltaLng = toRadians(to.lng - from.lng)
  const y = Math.sin(deltaLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng)
  return (toDegrees(Math.atan2(y, x)) + 360) % 360
}
