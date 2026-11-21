import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent } from 'react'
import { LINE_BY_ID, LINES } from '../data/lines'
import { MAP_HEIGHT, MAP_WIDTH, STATIONS, STATION_BY_ID } from '../data/stations'
import { buildRoundedPath, getLinePoints } from '../lib/geometry'
import { LABEL_LAYOUT } from '../lib/labels'
import { trainKey } from '../lib/simulation'
import type { LineId, Point, Train } from '../types'

interface TransitMapProps {
  visibleLines: Record<LineId, boolean>
  trains: Train[]
  selectedStationId: string | null
  onSelectStation: (stationId: string) => void
  selectedTrainKey: string | null
  onSelectTrain: (key: string | null) => void
}

interface ViewState {
  scale: number
  tx: number
  ty: number
}

type GestureState =
  | { mode: 'pan'; lastPoint: Point }
  | { mode: 'pinch'; startDistance: number; startScale: number; anchorLayer: Point }

const INITIAL_VIEW: ViewState = { scale: 1, tx: 0, ty: 0 }
const MIN_SCALE = 0.6
const MAX_SCALE = 4

const clampScale = (value: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, value))

function getPinch(a: Point, b: Point) {
  return {
    midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    distance: Math.hypot(a.x - b.x, a.y - b.y),
  }
}

const LINE_PATHS = Object.fromEntries(
  LINES.map((line) => [line.id, buildRoundedPath(getLinePoints(line.id), 24)]),
) as Record<LineId, string>

export function TransitMap({
  visibleLines,
  trains,
  selectedStationId,
  onSelectStation,
  selectedTrainKey,
  onSelectTrain,
}: TransitMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const pointersRef = useRef(new Map<number, Point>())
  const gestureRef = useRef<GestureState | null>(null)
  const suppressClickRef = useRef(false)
  const [view, setView] = useState<ViewState>(INITIAL_VIEW)
  const viewRef = useRef(view)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    viewRef.current = view
  }, [view])
  const selectedTrain = trains.find((train) => trainKey(train) === selectedTrainKey)
  const nextStationId = selectedTrain?.nextStationId
  const nextStationColor = selectedTrain ? LINE_BY_ID[selectedTrain.lineId].color : undefined

  const svgPoint = (clientX: number, clientY: number): Point => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const matrix = svg.getScreenCTM()
    if (!matrix) return { x: 0, y: 0 }
    const transformed = point.matrixTransform(matrix.inverse())
    return { x: transformed.x, y: transformed.y }
  }

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const anchor = svgPoint(event.clientX, event.clientY)
      setView((current) => {
        const factor = Math.exp(-event.deltaY * 0.0015)
        const nextScale = clampScale(current.scale * factor)
        const ratio = nextScale / current.scale
        return {
          scale: nextScale,
          tx: anchor.x - (anchor.x - current.tx) * ratio,
          ty: anchor.y - (anchor.y - current.ty) * ratio,
        }
      })
    }

    svg.addEventListener('wheel', handleWheel, { passive: false })
    return () => svg.removeEventListener('wheel', handleWheel)
  }, [])

  const makePinchGesture = (points: Point[]): GestureState => {
    const { midpoint, distance } = getPinch(points[0], points[1])
    const current = viewRef.current
    return {
      mode: 'pinch',
      startDistance: Math.max(distance, 1),
      startScale: current.scale,
      anchorLayer: {
        x: (midpoint.x - current.tx) / current.scale,
        y: (midpoint.y - current.ty) / current.scale,
      },
    }
  }

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    // Let stations and trains receive their own click events; capturing a
    // background pointer would retarget the click to the SVG.
    if (
      pointersRef.current.size === 0 &&
      (event.target as Element).closest('.station, .train')
    ) {
      return
    }

    suppressClickRef.current = false
    const point = svgPoint(event.clientX, event.clientY)
    pointersRef.current.set(event.pointerId, point)
    setDragging(true)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Synthetic or already-released pointers cannot be captured; gestures still work.
    }

    const points = [...pointersRef.current.values()]
    gestureRef.current =
      points.length >= 2 ? makePinchGesture(points) : { mode: 'pan', lastPoint: point }
    if (points.length >= 2) suppressClickRef.current = true
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    const point = svgPoint(event.clientX, event.clientY)
    pointersRef.current.set(event.pointerId, point)

    const gesture = gestureRef.current
    if (!gesture) return
    const points = [...pointersRef.current.values()]

    if (gesture.mode === 'pan' && points.length === 1) {
      const dx = point.x - gesture.lastPoint.x
      const dy = point.y - gesture.lastPoint.y
      if (Math.hypot(dx, dy) > 3) suppressClickRef.current = true
      setView((previous) => ({ ...previous, tx: previous.tx + dx, ty: previous.ty + dy }))
      gesture.lastPoint = point
      return
    }

    if (points.length < 2) return
    if (gesture.mode === 'pan') {
      gestureRef.current = makePinchGesture(points)
      suppressClickRef.current = true
      return
    }

    const { midpoint, distance } = getPinch(points[0], points[1])
    const nextScale = clampScale((gesture.startScale * distance) / gesture.startDistance)
    setView({
      scale: nextScale,
      tx: midpoint.x - gesture.anchorLayer.x * nextScale,
      ty: midpoint.y - gesture.anchorLayer.y * nextScale,
    })
    suppressClickRef.current = true
  }

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const remaining = [...pointersRef.current.values()]
    if (remaining.length >= 2) {
      gestureRef.current = makePinchGesture(remaining)
    } else if (remaining.length === 1) {
      gestureRef.current = { mode: 'pan', lastPoint: remaining[0] }
    } else {
      gestureRef.current = null
      setDragging(false)
      // Let the click generated by a pan/pinch be ignored, then re-enable taps.
      if (suppressClickRef.current) {
        window.setTimeout(() => {
          suppressClickRef.current = false
        }, 0)
      }
    }
  }

  const zoomBy = (factor: number) => {
    setView((current) => {
      const nextScale = clampScale(current.scale * factor)
      const ratio = nextScale / current.scale
      const anchor = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 }
      return {
        scale: nextScale,
        tx: anchor.x - (anchor.x - current.tx) * ratio,
        ty: anchor.y - (anchor.y - current.ty) * ratio,
      }
    })
  }

  const handleStationActivate = (stationId: string) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onSelectStation(stationId)
  }

  const handleStationKeyDown = (event: KeyboardEvent<SVGGElement>, stationId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelectStation(stationId)
    }
  }

  const handleMapClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    // A click on a train or station is handled by that element instead.
    if ((event.target as Element).closest('.station, .train')) return
    onSelectTrain(null)
  }

  return (
    <div className="map-wrap">
      <svg
        ref={svgRef}
        className={`transit-map ${dragging ? 'map-dragging' : ''}`}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        role="img"
        aria-label="Schematic DART rail map with simulated train positions"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleMapClick}
      >
        <defs>
          <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#dbe4ef" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#f8fafc" />
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#map-grid)" opacity="0.55" />

        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          {LINES.map((line) => (
            <g
              key={line.id}
              className={visibleLines[line.id] ? 'route' : 'route route-hidden'}
            >
              <path d={LINE_PATHS[line.id]} className="route-casing" />
              <path d={LINE_PATHS[line.id]} className="route-line" stroke={line.color} />
            </g>
          ))}

          {STATIONS.map((station) => {
            const isInterchange = station.lines.length > 1
            const isSelected = station.id === selectedStationId
            const isNext = station.id === nextStationId
            const isVisible = station.lines.some((lineId) => visibleLines[lineId])
            const label = LABEL_LAYOUT[station.id]
            return (
              <g
                key={station.id}
                className={`station ${isInterchange ? 'station-interchange' : ''} ${
                  isVisible ? '' : 'station-muted'
                } ${isNext ? 'station-next' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`${station.name}, served by ${station.lines
                  .map((id) => LINE_BY_ID[id].name)
                  .join(', ')}`}
                onClick={() => handleStationActivate(station.id)}
                onKeyDown={(event) => handleStationKeyDown(event, station.id)}
              >
                {label.leader && (
                  <line
                    className="station-label-leader"
                    x1={label.leader.x1}
                    y1={label.leader.y1}
                    x2={label.leader.x2}
                    y2={label.leader.y2}
                  />
                )}
                {isSelected && (
                  <circle className="station-selected" cx={station.x} cy={station.y} r={18} />
                )}
                {isNext && (
                  <circle
                    className="station-next-ring"
                    cx={station.x}
                    cy={station.y}
                    r={isInterchange ? 15 : 13}
                    stroke={nextStationColor}
                  />
                )}
                <circle
                  className="station-hit"
                  cx={station.x}
                  cy={station.y}
                  r={16}
                  fill="transparent"
                />
                <circle
                  className="station-dot"
                  cx={station.x}
                  cy={station.y}
                  r={isInterchange ? 9 : 6.5}
                />
                {isInterchange && (
                  <circle className="station-core" cx={station.x} cy={station.y} r={3.4} />
                )}
                <text
                  className={`station-label ${isInterchange ? 'station-label-strong' : ''} ${
                    label.moved ? 'station-label-moved' : ''
                  }`}
                  x={label.x}
                  y={label.y}
                  textAnchor={label.anchor}
                >
                  {station.name}
                </text>
              </g>
            )
          })}

          {trains.map((train) => {
            const line = LINE_BY_ID[train.lineId]
            const nextStation = STATION_BY_ID[train.nextStationId]
            const isFocused = trainKey(train) === selectedTrainKey
            const activate = () => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false
                return
              }
              onSelectTrain(trainKey(train))
            }
            return (
              <g
                key={train.id}
                className={`train ${isFocused ? 'train-focused' : ''}`}
                transform={`translate(${train.x} ${train.y}) rotate(${train.angle})`}
                role="button"
                tabIndex={0}
                aria-label={`${line.name} to ${train.destination}, current position near ${nextStation?.name ?? 'station'}`}
                onClick={activate}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelectTrain(trainKey(train))
                  }
                }}
              >
                <title>{`${line.name} to ${train.destination} — next ${nextStation?.name ?? 'station'} in ${Math.round(train.etaMinutes)} min`}</title>
                {isFocused && <circle className="train-pulse" r={19} />}
                <rect x={-12} y={-6} width={24} height={12} rx={6} fill={line.color} />
                <path d="M 6 -3.5 L 10.5 0 L 6 3.5 Z" fill="#ffffff" opacity="0.95" />
                <rect x={-12} y={-6} width={24} height={12} rx={6} className="train-outline" />
              </g>
            )
          })}

          {(() => {
            if (!selectedTrain) return null
            const line = LINE_BY_ID[selectedTrain.lineId]
            const nextStation = STATION_BY_ID[selectedTrain.nextStationId]
            const nextName = nextStation?.name ?? 'station'
            const nextLabel = nextName.length > 26 ? `${nextName.slice(0, 25)}…` : nextName
            const onLeft = selectedTrain.x > 1280
            const boxX = onLeft ? -246 : 28
            const boxY = -60
            const boxWidth = 218
            const boxHeight = 54
            return (
              <>
                <g
                  className="train-trail"
                  transform={`translate(${selectedTrain.x} ${selectedTrain.y}) rotate(${selectedTrain.angle})`}
                  aria-hidden="true"
                >
                  <path className="train-trail-line" d="M -54 0 L -15 0" stroke={line.color} />
                  <path className="train-trail-chevron" d="M 20 -6 L 30 0 L 20 6" stroke={line.color} />
                </g>
                <g
                  className="train-callout"
                  transform={`translate(${selectedTrain.x} ${selectedTrain.y})`}
                  aria-hidden="true"
                >
                  <path
                    className="train-callout-stem"
                    d={onLeft ? 'M -12 0 L -34 -30' : 'M 12 0 L 34 -30'}
                  />
                  <rect
                    className="train-callout-box"
                    x={boxX}
                    y={boxY}
                    width={boxWidth}
                    height={boxHeight}
                    rx={10}
                  />
                  <circle
                    className="train-callout-dot"
                    cx={boxX + 12}
                    cy={boxY + 16}
                    r={4}
                    fill={line.color}
                  />
                  <text className="train-callout-title" x={boxX + 24} y={boxY + 20}>
                    NEXT STATION
                  </text>
                  <text
                    className="train-callout-eta"
                    x={boxX + boxWidth - 12}
                    y={boxY + 20}
                    textAnchor="end"
                  >
                    {`${Math.round(selectedTrain.etaMinutes)} min`}
                  </text>
                  <text className="train-callout-next" x={boxX + 12} y={boxY + 42}>
                    {nextLabel}
                  </text>
                </g>
              </>
            )
          })()}
        </g>
      </svg>

      <div className="map-hint">Pinch or scroll to zoom · Drag to pan · Tap a train or station</div>
      <div className="map-zoom" role="group" aria-label="Map zoom">
        <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomBy(0.8)} aria-label="Zoom out">
          −
        </button>
      </div>
      <button
        type="button"
        className="map-reset"
        onClick={() => setView(INITIAL_VIEW)}
        aria-label="Reset map view"
      >
        Reset view
      </button>
    </div>
  )
}
