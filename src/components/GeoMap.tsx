import { Fragment, useEffect, useMemo } from 'react'
import L, { type LeafletMouseEvent } from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { LINE_BY_ID, LINES } from '../data/lines'
import { STATIONS, STATION_BY_ID } from '../data/stations'
import { trainBearing, trainLatLng } from '../lib/geo'
import { trainKey } from '../lib/simulation'
import type { LineId, Train } from '../types'
import 'leaflet/dist/leaflet.css'

interface GeoMapProps {
  visibleLines: Record<LineId, boolean>
  trains: Train[]
  selectedStationId: string | null
  onSelectStation: (stationId: string) => void
  selectedTrainKey: string | null
  onSelectTrain: (key: string | null) => void
}

type LatLngTuple = [number, number]

const ROUTE_POINTS = Object.fromEntries(
  LINES.map((line) => [
    line.id,
    line.stationIds
      .map((id) => STATION_BY_ID[id])
      .filter(Boolean)
      .map((station) => [station.lat, station.lng] as LatLngTuple),
  ]),
) as Record<LineId, LatLngTuple[]>

const ALL_POINTS = STATIONS.map((station) => [station.lat, station.lng] as LatLngTuple)

const CENTER: LatLngTuple = [
  (32.65 + 33.04) / 2,
  (-97.06 + -96.56) / 2,
]

function FitBounds() {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(L.latLngBounds(ALL_POINTS), {
      padding: [24, 24],
      maxZoom: 12,
    })
  }, [map])
  return null
}

function BackgroundClick({ onClick }: { onClick: () => void }) {
  useMapEvents({ click: onClick })
  return null
}

export function GeoMap({
  visibleLines,
  trains,
  selectedStationId,
  onSelectStation,
  selectedTrainKey,
  onSelectTrain,
}: GeoMapProps) {
  const visibleRoutes = useMemo(
    () => LINES.filter((line) => visibleLines[line.id]),
    [visibleLines],
  )
  const selectedTrain = trains.find((train) => trainKey(train) === selectedTrainKey)
  const nextStationId = selectedTrain?.nextStationId
  const nextStationColor = selectedTrain ? LINE_BY_ID[selectedTrain.lineId].color : undefined

  const stop = (event: LeafletMouseEvent) => {
    L.DomEvent.stopPropagation(event.originalEvent)
  }

  return (
    <div className="geo-map">
      <MapContainer
        center={CENTER}
        zoom={10}
        minZoom={9}
        maxZoom={17}
        scrollWheelZoom
        zoomControl
        className="geo-leaflet"
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="geo-tiles"
        />

        <FitBounds />
        <BackgroundClick onClick={() => onSelectTrain(null)} />

        {visibleRoutes.map((line) => (
          <Polyline
            key={`${line.id}-casing`}
            positions={ROUTE_POINTS[line.id]}
            pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.95, lineCap: 'round' }}
            interactive={false}
          />
        ))}

        {visibleRoutes.map((line) => (
          <Polyline
            key={line.id}
            positions={ROUTE_POINTS[line.id]}
            pathOptions={{ color: line.color, weight: 4.5, opacity: 0.95, lineCap: 'round' }}
            interactive={false}
          />
        ))}

        {STATIONS.map((station) => {
          const line = LINE_BY_ID[station.lines[0] ?? 'silver']
          const isVisible = station.lines.some((id) => visibleLines[id])
          if (!isVisible) return null

          const isSelected = station.id === selectedStationId
          const isNext = station.id === nextStationId
          const isInterchange = station.lines.length > 1

          return (
            <Fragment key={station.id}>
              {isSelected && (
                <CircleMarker
                  center={[station.lat, station.lng]}
                  radius={11}
                  pathOptions={{
                    color: '#0f172a',
                    weight: 2,
                    fillColor: '#ffffff',
                    fillOpacity: 0.9,
                  }}
                  interactive={false}
                />
              )}
              {isNext && (
                <CircleMarker
                  center={[station.lat, station.lng]}
                  radius={9}
                  pathOptions={{
                    color: nextStationColor,
                    weight: 3,
                    dashArray: '4 3',
                    fillOpacity: 0,
                  }}
                  interactive={false}
                />
              )}
              <CircleMarker
                center={[station.lat, station.lng]}
                radius={isInterchange ? 6 : 4.5}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2,
                  fillColor: line.color,
                  fillOpacity: 1,
                }}
                eventHandlers={{
                  click: (event) => {
                    stop(event)
                    onSelectStation(station.id)
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                  <strong>{station.name}</strong>
                  <br />
                  <span>{station.lines.map((id) => LINE_BY_ID[id].name).join(' · ')}</span>
                </Tooltip>
              </CircleMarker>
            </Fragment>
          )
        })}

        {trains.map((train) => {
          const line = LINE_BY_ID[train.lineId]
          const nextStation = STATION_BY_ID[train.nextStationId]
          const position = trainLatLng(train)
          const bearing = trainBearing(train)
          const isFocused = trainKey(train) === selectedTrainKey
          const icon = L.divIcon({
            className: 'geo-train-wrapper',
            html: `<div class="geo-train ${isFocused ? 'geo-train-focused' : ''}" style="--line-color: ${line.color}; transform: rotate(${bearing}deg)"><span></span></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          })

          return (
            <Marker
              key={train.id}
              position={[position.lat, position.lng]}
              icon={icon}
              zIndexOffset={isFocused ? 1000 : 400}
              eventHandlers={{
                click: (event) => {
                  stop(event)
                  onSelectTrain(trainKey(train))
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -14]} opacity={1} permanent={isFocused}>
                <div className="geo-train-tip">
                  <strong>{line.name}</strong>
                  <span>
                    Next: {nextStation?.name ?? 'station'} · {Math.round(train.etaMinutes)} min
                  </span>
                </div>
              </Tooltip>
            </Marker>
          )
        })}
      </MapContainer>

      <div className="map-hint geo-hint">OpenStreetMap roads · Click a train or station</div>
    </div>
  )
}
