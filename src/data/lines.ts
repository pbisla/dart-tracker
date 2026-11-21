import type { Line, LineId } from '../types'

/**
 * Ordered station sequences. Names and interchange relationships follow the
 * DART system map / Wikipedia route diagrams (best effort, static snapshot).
 */
const redStations = [
  'parker-road',
  'downtown-plano',
  '12th-street',
  'cityline-bush',
  'galatyn-park',
  'arapaho-center',
  'spring-valley',
  'lbj-central',
  'forest-lane',
  'walnut-hill',
  'park-lane',
  'lovers-lane',
  'smu-mockingbird',
  'cityplace-uptown',
  'pearl-arts-district',
  'st-paul',
  'akard',
  'west-end',
  'union-station',
  'cedars',
  '8th-corinth',
  'dallas-zoo',
  'tyler-vernon',
  'hampton',
  'westmoreland',
]

const blueStations = [
  'downtown-rowlett',
  'downtown-garland',
  'forest-jupiter',
  'lbj-skillman',
  'lake-highlands',
  'white-rock',
  'smu-mockingbird',
  'cityplace-uptown',
  'pearl-arts-district',
  'st-paul',
  'akard',
  'west-end',
  'union-station',
  'cedars',
  '8th-corinth',
  'morrell',
  'illinois',
  'kiest',
  'va-medical-center',
  'ledbetter',
  'camp-wisdom',
  'untdallas',
]

const greenStations = [
  'north-carrollton-frankford',
  'trinity-mills',
  'downtown-carrollton',
  'farmers-branch',
  'royal-lane',
  'walnut-hill-denton',
  'bachman',
  'burbank',
  'inwood-love-field',
  'southwestern-medical-parkland',
  'market-center',
  'victory',
  'west-end',
  'akard',
  'st-paul',
  'pearl-arts-district',
  'deep-ellum',
  'baylor-umc',
  'fair-park',
  'mlk-jr',
  'hatcher',
  'lawnview',
  'lake-june',
  'buckner',
]

const orangeCore = [
  'dfw-airport-terminal-a',
  'belt-line',
  'dallas-college-north-lake',
  'hidden-ridge',
  'irving-convention-center',
  'las-colinas-urban-center',
  'university-of-dallas',
  'bachman',
  'burbank',
  'inwood-love-field',
  'southwestern-medical-parkland',
  'market-center',
  'victory',
  'west-end',
  'akard',
  'st-paul',
  'pearl-arts-district',
  'cityplace-uptown',
  'smu-mockingbird',
  'lovers-lane',
  'park-lane',
  'walnut-hill',
  'forest-lane',
  'lbj-central',
]

const orangeNorth = [
  'spring-valley',
  'arapaho-center',
  'galatyn-park',
  'cityline-bush',
  '12th-street',
  'downtown-plano',
  'parker-road',
]

const silverStations = [
  'dfw-airport-terminal-b',
  'dfw-airport-north',
  'cypress-waters',
  'downtown-carrollton',
  'addison',
  'knoll-trail',
  'ut-dallas',
  'cityline-bush',
  '12th-street',
  'shiloh-road',
]

export const ORANGE_CORE = orangeCore
export const ORANGE_NORTH = orangeNorth

/**
 * `offset` is measured against each line's own travel direction. Lines that run
 * in opposite directions on the same corridor therefore need offsets with the
 * same sign to land on opposite physical sides of the track.
 *
 * This produces a north-to-south lane order of Red, Blue, Green, Orange through
 * the downtown core, with Silver centered where it joins the northern routes.
 */
export const LINES: Line[] = [
  { id: 'red', name: 'Red Line', color: '#d71920', stationIds: redStations, offset: 24 },
  { id: 'blue', name: 'Blue Line', color: '#0096d6', stationIds: blueStations, offset: 8 },
  { id: 'green', name: 'Green Line', color: '#009640', stationIds: greenStations, offset: 8 },
  {
    id: 'orange',
    name: 'Orange Line',
    color: '#f58220',
    stationIds: [...orangeCore, ...orangeNorth],
    offset: 21,
  },
  { id: 'silver', name: 'Silver Line', color: '#8a8d8f', stationIds: silverStations, offset: 0 },
]

export const LINE_BY_ID: Record<LineId, Line> = Object.fromEntries(
  LINES.map((line) => [line.id, line]),
) as Record<LineId, Line>

export const STATION_LINES: Record<string, LineId[]> = (() => {
  const result: Record<string, LineId[]> = {}
  for (const line of LINES) {
    for (const id of line.stationIds) {
      ;(result[id] ??= []).push(line.id)
    }
  }
  return result
})()
