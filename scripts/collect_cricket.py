#!/usr/bin/env python3
"""Collect cricket data into a review snapshot using public files and HTML."""

import argparse
import hashlib
import io
import json
import re
import sys
import tempfile
import time
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from urllib.robotparser import RobotFileParser
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile
from zoneinfo import ZoneInfo


NPT = ZoneInfo("Asia/Kathmandu")
AGENT = "willowPointBot/0.1 (+https://github.com/default001safal/willowPoint)"
ROOT = Path(__file__).resolve().parents[1]
MAX_DOWNLOAD = 12 * 1024 * 1024


def clean(value):
    return " ".join(value.split())


def stable_id(prefix, value):
    return f"{prefix}-{hashlib.sha256(value.encode()).hexdigest()[:16]}"


def https_url(url):
    parts = urlsplit(url)
    if parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
        raise ValueError("Expected a public HTTPS URL without credentials")
    return parts


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Fetcher:
    def __init__(self):
        self.opener = build_opener(NoRedirect())
        self.robots = {}

    def download(self, url, limit=MAX_DOWNLOAD):
        request = Request(url, headers={"User-Agent": AGENT})
        with self.opener.open(request, timeout=15) as response:
            data = response.read(limit + 1)
        if len(data) > limit:
            raise ValueError("Response exceeds the download limit")
        return data

    def get(self, url):
        parts = https_url(url)
        origin = urlunsplit((parts.scheme, parts.netloc, "", "", ""))
        if origin not in self.robots:
            robots = RobotFileParser(origin + "/robots.txt")
            try:
                rules = self.download(robots.url, 512 * 1024).decode("utf-8-sig")
            except HTTPError as error:
                if error.code != 404:
                    raise
                rules = ""
            robots.parse(rules.splitlines())
            self.robots[origin] = robots
        if not self.robots[origin].can_fetch(AGENT, url):
            raise ValueError("The source's robots.txt disallows this URL")
        return self.download(url)


def provenance(source, url=None):
    result = {"source": source["name"], "sourceUrl": url or source["url"]}
    if "id" in source:
        result.update(sourceId=source["id"], sourceGroup=source.get("group", source["name"]))
    if source.get("license"):
        result["licenseUrl"] = source["license"]
    return result


def innings_total(innings, balls_per_over):
    over_runs = []
    balls = wickets = 0
    for index, over in enumerate(innings["overs"]):
        if over["over"] != index:
            raise ValueError("The innings has a gap in its overs")
        total = 0
        for ball in over["deliveries"]:
            runs = ball["runs"]["total"]
            if type(runs) is not int or runs < 0:
                raise ValueError("Invalid delivery total")
            total += runs
            extras = ball.get("extras", {})
            if not (extras.get("wides") or extras.get("noballs")):
                balls += 1
            wickets += sum(wicket["kind"] != "retired hurt" for wicket in ball.get("wickets", []))
        over_runs.append(total)
    penalties = innings.get("penalty_runs", {})
    whole, rem = divmod(balls, balls_per_over)
    return {
        "team": innings["team"],
        "score": f"{sum(over_runs) + penalties.get('pre', 0) + penalties.get('post', 0)}/{wickets}",
        "overs": f"{whole}.{rem}",
        "overRuns": over_runs,
        "legalBalls": balls,
    }


def archive_outcome(outcome):
    winner = outcome.get("winner")
    if winner:
        if outcome.get("eliminator") == winner:
            return "Final", f"{winner} won the Super Over"
        for unit in ("wickets", "runs"):
            margin = outcome.get("by", {}).get(unit)
            if margin is not None:
                method = outcome.get("method")
                suffix = f" ({method})" if method else ""
                word = unit.rstrip("s") if margin == 1 else unit
                return "Final", f"{winner} won by {margin} {word}{suffix}"
        return "Final", f"{winner} won"
    status = {"tie": "Tie", "draw": "Draw", "no result": "No result", "abandoned": "Abandoned"}.get(outcome.get("result"))
    if not status:
        raise ValueError("Missing match outcome")
    return status, status


def collect_archive(body, source, today):
    results = []
    with ZipFile(io.BytesIO(body)) as archive:
        entries = [item for item in archive.infolist() if re.fullmatch(r"\d+\.json", item.filename)]
        if not entries or len(entries) > 1200 or sum(item.file_size for item in entries) > 100 * 1024 * 1024:
            raise ValueError("Unexpected size or format for the match archive")
        for item in entries:
            match = json.loads(archive.read(item))
            info = match["info"]
            start = date.fromisoformat(info["dates"][0])
            if not today - timedelta(days=30) <= start <= today:
                continue
            title = info.get("event", {}).get("name") or " v ".join(info["teams"])
            status, summary = archive_outcome(info["outcome"])
            competition = source.get("competition")
            if not competition:
                competition = "World"
                if "Nepal" in info["teams"]:
                    competition = "Nepal Women" if info["gender"] == "female" else "Nepal"
            results.append({
                "id": "cricsheet-" + item.filename.removesuffix(".json"),
                "date": start.isoformat(),
                "label": f"{title} · {start.day} {start:%b %Y}",
                "competition": competition,
                "lines": [innings_total(innings, info["balls_per_over"])
                          for innings in match.get("innings", []) if not innings.get("super_over")],
                "status": status,
                "summary": summary,
                **provenance(source),
            })
    return {"results": results}


class Tables(HTMLParser):
    """Read visible cell text and table attributes, ignoring nested tables and reference notes."""

    def __init__(self, body):
        super().__init__(convert_charrefs=True)
        self.tables = []
        self.section = ""
        self.depth = self.ignored = 0
        self.cell = self.row = None
        self.feed(body.decode("utf-8-sig"))
        self.close()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"sup", "script", "style"}:
            self.ignored += 1
        if self.ignored:
            return
        if tag in {"h2", "h3"} and not self.depth:
            self.section = attrs.get("id", "") if tag == "h3" else ""
        if tag == "table":
            self.depth += 1
            if self.depth == 1:
                self.tables.append((self.section, attrs, []))
        if self.depth != 1:
            return
        if tag == "tr":
            self.row = []
        if tag in {"td", "th"} and self.row is not None:
            self.cell = []
        if tag == "br" and self.cell is not None:
            self.cell.append(" ")

    def handle_endtag(self, tag):
        if self.ignored:
            if tag in {"sup", "script", "style"}:
                self.ignored -= 1
            return
        if self.depth == 1:
            if tag in {"td", "th"} and self.cell is not None:
                self.row.append(clean("".join(self.cell)))
                self.cell = None
            if tag == "tr" and self.row:
                self.tables[-1][2].append(self.row)
                self.row = None
        if tag == "table" and self.depth:
            self.depth -= 1

    def handle_data(self, text):
        if self.depth == 1 and not self.ignored and self.cell is not None:
            self.cell.append(text)


def table_records(rows, required):
    columns = None
    for row in rows:
        normalized = [cell.casefold() for cell in row]
        if required.issubset(normalized):
            columns = normalized
        elif columns and len(row) == len(columns):
            yield dict(zip(columns, row))


def fixture_date(text, source):
    if not re.fullmatch(r"\d{1,2} [A-Za-z]+(?: \d{4})?", text):
        return None
    if text[-4:].isdigit():
        return datetime.strptime(text, "%d %B %Y").date()
    # Parse with a leap year, then assign the season's actual year.
    stamp = datetime.strptime(text + " 2000", "%d %B %Y")
    year = source["seasonStartYear"] + (stamp.month < source["seasonStartMonth"])
    return date(year, stamp.month, stamp.day)


def collect_calendar(body, source, today):
    fixtures, events = [], {}
    sessions = source["series"]
    for section, _, rows in Tables(body).tables:
        if section not in sessions:
            continue
        event = sessions[section]
        for row in table_records(rows, {"no.", "date", "team 1", "team 2", "venue"}):
            scheduled = fixture_date(row["date"], source)
            if scheduled is None:
                continue
            url = source["url"] + "#" + quote(section, safe="_")
            info = provenance(source, url)
            day = scheduled.isoformat()
            series = events.setdefault(section, {
                "id": stable_id("event", section), "title": event["title"],
                "eventKey": section, "date": day, "endDate": day, "venue": event["venue"], **info,
            })
            series["date"] = min(day, series["date"])
            series["endDate"] = max(day, series["endDate"])
            home, away = row["team 1"], row["team 2"]
            involves_nepal = "nepal" in {home.casefold(), away.casefold()}
            if scheduled < today or not involves_nepal or row.get("result") or "TBD" in {home, away}:
                continue
            fixtures.append({
                "id": stable_id("fixture", section + ":" + row["no."]),
                "event": series["id"], "eventKey": section, "teams": [home, away],
                "date": day, "title": f"{home} v {away}", "time": "Time TBC",
                "venue": row["venue"], "competition": "Nepal", "nepal": True, **info,
            })
    if set(sessions) != events.keys():
        raise ValueError("Expected tournament tables could not be read")
    return {"fixtures": fixtures, "events": [event for event in events.values() if event["endDate"] >= today.isoformat()]}


def article_timing(item, path):
    """Return the publication date and the most precise timestamp the feed supplies."""
    published_at = item.findtext("pubDate")
    if published_at:
        try:
            timestamp = parsedate_to_datetime(published_at)
            if timestamp.tzinfo is not None:
                localized = timestamp.astimezone(NPT)
                return localized.date(), localized.isoformat()
        except ValueError:
            pass
    match = re.search(r"/(\d{4})/(\d{1,2})/(\d{1,2})/", path)
    try:
        return (date(*map(int, match.groups())), None) if match else (None, None)
    except ValueError:
        return None, None


def collect_news(body, source, today):
    # Some feeds append a footer after the RSS document. Only parse the XML document.
    end = body.find(b"</rss>")
    if end != -1:
        body = body[:end + len(b"</rss>")]
    if re.search(rb"<!\s*(?:DOCTYPE|ENTITY)\b", body, re.I):
        raise ValueError("XML entity declarations are not supported")
    root = ElementTree.fromstring(body)
    if root.tag != "rss" or root.find("channel") is None:
        raise ValueError("Expected a published RSS feed")
    candidates = []
    host = source.get("articleHost", urlsplit(source["url"]).netloc)
    for item in root.findall("./channel/item"):
        link = clean(item.findtext("link", ""))
        if not link:
            continue
        url = urlsplit(link)
        if url.scheme != "https" or url.netloc != host or not url.path.startswith(source["articlePath"]):
            continue
        published, published_at = article_timing(item, url.path)
        if not published or not today - timedelta(days=7) <= published <= today:
            continue
        canonical = urlunsplit((url.scheme, url.netloc, url.path.rstrip("/"), "", ""))
        title = clean(item.findtext("title", ""))
        if not title or (source.get("headlinePattern") and not re.search(source["headlinePattern"], title, re.I)):
            continue
        candidates.append({
            "id": stable_id("story", canonical), "date": published.isoformat(),
            "publishedAt": published_at or f"{published.isoformat()}T00:00:00+05:45",
            "title": title, "section": source.get("section", "Nepal"),
            "competition": source.get("competition", source.get("section", "Nepal")), "reviewRequired": True,
            **provenance(source, canonical),
        })
    return {"newsCandidates": candidates}


class PageText(HTMLParser):
    def __init__(self, body):
        super().__init__()
        self.parts = []
        self.metadata = {}
        self.hidden = False
        self.feed(body.decode("utf-8-sig"))

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style"}:
            self.hidden = True
        if tag == "meta":
            properties = dict(attrs)
            if properties.get("property"):
                self.metadata[properties["property"]] = properties.get("content", "")

    def handle_endtag(self, tag):
        if tag in {"script", "style"}:
            self.hidden = False

    def handle_data(self, text):
        if not self.hidden:
            self.parts.append(text)


def collect_event_page(body, source, today):
    for _, attrs, rows in Tables(body).tables:
        if "infobox" not in attrs.get("class", "").split():
            continue
        fields = {row[0]: row[1] for row in rows if len(row) == 2}
        dates = fields.get("Dates", "")
        match = re.fullmatch(r"(\d{1,2})(?: ([A-Za-z]+))?(?:\s*[–-]\s*(\d{1,2}) ([A-Za-z]+))?\s+(\d{4})", dates)
        if not match:
            continue
        start_day, start_month, end_day, end_month, year = match.groups()
        first = datetime.strptime(f"{start_day} {start_month or end_month} {year}", "%d %B %Y").date()
        last = datetime.strptime(f"{end_day} {end_month} {year}", "%d %B %Y").date() if end_day else first
        if last < today:
            return {"events": []}
        place = fields.get("Hosts", fields.get("Host", ""))
        if source.get("venue"):
            # The infobox can concatenate the two host names without a separator.
            host_tokens = source["venue"].split(" and ")
            context = place or clean(" ".join(PageText(body).parts))
            if not all(token.casefold() in context.casefold() for token in host_tokens):
                continue
            place = source["venue"]
        if place:
            return {"events": [{"id": stable_id("event", source["eventKey"]), "eventKey": source["eventKey"],
                                "title": source["title"], "date": first.isoformat(), "endDate": last.isoformat(),
                                "venue": place, **provenance(source)}]}
    raise ValueError("Tournament dates and venue could not be read")


def collect_reference(source, today):
    records = json.loads((ROOT / "scripts/cricket_references.json").read_text(encoding="utf-8"))[source["id"]]
    return {
        name: [dict(item, recordedReference=True, **provenance(source)) for item in items
               if (name == "results" and today - timedelta(days=30) <= date.fromisoformat(item["date"]) <= today)
               or (name != "results" and item.get("endDate", item["date"]) >= today.isoformat())]
        for name, items in records.items()
    }


def instant(value):
    timestamp = datetime.fromisoformat(value)
    if timestamp.tzinfo is None:
        raise ValueError("Score timestamps must include an offset")
    return timestamp


def score_team(row, limit):
    runs, wickets = int(row["runs"]), int(row["wickets"])
    match = re.fullmatch(r"(\d+)(?:\.([0-5]))?", row["overs"])
    if not match or not row["team"] or runs < 0 or not 0 <= wickets <= 10:
        raise ValueError("Invalid innings in the live scorecard")
    overs, deliveries = int(match[1]), int(match[2] or 0)
    balls = 6 * overs + deliveries
    if balls > 6 * limit:
        raise ValueError("Legal deliveries exceed the innings limit")
    team = {"name": row["team"], "runs": runs, "wickets": wickets, "overs": f"{overs}.{deliveries}"}
    values = row.get("runs by over", "")
    if values:
        totals = [int(value.strip()) if value.strip() not in {"", "-", "—"} else None for value in values.split(",")]
        played = overs + bool(deliveries)
        if len(totals) > min(limit, played + 1) or any(value is not None and value < 0 for value in totals):
            raise ValueError("Invalid runs by over")
        if sum(value or 0 for value in totals) > runs:
            raise ValueError("Runs by over exceed the reported innings score")
        team["overRuns"] = totals
    return team, balls


def collect_live(body, source, now):
    tables = [(attrs, rows) for _, attrs, rows in Tables(body).tables if attrs.get("id") == source["tableId"]]
    if len(tables) != 1:
        raise ValueError("Expected exactly one scorecard table")
    attrs, rows = tables[0]
    status = attrs.get("data-status")
    if status in {"scheduled", "break", "delayed", "final", "abandoned"}:
        return {"liveMatches": []}
    if status != "live":
        raise ValueError("The scorecard has no recognized match status")
    updated = instant(attrs["data-updated-at"])
    if not now - timedelta(minutes=5) <= updated <= now + timedelta(seconds=30):
        return {"liveMatches": []}
    limit = int(attrs["data-max-overs"])
    if not 1 <= limit <= 50:
        raise ValueError("Expected a limited overs match")
    active = attrs.get("data-batting")
    # In a rain-shortened chase, the first innings may have had a higher limit.
    teams = [score_team(row, limit if row["team"] == active else 50)
             for row in table_records(rows, {"team", "runs", "wickets", "overs"})]
    if len(teams) != 2 or len({team["name"] for team, _ in teams}) != 2 or active not in {team["name"] for team, _ in teams}:
        raise ValueError("Expected two innings rows and a named batting side")
    batting, balls = next(item for item in teams if item[0]["name"] == active)
    bowling = next(team for team, _ in teams if team["name"] != active)
    target = int(attrs["data-target"]) if attrs.get("data-target") else None
    if target is not None and target < 1:
        raise ValueError("Invalid chase target")
    remaining = 6 * limit - balls
    if batting["wickets"] == 10 or not remaining or (target is not None and batting["runs"] >= target):
        return {"liveMatches": []}
    return {"liveMatches": [{
        "id": source.get("matchId", source["id"]), "batting": batting, "bowling": bowling, "target": target,
        "maxOvers": limit, "ballsLeft": remaining,
        "runRate": f"{6 * batting['runs'] / balls:.2f}" if balls else None,
        "requiredRate": f"{6 * max(0, target - batting['runs']) / remaining:.2f}" if target and remaining else None,
        "series": source["series"], "venue": source["venue"], "competition": source["competition"],
        "updatedAt": updated.isoformat(), "expiresAt": (updated + timedelta(minutes=5)).isoformat(),
        **provenance(source),
    }]}


def live_sources(sources, now):
    return [source for source in sources if source.get("enabled", True) and source["kind"] == "live"
            and instant(source["startAt"]) <= now <= instant(source["endAt"])]


def collect(sources, lane, now, fetch, include_reports=False):
    snapshot = {"collectedAt": now.isoformat(), "fixtures": [], "events": [],
                "results": [], "newsCandidates": [], "liveMatches": []}
    today = now.astimezone(NPT).date()
    adapters = {"archive": collect_archive, "calendar": collect_calendar,
                "rss": collect_news, "event": collect_event_page}
    selected = live_sources(sources, now) if lane == "live" else [
        source for source in sources if source.get("enabled", True) and source["kind"] != "live"
    ]
    checks = []
    for source in selected:
        try:
            if source["kind"] == "reference":
                records = collect_reference(source, today)
                status = "recorded reference"
            else:
                body = fetch(source["url"])
                records = collect_live(body, source, now) if lane == "live" else adapters[source["kind"]](body, source, today)
                status = "fetched"
            for name, items in records.items():
                snapshot[name].extend(items)
            checks.append({"id": source["id"], "status": status, "records": sum(map(len, records.values()))})
        except (OSError, ValueError, KeyError, TypeError, AttributeError, BadZipFile, ElementTree.ParseError) as error:
            if not include_reports:
                raise ValueError(f"{source['id']}: {error}") from error
            checks.append({"id": source["id"], "status": "unavailable", "error": str(error)})

    if include_reports:
        if checks and all(check["status"] == "unavailable" for check in checks):
            raise ValueError("Every configured source failed")
        return {**snapshot, "sourceChecks": checks}

    for name in ("fixtures", "events", "results", "newsCandidates", "liveMatches"):
        items = {}
        for item in snapshot[name]:
            # The configured source order prefers delivery archives over summary scorecards.
            items.setdefault(item["id"], item)
        latest_first = name in {"results", "newsCandidates"}
        ordered = sorted(items.values(), key=lambda item: (item.get("date", ""), item["id"]), reverse=latest_first)
        snapshot[name] = [dict(item, order=index) for index, item in enumerate(ordered)]
    return snapshot


def write_snapshot(snapshot, output):
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=output.parent, mode="w", encoding="utf-8", delete=False) as file:
        path = Path(file.name)
        json.dump(snapshot, file, ensure_ascii=False, indent=2)
        file.write("\n")
    path.replace(output)
    counts = {name: len(items) for name, items in snapshot.items() if isinstance(items, list)}
    print(json.dumps(counts) + f" written to {output}", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources", type=Path, default=ROOT / "scripts/cricket_sources.json")
    parser.add_argument("--lane", choices=("daily", "live"), default="daily")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--reports", action="store_true", help="retain reports from each source for verification")
    parser.add_argument("--watch", action="store_true", help="repeat live checks during active match windows")
    args = parser.parse_args()
    if args.watch and args.lane != "live":
        parser.error("--watch requires --lane live")
    output = args.output or ROOT / ".cricket-collection" / f"{args.lane}.json"
    try:
        sources = json.loads(args.sources.read_text(encoding="utf-8"))
        fetch = Fetcher().get
        while True:
            now = datetime.now(timezone.utc)
            snapshot = collect(sources, args.lane, now, fetch, args.reports)
            write_snapshot(snapshot, output)
            if not args.watch or not live_sources(sources, now):
                return 0
            time.sleep(60)
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"Collection failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
