#!/usr/bin/env python3
"""Compare source reports and write the verified records that can be delivered."""

import argparse
import json
import re
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

if __package__:
    from .collect_cricket import NPT, instant, stable_id, write_snapshot
else:
    from collect_cricket import NPT, instant, stable_id, write_snapshot


COLLECTIONS = ("fixtures", "events", "results", "liveMatches")
TEAM_ALIASES = {
    "unitedarabemirates": "uae",
    "pakistanshaheens": "pakistana",
}
VENUE_ALIASES = {
    "tribhuvanuniversitycricketground": "tu-ground",
    "tribhuvanuniversityinternationalcricketgroundkirtipur": "tu-ground",
    "tribhuvanuniversityinternationalcricketground": "tu-ground",
}


def compact(value):
    return re.sub(r"[^a-z0-9]", "", value.casefold())


def team_name(value):
    key = compact(value)
    return TEAM_ALIASES.get(key, key)


def venue_name(value):
    key = compact(value)
    return VENUE_ALIASES.get(key, key)


def overs_to_balls(value):
    match = re.fullmatch(r"(\d+)(?:\.([0-5]))?", value or "")
    if match is None:
        raise ValueError("Missing or invalid over count")
    return 6 * int(match[1]) + int(match[2] or 0)


def record_key(collection, item):
    if collection == "fixtures":
        return (item["eventKey"], *sorted(team_name(team) for team in item["teams"]))
    if collection == "events":
        return item.get("eventKey", item["id"])
    return item["id"]


def fingerprint(collection, item):
    if collection == "fixtures":
        return (date.fromisoformat(item["date"]), venue_name(item["venue"]))
    if collection == "events":
        first, last = date.fromisoformat(item["date"]), date.fromisoformat(item["endDate"])
        if first > last:
            raise ValueError("Event ends before it starts")
        return (first, last, venue_name(item["venue"]))
    if collection == "liveMatches":
        return (item["target"], item["maxOvers"], *(
            (team_name(item[side]["name"]), item[side]["runs"], item[side]["wickets"], overs_to_balls(item[side]["overs"]))
            for side in ("batting", "bowling")
        ))
    lines = tuple((team_name(line["team"]), line["score"], overs_to_balls(line["overs"])) for line in item["lines"])
    return (date.fromisoformat(item["date"]), compact(item["status"]), compact(item["summary"]), lines)


def evidence_sources(reports):
    sources = {}
    for item in reports:
        sources.setdefault(item["sourceGroup"], {"name": item["source"], "url": item["sourceUrl"],
                                                 "recordedReference": item.get("recordedReference", False)})
    return list(sources.values())


def agreement(collection, reports, now):
    if collection == "liveMatches":
        reports = [item for item in reports if instant(item["expiresAt"]) > now
                   and now - timedelta(minutes=5) <= instant(item["updatedAt"]) <= now + timedelta(seconds=30)]
        if not reports:
            return "score expired", []
    if len(evidence_sources(reports)) < 2:
        return "only one source", reports
    try:
        versions = {fingerprint(collection, item) for item in reports}
    except (KeyError, TypeError, ValueError):
        return "incomplete facts", reports
    if len(versions) > 1:
        if collection == "liveMatches" and len({overs_to_balls(item["batting"]["overs"]) for item in reports}) > 1:
            return "sources are on different deliveries", reports
        return "sources disagree", reports
    if collection == "fixtures":
        times = {item["time"] for item in reports if item.get("time") not in (None, "", "Time TBC")}
        if len(times) > 1:
            return "sources disagree on start time", reports
    return None, reports


def corroborated_overs(reports):
    variants = defaultdict(set)
    for group, innings in reports:
        runs = innings.get("overRuns")
        if runs is not None:
            variants[tuple(runs)].add(group)
    if len(variants) == 1:
        runs, groups = next(iter(variants.items()))
        if len(groups) >= 2:
            return list(runs)
    return None


def verified_record(collection, reports, checked_at):
    first = reports[0]
    item = {k: v for k, v in first.items() if k not in {"sourceId", "sourceGroup", "recordedReference"}}
    item["verification"] = {"checkedAt": checked_at.isoformat(), "sources": evidence_sources(reports)}
    if collection == "fixtures":
        times = defaultdict(set)
        for report in reports:
            time = report.get("time")
            if time and time != "Time TBC":
                times[time].add(report["sourceGroup"])
        item["time"] = next((time for time, groups in times.items() if len(groups) >= 2), "Time TBC")
    if collection == "results":
        item["lines"] = []
        for index, line in enumerate(first["lines"]):
            inning = {k: v for k, v in line.items() if k != "overRuns"}
            runs = corroborated_overs((report["sourceGroup"], report["lines"][index]) for report in reports)
            if runs is not None:
                inning["overRuns"] = runs
            item["lines"].append(inning)
    if collection == "liveMatches":
        # A slower source may have a shorter expiry than the first scorecard.
        item["expiresAt"] = min(instant(report["expiresAt"]) for report in reports).isoformat()
        for side in ("batting", "bowling"):
            item[side] = {k: v for k, v in first[side].items() if k != "overRuns"}
            runs = corroborated_overs((report["sourceGroup"], report[side]) for report in reports)
            if runs is not None:
                item[side]["overRuns"] = runs
    return item


def briefs(results, now):
    today = now.astimezone(NPT).date()
    stories, world = [], []
    for result in results:
        played = date.fromisoformat(result["date"])
        if not (today - timedelta(days=2) <= played <= today) or result["status"] != "Final":
            continue
        destination = world if result["competition"] == "World" else stories
        if len(destination) >= 3:
            continue
        lines = "; ".join(f"{line['team']} {line['score']}" for line in result["lines"])
        destination.append({
            "id": stable_id("brief", result["id"]), "title": result["summary"], "blurb": lines,
            "date": result["date"], "source": "Match report", "sourceUrl": result["sourceUrl"],
            "verification": result["verification"], "order": len(destination),
        })
    return stories, world


def verify(snapshot, now):
    delivery = {"verifiedAt": now.isoformat(), **{name: [] for name in COLLECTIONS}}
    review = {"checkedAt": now.isoformat(), "sourceChecks": snapshot["sourceChecks"], "held": [],
              "newsCandidates": snapshot["newsCandidates"]}
    for collection in COLLECTIONS:
        groups = defaultdict(list)
        for item in snapshot[collection]:
            groups[record_key(collection, item)].append(item)
        for reports in groups.values():
            reason, current = agreement(collection, reports, now)
            if reason:
                first = reports[0]
                review["held"].append({"collection": collection, "id": first["id"], "reason": reason,
                                       "date": first.get("date"), "sources": evidence_sources(reports)})
                continue
            delivery[collection].append(verified_record(collection, current, now))
        items = delivery[collection]
        items.sort(key=lambda item: (item.get("date", ""), item["id"]), reverse=collection == "results")
        for i, item in enumerate(items):
            item["order"] = i
    delivery["stories"], delivery["worldNews"] = briefs(delivery["results"], now)
    return delivery, review


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--review", required=True, type=Path)
    args = parser.parse_args()
    snapshot = json.loads(args.input.read_text(encoding="utf-8"))
    delivery, review = verify(snapshot, datetime.now(timezone.utc))
    write_snapshot(review, args.review)
    write_snapshot(delivery, args.output)


if __name__ == "__main__":
    main()
