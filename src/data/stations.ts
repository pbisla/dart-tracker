import { STATION_LINES } from './lines'
import type { LabelAnchor, Station } from '../types'

type Row = [
  id: string,
  name: string,
  x: number,
  y: number,
  label: LabelAnchor,
  lat: number,
  lng: number,
]

/**
 * Schematic coordinates on a 1600 x 1250 virtual canvas.
 * Geometry is intentionally not geographic: it mirrors the legibility and
 * 45°/90° conventions of a traditional transit map.
 */
const rows: Row[] = [
  // Silver Line — northern corridor
  ['dfw-airport-terminal-b', 'DFW Airport Terminal B', 80, 280, 'left', 32.9064180, -97.0412351],
  ['dfw-airport-north', 'DFW Airport North', 170, 280, 'bottom', 32.9337891, -97.0540544],
  ['cypress-waters', 'Cypress Waters', 260, 280, 'bottom', 32.9505763, -96.9831960],
  ['downtown-carrollton', 'Downtown Carrollton', 380, 280, 'top', 32.9547150, -96.9084484],
  ['addison', 'Addison', 520, 280, 'bottom', 32.9589586, -96.8282584],
  ['knoll-trail', 'Knoll Trail', 620, 280, 'bottom', 32.9627817, -96.8177632],
  ['ut-dallas', 'UT Dallas', 720, 280, 'bottom', 32.9970750, -96.7493349],
  ['cityline-bush', 'CityLine/Bush', 1380, 290, 'bottom', 33.0020961, -96.7031495],
  ['12th-street', '12th Street', 1420, 250, 'left', 33.0150396, -96.6985468],
  ['shiloh-road', 'Shiloh Road', 1500, 250, 'right', 33.0117901, -96.6659285],

  // Green Line — north-west approach
  ['north-carrollton-frankford', 'North Carrollton/Frankford', 260, 160, 'top', 32.9917989, -96.9370253],
  ['trinity-mills', 'Trinity Mills', 320, 220, 'top', 32.9808728, -96.9264577],
  ['farmers-branch', 'Farmers Branch', 420, 340, 'left', 32.9217901, -96.8961970],
  ['royal-lane', 'Royal Lane', 460, 400, 'left', 32.8959989, -96.8882447],
  ['walnut-hill-denton', 'Walnut Hill/Denton', 500, 460, 'left', 32.8820287, -96.8838487],
  ['bachman', 'Bachman', 540, 520, 'left', 32.8537337, -96.8773001],
  ['burbank', 'Burbank', 580, 580, 'left', 32.8429541, -96.8621471],
  ['inwood-love-field', 'Inwood/Love Field', 620, 640, 'left', 32.8222027, -96.8333833],
  ['southwestern-medical-parkland', 'Southwestern Medical District/Parkland', 640, 700, 'left', 32.8137619, -96.8332884],
  ['market-center', 'Market Center', 660, 740, 'bottom', 32.8045992, -96.8236012],
  ['victory', 'Victory', 690, 760, 'bottom', 32.7896884, -96.8124796],

  // Orange Line — DFW / Irving corridor
  ['dfw-airport-terminal-a', 'DFW Airport Terminal A', 80, 520, 'left', 32.9071722, -97.0395048],
  ['belt-line', 'Belt Line', 140, 520, 'bottom', 32.8880204, -96.9865202],
  ['dallas-college-north-lake', 'Dallas College North Lake Campus', 200, 520, 'bottom', 32.8751777, -96.9671805],
  ['hidden-ridge', 'Hidden Ridge', 260, 520, 'bottom', 32.8820635, -96.9548730],
  ['irving-convention-center', 'Irving Convention Center', 320, 520, 'bottom', 32.8769489, -96.9385518],
  ['las-colinas-urban-center', 'Las Colinas Urban Center', 380, 520, 'bottom', 32.8686206, -96.9335904],
  ['university-of-dallas', 'University of Dallas', 460, 520, 'bottom', 32.8490538, -96.9150027],

  // Downtown spine
  ['west-end', 'West End', 720, 760, 'bottom', 32.7808770, -96.8056505],
  ['akard', 'Akard', 780, 760, 'bottom', 32.7819069, -96.8006975],
  ['st-paul', 'St. Paul', 840, 760, 'bottom', 32.7842858, -96.7970536],
  ['pearl-arts-district', 'Pearl/Arts District', 900, 760, 'bottom', 32.7864392, -96.7945311],

  // Red / Orange — north Central Expressway corridor
  ['cityplace-uptown', 'Cityplace/Uptown', 960, 710, 'top', 32.8055969, -96.7933465],
  ['smu-mockingbird', 'SMU/Mockingbird', 1020, 650, 'top', 32.8377844, -96.7749329],
  ['lovers-lane', 'Lovers Lane', 1060, 610, 'right', 32.8486414, -96.7717490],
  ['park-lane', 'Park Lane', 1100, 570, 'right', 32.8726584, -96.7659144],
  ['walnut-hill', 'Walnut Hill', 1140, 530, 'right', 32.8826402, -96.7649317],
  ['forest-lane', 'Forest Lane', 1180, 490, 'right', 32.9084163, -96.7624320],
  ['lbj-central', 'LBJ/Central', 1220, 450, 'right', 32.9184199, -96.7520908],
  ['spring-valley', 'Spring Valley', 1260, 410, 'right', 32.9408624, -96.7374057],
  ['arapaho-center', 'Arapaho Center', 1300, 370, 'right', 32.9636306, -96.7228317],
  ['galatyn-park', 'Galatyn Park', 1340, 330, 'right', 32.9851602, -96.7109292],
  ['downtown-plano', 'Downtown Plano', 1460, 210, 'left', 33.0208876, -96.7008941],
  ['parker-road', 'Parker Road', 1500, 170, 'left', 33.0337808, -96.7007220],

  // Blue — north-east branch
  ['white-rock', 'White Rock', 1080, 620, 'bottom', 32.8560003, -96.7327913],
  ['lake-highlands', 'Lake Highlands', 1140, 590, 'bottom', 32.8794384, -96.7304617],
  ['lbj-skillman', 'LBJ/Skillman', 1200, 560, 'bottom', 32.8980519, -96.7117729],
  ['forest-jupiter', 'Forest/Jupiter', 1260, 530, 'bottom', 32.9080601, -96.6795275],
  ['downtown-garland', 'Downtown Garland', 1320, 500, 'bottom', 32.9163019, -96.6353136],
  ['downtown-rowlett', 'Downtown Rowlett', 1380, 470, 'bottom', 32.9041239, -96.5635217],

  // Green — south-east branch
  ['deep-ellum', 'Deep Ellum', 960, 800, 'right', 32.7858612, -96.7885161],
  ['baylor-umc', 'Baylor University Medical Center', 1020, 830, 'right', 32.7865443, -96.7819904],
  ['fair-park', 'Fair Park', 1080, 860, 'right', 32.7819732, -96.7659451],
  ['mlk-jr', 'MLK Jr.', 1140, 890, 'right', 32.7737291, -96.7645711],
  ['hatcher', 'Hatcher', 1200, 920, 'right', 32.7663116, -96.7424681],
  ['lawnview', 'Lawnview', 1260, 950, 'right', 32.7656511, -96.7205231],
  ['lake-june', 'Lake June', 1320, 980, 'right', 32.7324317, -96.7093491],
  ['buckner', 'Buckner', 1380, 1010, 'right', 32.7185993, -96.6850777],

  // Red — south-west branch
  ['union-station', 'Union Station', 680, 800, 'bottom', 32.7760501, -96.8081640],
  ['convention-center', 'Convention Center', 660, 820, 'right', 32.7724810, -96.8029920],
  ['cedars', 'Cedars', 640, 840, 'left', 32.7687679, -96.7935810],
  ['8th-corinth', '8th & Corinth', 600, 880, 'left', 32.7481411, -96.7983829],
  ['dallas-zoo', 'Dallas Zoo', 560, 920, 'left', 32.7406773, -96.8130144],
  ['tyler-vernon', 'Tyler/Vernon', 520, 960, 'left', 32.7331271, -96.8385187],
  ['hampton', 'Hampton', 480, 1000, 'left', 32.7263842, -96.8554245],
  ['westmoreland', 'Westmoreland', 440, 1040, 'left', 32.7197311, -96.8717814],

  // Blue — south branch
  ['morrell', 'Morrell', 620, 925, 'right', 32.7397332, -96.8026503],
  ['illinois', 'Illinois', 640, 970, 'right', 32.7231802, -96.8051913],
  ['kiest', 'Kiest', 660, 1015, 'right', 32.7071683, -96.8011349],
  ['va-medical-center', 'VA Medical Center', 680, 1060, 'right', 32.6935438, -96.7928594],
  ['ledbetter', 'Ledbetter', 700, 1105, 'right', 32.6833423, -96.7887915],
  ['camp-wisdom', 'Camp Wisdom', 720, 1150, 'right', 32.6665800, -96.7881119],
  ['untdallas', 'UNT Dallas', 740, 1195, 'right', 32.6540976, -96.8010281],
]

export const STATIONS: Station[] = rows.map(([id, name, x, y, label, lat, lng]) => ({
  id,
  name,
  x,
  y,
  label,
  lat,
  lng,
  lines: STATION_LINES[id] ?? [],
}))

export const STATION_BY_ID: Record<string, Station> = Object.fromEntries(
  STATIONS.map((station) => [station.id, station]),
)

export const MAP_WIDTH = 1600
export const MAP_HEIGHT = 1250