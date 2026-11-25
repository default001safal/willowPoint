import unittest
from datetime import datetime, timedelta, timezone

from scripts.collect_cricket import collect
from scripts.verify_cricket import verify


NOW = datetime(2026, 11, 22, 6, tzinfo=timezone.utc)


def source(name, page="source"):
    return {"source": name, "sourceGroup": name, "sourceUrl": f"https://example.org/{page}"}


def fixture(name, **overrides):
    record = {
        "id": "nepal-uae", "eventKey": "playoff", "teams": ["Nepal", "UAE"],
        "date": "2026-12-10", "title": "Nepal v UAE", "time": "Time TBC",
        "venue": "Tribhuvan University Cricket Ground", **source(name),
    }
    return {**record, **overrides}


def live(name, overs="14.2", age=0):
    updated = NOW - timedelta(minutes=age)
    return {
        "id": "nepal-uae", "target": 170, "maxOvers": 20,
        "batting": {"name": "Nepal", "runs": 131, "wickets": 3, "overs": overs, "overRuns": [8, 12]},
        "bowling": {"name": "UAE", "runs": 169, "wickets": 7, "overs": "20.0"},
        "updatedAt": updated.isoformat(), "expiresAt": (updated + timedelta(minutes=5)).isoformat(),
        **source(name),
    }


def snapshot(**overrides):
    return {"fixtures": [], "events": [], "results": [], "liveMatches": [],
            "sourceChecks": [], "newsCandidates": [], **overrides}


class CricketVerificationTests(unittest.TestCase):
    def test_mirrored_reports_count_once(self):
        reports = [fixture("Same publisher"), fixture("Same publisher", sourceUrl="https://example.org/mirror")]
        delivery, review = verify(snapshot(fixtures=reports), NOW)
        self.assertEqual(delivery["fixtures"], [])
        self.assertEqual(review["held"][0]["reason"], "only one source")

    def test_verifies_date_and_venue_while_leaving_unconfirmed_start_time_open(self):
        article = fixture("Publisher", teams=["United Arab Emirates", "Nepal"], time="09:00 NPT",
                          venue="Tribhuvan University International Cricket Ground, Kirtipur")
        delivery, _ = verify(snapshot(fixtures=[article, fixture("Organizer")]), NOW)
        result, = delivery["fixtures"]
        self.assertEqual(result["date"], "2026-12-10")
        self.assertEqual(result["time"], "Time TBC")
        self.assertEqual(len(result["verification"]["sources"]), 2)

    def test_rescheduled_fixture_with_conflicting_reports_is_held(self):
        reports = [fixture("Publisher"), fixture("Organizer", date="2026-12-12"), fixture("Third publisher")]
        delivery, review = verify(snapshot(fixtures=reports), NOW)
        self.assertEqual(delivery["fixtures"], [])
        self.assertEqual(review["held"][0]["reason"], "sources disagree")

    def test_live_waits_for_same_delivery_and_drops_stale_reports(self):
        delivery, review = verify(snapshot(liveMatches=[live("A"), live("B", overs="14.1")]), NOW)
        self.assertEqual(delivery["liveMatches"], [])
        self.assertEqual(review["held"][0]["reason"], "sources are on different deliveries")
        delivery, _ = verify(snapshot(liveMatches=[live("A"), live("B", age=5)]), NOW)
        self.assertEqual(delivery["liveMatches"], [])

    def test_live_release_expires_with_earliest_witness_and_needs_two_over_grids(self):
        first, second = live("A"), live("B", age=2)
        del second["batting"]["overRuns"]
        delivery, _ = verify(snapshot(liveMatches=[first, second]), NOW)
        result, = delivery["liveMatches"]
        self.assertEqual(result["expiresAt"], second["expiresAt"])
        self.assertNotIn("overRuns", result["batting"])

    def test_unavailable_source_does_not_stop_the_others(self):
        sources = [{"id": host, "kind": "rss", "name": host,
                    "url": f"https://{host}.example/rss", "articlePath": "/cricket/"}
                   for host in ("down", "working")]

        def fetch(url):
            if "down.example" in url:
                raise TimeoutError("Feed timed out")
            return b'''<rss><channel><item><title>Cricket squad confirmed</title>
              <link>https://working.example/cricket/2026/11/22/squad</link></item></channel></rss>'''

        reports = collect(sources, "daily", NOW, fetch, include_reports=True)
        self.assertEqual([row["status"] for row in reports["sourceChecks"]], ["unavailable", "fetched"])
        delivery, review = verify(reports, NOW)
        self.assertEqual(len(review["newsCandidates"]), 1)
        self.assertEqual(len(delivery["stories"]), 1)
        self.assertEqual(delivery["stories"][0]["kind"], "source-headline")
        self.assertNotIn("Article body", str(delivery["stories"][0]))


if __name__ == "__main__":
    unittest.main()
