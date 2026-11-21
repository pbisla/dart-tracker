import { STATION_LINES } from './lines'
import type { LabelAnchor, Station } from '../types'

type Row = [id: string, name: string, x: number, y: number, label: LabelAnchor]

/**
 * Schematic coordinates on a 1600 x 1250 virtual canvas.
 * Geometry is intentionally not geographic: it mirrors the legibility and
 * 45°/90° conventions of a traditional transit map.
 */
const rows: Row[] = [
  // Silver Line — northern corridor
  ['dfw-airport-terminal-b', 'DFW Airport Terminal B', 80, 280, 'left'],
  ['dfw-airport-north', 'DFW Airport North', 170, 280, 'bottom'],
  ['cypress-waters', 'Cypress Waters', 260, 280, 'bottom'],
  ['downtown-carrollton', 'Downtown Carrollton', 380, 280, 'top'],
  ['addison', 'Addison', 520, 280, 'bottom'],
  ['knoll-trail', 'Knoll Trail', 620, 280, 'bottom'],
  ['ut-dallas', 'UT Dallas', 720, 280, 'bottom'],
  ['cityline-bush', 'CityLine/Bush', 1380, 290, 'bottom'],
  ['12th-street', '12th Street', 1420, 250, 'left'],
  ['shiloh-road', 'Shiloh Road', 1500, 250, 'right'],

  // Green Line — north-west approach
  ['north-carrollton-frankford', 'North Carrollton/Frankford', 260, 160, 'top'],
  ['trinity-mills', 'Trinity Mills', 320, 220, 'top'],
  ['farmers-branch', 'Farmers Branch', 420, 340, 'left'],
  ['royal-lane', 'Royal Lane', 460, 400, 'left'],
  ['walnut-hill-denton', 'Walnut Hill/Denton', 500, 460, 'left'],
  ['bachman', 'Bachman', 540, 520, 'left'],
  ['burbank', 'Burbank', 580, 580, 'left'],
  ['inwood-love-field', 'Inwood/Love Field', 620, 640, 'left'],
  [
    'southwestern-medical-parkland',
    'Southwestern Medical District/Parkland',
    640,
    700,
    'left',
  ],
  ['market-center', 'Market Center', 660, 740, 'bottom'],
  ['victory', 'Victory', 690, 760, 'bottom'],

  // Orange Line — DFW / Irving corridor
  ['dfw-airport-terminal-a', 'DFW Airport Terminal A', 80, 520, 'left'],
  ['belt-line', 'Belt Line', 140, 520, 'bottom'],
  ['dallas-college-north-lake', 'Dallas College North Lake Campus', 200, 520, 'bottom'],
  ['hidden-ridge', 'Hidden Ridge', 260, 520, 'bottom'],
  ['irving-convention-center', 'Irving Convention Center', 320, 520, 'bottom'],
  ['las-colinas-urban-center', 'Las Colinas Urban Center', 380, 520, 'bottom'],
  ['university-of-dallas', 'University of Dallas', 460, 520, 'bottom'],

  // Downtown spine
  ['west-end', 'West End', 720, 760, 'bottom'],
  ['akard', 'Akard', 780, 760, 'bottom'],
  ['st-paul', 'St. Paul', 840, 760, 'bottom'],
  ['pearl-arts-district', 'Pearl/Arts District', 900, 760, 'bottom'],

  // Red / Orange — north Central Expressway corridor
  ['cityplace-uptown', 'Cityplace/Uptown', 960, 710, 'top'],
  ['smu-mockingbird', 'SMU/Mockingbird', 1020, 650, 'top'],
  ['lovers-lane', 'Lovers Lane', 1060, 610, 'right'],
  ['park-lane', 'Park Lane', 1100, 570, 'right'],
  ['walnut-hill', 'Walnut Hill', 1140, 530, 'right'],
  ['forest-lane', 'Forest Lane', 1180, 490, 'right'],
  ['lbj-central', 'LBJ/Central', 1220, 450, 'right'],
  ['spring-valley', 'Spring Valley', 1260, 410, 'right'],
  ['arapaho-center', 'Arapaho Center', 1300, 370, 'right'],
  ['galatyn-park', 'Galatyn Park', 1340, 330, 'right'],
  ['downtown-plano', 'Downtown Plano', 1460, 210, 'left'],
  ['parker-road', 'Parker Road', 1500, 170, 'left'],

  // Blue — north-east branch
  ['white-rock', 'White Rock', 1080, 620, 'bottom'],
  ['lake-highlands', 'Lake Highlands', 1140, 590, 'bottom'],
  ['lbj-skillman', 'LBJ/Skillman', 1200, 560, 'bottom'],
  ['forest-jupiter', 'Forest/Jupiter', 1260, 530, 'bottom'],
  ['downtown-garland', 'Downtown Garland', 1320, 500, 'bottom'],
  ['downtown-rowlett', 'Downtown Rowlett', 1380, 470, 'bottom'],

  // Green — south-east branch
  ['deep-ellum', 'Deep Ellum', 960, 800, 'right'],
  ['baylor-umc', 'Baylor University Medical Center', 1020, 830, 'right'],
  ['fair-park', 'Fair Park', 1080, 860, 'right'],
  ['mlk-jr', 'MLK Jr.', 1140, 890, 'right'],
  ['hatcher', 'Hatcher', 1200, 920, 'right'],
  ['lawnview', 'Lawnview', 1260, 950, 'right'],
  ['lake-june', 'Lake June', 1320, 980, 'right'],
  ['buckner', 'Buckner', 1380, 1010, 'right'],

  // Red — south-west branch
  ['union-station', 'Union Station', 680, 800, 'bottom'],
  ['cedars', 'Cedars', 640, 840, 'left'],
  ['8th-corinth', '8th & Corinth', 600, 880, 'left'],
  ['dallas-zoo', 'Dallas Zoo', 560, 920, 'left'],
  ['tyler-vernon', 'Tyler/Vernon', 520, 960, 'left'],
  ['hampton', 'Hampton', 480, 1000, 'left'],
  ['westmoreland', 'Westmoreland', 440, 1040, 'left'],

  // Blue — south branch
  ['morrell', 'Morrell', 620, 925, 'right'],
  ['illinois', 'Illinois', 640, 970, 'right'],
  ['kiest', 'Kiest', 660, 1015, 'right'],
  ['va-medical-center', 'VA Medical Center', 680, 1060, 'right'],
  ['ledbetter', 'Ledbetter', 700, 1105, 'right'],
  ['camp-wisdom', 'Camp Wisdom', 720, 1150, 'right'],
  ['untdallas', 'UNT Dallas', 740, 1195, 'right'],
]

export const STATIONS: Station[] = rows.map(([id, name, x, y, label]) => ({
  id,
  name,
  x,
  y,
  label,
  lines: STATION_LINES[id] ?? [],
}))

export const STATION_BY_ID: Record<string, Station> = Object.fromEntries(
  STATIONS.map((station) => [station.id, station]),
)

export const MAP_WIDTH = 1600
export const MAP_HEIGHT = 1250
