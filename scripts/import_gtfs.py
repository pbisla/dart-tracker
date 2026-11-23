#!/usr/bin/env python3
"""Import DART's static GTFS feed into the small schedule bundle used by the app.

Usage:
  python3 scripts/import_gtfs.py [path-or-url-to-zip]

The script validates the feed against the hand-authored map before writing
src/data/gtfsSchedule.ts. It needs only Python's standard library.
"""

from __future__ import annotations

import csv
import io
import json
import math
import re
import sys
import urllib.request
import zipfile
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_URL = "https://files.mobilitydatabase.org/mdb-152/latest.zip"
OUTPUT = ROOT / "src/data/gtfsSchedule.ts"

ROUTE_NAMES = {"BLUE": "blue", "GREEN": "green", "ORANGE": "orange", "RED": "red", "SILVER": "silver"}
DAY_KINDS = ("weekday", "weekend")

# GTFS uses separate stop records for some shared/Silver platforms. Map them
# onto the single schematic station used by the app.
STOP_TO_STATION = {
    "13659": "dallas-zoo",
    "15262": "8th-corinth",
    "15913": "westmoreland",
    "16083": "morrell",
    "21030": "illinois",
    "21210": "hampton",
    "22729": "cedars",
    "22730": "tyler-vernon",
    "22747": "convention-center",
    "22748": "union-station",
    "22749": "west-end",
    "22750": "akard",
    "22751": "st-paul",
    "22752": "pearl-arts-district",
    "22938": "smu-mockingbird",
    "22984": "lovers-lane",
    "23320": "ledbetter",
    "23390": "kiest",
    "23391": "va-medical-center",
    "26420": "cityplace-uptown",
    "26652": "white-rock",
    "26668": "lbj-skillman",
    "26669": "walnut-hill",
    "26670": "lbj-central",
    "26671": "forest-lane",
    "26672": "spring-valley",
    "26673": "arapaho-center",
    "26674": "galatyn-park",
    "26690": "forest-jupiter",
    "26691": "downtown-garland",
    "26895": "cityline-bush",
    "26896": "downtown-plano",
    "26897": "parker-road",
    "28264": "victory",
    "28755": "park-lane",
    "29815": "north-carrollton-frankford",
    "29816": "trinity-mills",
    "29817": "downtown-carrollton",
    "29818": "farmers-branch",
    "29819": "royal-lane",
    "29820": "walnut-hill-denton",
    "29821": "bachman",
    "29822": "burbank",
    "29824": "inwood-love-field",
    "29825": "market-center",
    "29826": "southwestern-medical-parkland",
    "29831": "hatcher",
    "29832": "lawnview",
    "29833": "lake-june",
    "29834": "buckner",
    "31084": "university-of-dallas",
    "31088": "dallas-college-north-lake",
    "31089": "belt-line",
    "32040": "mlk-jr",
    "32041": "fair-park",
    "32042": "baylor-umc",
    "32043": "deep-ellum",
    "32049": "lake-highlands",
    "32337": "las-colinas-urban-center",
    "32338": "irving-convention-center",
    "32553": "dfw-airport-terminal-a",
    "32562": "downtown-rowlett",
    "33086": "camp-wisdom",
    "33087": "untdallas",
    "33473": "dfw-airport-terminal-b",
    "33474": "dfw-airport-north",
    "33595": "cypress-waters",
    "33596": "addison",
    "33597": "knoll-trail",
    "33598": "ut-dallas",
    "33599": "12th-street",
    "33566": "hidden-ridge",
    "33600": "shiloh-road",
    "34292": "downtown-carrollton",
    "34293": "12th-street",
}
# Non-passenger track records used by some trips.
IGNORED_STOP_IDS = {"32376", "32892"}


def fail(message: str) -> None:
    raise SystemExit(f"GTFS validation failed: {message}")


def read_rows(archive: zipfile.ZipFile, name: str) -> list[dict[str, str]]:
    with archive.open(name) as stream:
        return list(csv.DictReader(io.TextIOWrapper(stream, encoding="utf-8-sig")))


def parse_time(value: str) -> float:
    hour, minute, second = (int(part) for part in value.split(":"))
    return hour * 60 + minute + second / 60


def read_station_array(source: str, name: str) -> list[str]:
    match = re.search(rf"const {name} = \[(.*?)\]", source, re.S)
    if not match:
        fail(f"could not find {name} in src/data/lines.ts")
    return re.findall(r"'([^']+)'", match.group(1))


def read_app_data() -> tuple[dict[str, list[str]], dict[str, str], dict[str, tuple[float, float]]]:
    lines_source = (ROOT / "src/data/lines.ts").read_text()
    station_source = (ROOT / "src/data/stations.ts").read_text()

    sequences = {
        "red": read_station_array(lines_source, "redStations"),
        "blue": read_station_array(lines_source, "blueStations"),
        "green": read_station_array(lines_source, "greenStations"),
        "orange": read_station_array(lines_source, "orangeCore") + read_station_array(lines_source, "orangeNorth"),
        "silver": read_station_array(lines_source, "silverStations"),
    }
    station_rows = re.findall(
        r"\['([^']+)',\s*'([^']+)',\s*[-\d.]+,\s*[-\d.]+,\s*'[^']+',\s*([-\d.]+),\s*([-\d.]+)\]",
        station_source,
    )
    names = {station_id: name for station_id, name, _, _ in station_rows}
    coords = {station_id: (float(lat), float(lng)) for station_id, _, lat, lng in station_rows}

    for line_id, station_ids in sequences.items():
        for station_id in station_ids:
            if station_id not in names:
                fail(f"{line_id} references unknown station {station_id}")

    for station_id in STOP_TO_STATION.values():
        if station_id not in names:
            fail(f"stop alias references unknown station {station_id}")

    return sequences, names, coords


def service_day_kinds(
    calendar: list[dict[str, str]], dates: list[dict[str, str]]
) -> dict[str, set[str]]:
    kinds: dict[str, set[str]] = defaultdict(set)
    for row in calendar:
        if any(row[day] == "1" for day in ("monday", "tuesday", "wednesday", "thursday", "friday")):
            kinds[row["service_id"]].add("weekday")
        if row["saturday"] == "1" or row["sunday"] == "1":
            kinds[row["service_id"]].add("weekend")
    for row in dates:
        date = datetime.strptime(row["date"], "%Y%m%d").date()
        kind = "weekend" if date.weekday() >= 5 else "weekday"
        if row["exception_type"] == "1":
            kinds[row["service_id"]].add(kind)
        elif row["exception_type"] == "2":
            kinds[row["service_id"]].discard(kind)
    return dict(kinds)


def haversine_miles(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lng1 = map(math.radians, a)
    lat2, lng2 = map(math.radians, b)
    dlat, dlng = lat2 - lat1, lng2 - lng1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return 3958.8 * 2 * math.asin(math.sqrt(h))


def build_adjacency(sequences: dict[str, list[str]]) -> set[tuple[str, str]]:
    pairs: set[tuple[str, str]] = set()
    for station_ids in sequences.values():
        for first, second in zip(station_ids, station_ids[1:]):
            pairs.add((first, second))
            pairs.add((second, first))
    return pairs


def validate_path(sequence: list[str], adjacency: set[tuple[str, str]]) -> None:
    for first, second in zip(sequence, sequence[1:]):
        if (first, second) not in adjacency:
            fail(f"trip uses unmapped schematic path {first} -> {second}")


def direction_for(sequence: list[str], full: list[str]) -> int:
    # Branch trips can leave the drawn route (e.g. Orange to Fair Park), so use
    # the first two stations that are on the main route to infer direction.
    overlap = [full.index(station_id) for station_id in sequence if station_id in full]
    if len(overlap) < 2:
        fail(f"cannot infer direction for trip {sequence}")
    return 1 if overlap[1] > overlap[0] else -1


def read_feed(source: str) -> zipfile.ZipFile:
    if Path(source).is_file():
        return zipfile.ZipFile(source)
    request = urllib.request.Request(source, headers={"User-Agent": "dart-tracker-static-import/1.0"})
    with urllib.request.urlopen(request, timeout=180) as response:
        return zipfile.ZipFile(io.BytesIO(response.read()))


def main() -> None:
    source = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    sequences, station_names, app_coords = read_app_data()
    adjacency = build_adjacency(sequences)

    with read_feed(source) as archive:
        routes = read_rows(archive, "routes.txt")
        trips = read_rows(archive, "trips.txt")
        stop_times = read_rows(archive, "stop_times.txt")
        stops = {row["stop_id"]: row for row in read_rows(archive, "stops.txt")}
        feed_info = read_rows(archive, "feed_info.txt")
        calendar = read_rows(archive, "calendar.txt")
        calendar_dates = read_rows(archive, "calendar_dates.txt")

    route_ids = {
        row["route_id"]: ROUTE_NAMES[row["route_short_name"]]
        for row in routes
        if row["route_short_name"] in ROUTE_NAMES
    }
    if set(route_ids.values()) != set(ROUTE_NAMES.values()):
        fail(f"expected all five rail routes, found {sorted(set(route_ids.values()))}")

    rail_trips = [trip for trip in trips if trip["route_id"] in route_ids]
    rail_trip_ids = {trip["trip_id"] for trip in rail_trips}
    rail_service_ids = {trip["service_id"] for trip in rail_trips}
    kinds = service_day_kinds(calendar, calendar_dates)

    trip_counts: dict[str, int] = defaultdict(int)
    for trip in rail_trips:
        trip_counts[trip["service_id"]] += 1

    representative: dict[str, str] = {}
    for day_kind in DAY_KINDS:
        candidates = [sid for sid in rail_service_ids if day_kind in kinds.get(sid, set())]
        if not candidates:
            fail(f"no rail service found for {day_kind}")
        # Prefer a service ID used on only this day kind, then the busiest one.
        representative[day_kind] = sorted(
            candidates,
            key=lambda sid: (len(kinds[sid]) != 1, -trip_counts[sid], sid),
        )[0]

    times_by_trip: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in stop_times:
        if row["trip_id"] in rail_trip_ids:
            times_by_trip[row["trip_id"]].append(row)
    for rows in times_by_trip.values():
        rows.sort(key=lambda row: int(row["stop_sequence"]))

    used_stop_ids = {row["stop_id"] for rows in times_by_trip.values() for row in rows}
    for stop_id in used_stop_ids:
        if stop_id in IGNORED_STOP_IDS:
            continue
        if stop_id not in STOP_TO_STATION:
            fail(f"unmapped rail stop {stop_id} ({stops.get(stop_id, {}).get('stop_name', '?')})")
        stop = stops[stop_id]
        station_id = STOP_TO_STATION[stop_id]
        distance = haversine_miles(
            app_coords[station_id],
            (float(stop["stop_lat"]), float(stop["stop_lon"])),
        )
        if distance > 0.3:
            fail(f"{station_id} is {distance:.2f} miles from GTFS stop {stop_id}")

    pattern_keys: set[tuple] = set()
    trips_out: dict[str, dict[str, list[dict]]] = {
        line_id: {day_kind: [] for day_kind in DAY_KINDS} for line_id in ROUTE_NAMES.values()
    }
    visits: dict[str, dict[str, set[str]]] = {
        line_id: {day_kind: set() for day_kind in DAY_KINDS} for line_id in ROUTE_NAMES.values()
    }

    for trip in rail_trips:
        line_id = route_ids[trip["route_id"]]
        day_kind = next(
            (kind for kind, sid in representative.items() if sid == trip["service_id"]), None
        )
        if day_kind is None:
            continue

        station_ids: list[str] = []
        minutes: list[float] = []
        for row in times_by_trip[trip["trip_id"]]:
            if row["stop_id"] in IGNORED_STOP_IDS:
                continue
            station_id = STOP_TO_STATION[row["stop_id"]]
            if station_ids and station_ids[-1] == station_id:
                continue
            station_ids.append(station_id)
            minutes.append(parse_time(row["arrival_time"]))

        if len(station_ids) < 2:
            fail(f"trip {trip['trip_id']} has too few mapped stops")
        if any(later < earlier for earlier, later in zip(minutes, minutes[1:])):
            fail(f"trip {trip['trip_id']} has decreasing stop times")
        if minutes[0] == minutes[-1]:
            fail(f"trip {trip['trip_id']} has no duration")

        validate_path(station_ids, adjacency)
        direction = direction_for(station_ids, sequences[line_id])
        offsets = tuple(round(time - minutes[0], 1) for time in minutes)
        key = (line_id, direction, tuple(station_ids), offsets)
        pattern_keys.add(key)
        trips_out[line_id][day_kind].append(
            {"id": trip["trip_id"], "pattern": key, "start": round(minutes[0], 1)}
        )
        visits[line_id][day_kind].update(station_ids)

    warnings: list[str] = []
    for line_id in ROUTE_NAMES.values():
        for day_kind in DAY_KINDS:
            if not trips_out[line_id][day_kind]:
                fail(f"no {day_kind} trips for {line_id}")
            missing = set(sequences[line_id]) - visits[line_id][day_kind]
            if missing:
                warnings.append(f"{line_id} {day_kind}: no trips to {', '.join(sorted(missing))}")

    ordered_keys = sorted(pattern_keys)
    pattern_ids = {key: f"p{index:03d}" for index, key in enumerate(ordered_keys)}
    patterns = {
        pattern_ids[key]: {
            "lineId": key[0],
            "direction": key[1],
            "stationIds": list(key[2]),
            "offsets": list(key[3]),
            "destination": station_names[key[2][-1]],
        }
        for key in ordered_keys
    }
    trips = {
        line_id: {
            day_kind: [
                {"id": trip["id"], "patternId": pattern_ids[trip["pattern"]], "start": trip["start"]}
                for trip in sorted(day_trips, key=lambda trip: (trip["start"], trip["id"]))
            ]
            for day_kind, day_trips in by_day.items()
        }
        for line_id, by_day in trips_out.items()
    }

    feed_version = feed_info[0]["feed_version"] if feed_info else "unknown"
    meta = {
        "source": "Mobility Database DART static GTFS (mdb-152)",
        "feedVersion": feed_version,
        "representativeServices": representative,
    }

    def literal(value: object) -> str:
        return json.dumps(value, separators=(",", ":"), ensure_ascii=False)

    output = f'''// Generated by scripts/import_gtfs.py from {meta["source"]}.
// Feed {feed_version}. Do not edit; run `npm run import:gtfs` to refresh.

import type {{ DayKind, LineId }} from '../types'

export interface GtfsPattern {{
  lineId: LineId
  direction: 1 | -1
  stationIds: string[]
  offsets: number[]
  destination: string
}}

export interface GtfsTripRef {{
  id: string
  patternId: string
  start: number
}}

export const GTFS_META = {literal(meta)}

export const GTFS_PATTERNS = {literal(patterns)} as Record<string, GtfsPattern>

export const GTFS_TRIPS = {literal(trips)} as Record<
  LineId,
  Record<DayKind, GtfsTripRef[]>
>
'''
    OUTPUT.write_text(output)
    print(
        f"Wrote {OUTPUT.relative_to(ROOT)}: {len(patterns)} patterns, "
        f"{sum(len(day) for by_day in trips.values() for day in by_day.values())} trips, feed {feed_version}"
    )
    for warning in warnings:
        print(f"Note: {warning}")


if __name__ == "__main__":
    main()
