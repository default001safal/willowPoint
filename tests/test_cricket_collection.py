import io
import json
import unittest
from datetime import date, datetime, timedelta, timezone
from zipfile import ZipFile

from scripts.collect_cricket import collect, collect_archive, collect_calendar, collect_live, collect_news, innings_total


NOW = datetime(2026, 12, 6, 8, tzinfo=timezone.utc)
LIVE_SOURCE = {
    "id": "approved-qualifier",
    "name": "Example scorer",
    "url": "https://example.org/scorecard.html",
    "kind": "live",
    "tableId": "scorecard",
    "series": "Test fixture",
    "venue": "Kirtipur",
    "competition": "Nepal",
    "startAt": (NOW - timedelta(hours=2)).isoformat(),
    "endAt": (NOW + timedelta(hours=2)).isoformat(),
}


def scorecard(status="live", updated=NOW):
    return f'''<table id="scorecard" data-status="{status}" data-updated-at="{updated.isoformat()}"
                     data-max-overs="20" data-batting="Nepal" data-target="170">
      <tr><th>Team</th><th>Runs</th><th>Wickets</th><th>Overs</th><th>Runs by over</th></tr>
      <tr><td>UAE</td><td>169</td><td>7</td><td>20</td><td></td></tr>
      <tr><td>Nepal</td><td>131</td><td>3</td><td>14.2</td><td>8,12,-</td></tr>
    </table>'''.encode()


class CricketCollectionTests(unittest.TestCase):
    def test_wides_and_no_balls_count_as_runs_but_not_legal_deliveries(self):
        innings = {"team": "Nepal", "overs": [{"over": 0, "deliveries": [
            {"runs": {"total": 1}, "extras": {"wides": 1}},
            {"runs": {"total": 2}, "extras": {"noballs": 1}},
            {"runs": {"total": 4}},
            {"runs": {"total": 0}, "wickets": [{"kind": "caught"}]},
        ]}]}
        result = innings_total(innings, 6)
        self.assertEqual(result["score"], "7/1")
        self.assertEqual(result["overs"], "0.2")
        self.assertEqual(result["overRuns"], [7])

    def test_fresh_live_score_reconciles_chase_without_guessing_overs(self):
        match, = collect_live(scorecard(), LIVE_SOURCE, NOW)["liveMatches"]
        self.assertEqual(match["batting"]["name"], "Nepal")
        self.assertEqual(match["bowling"]["name"], "UAE")
        self.assertEqual(match["ballsLeft"], 34)
        self.assertEqual(match["runRate"], "9.14")
        self.assertEqual(match["requiredRate"], "6.88")
        self.assertEqual(match["batting"]["overRuns"], [8, 12, None])
        self.assertNotIn("overRuns", match["bowling"])

    def test_archive_or_stale_score_never_shows_as_live(self):
        self.assertEqual(collect_live(scorecard("final"), LIVE_SOURCE, NOW)["liveMatches"], [])
        old = scorecard(updated=NOW - timedelta(minutes=10))
        self.assertEqual(collect_live(old, LIVE_SOURCE, NOW)["liveMatches"], [])
        outside_match = NOW + timedelta(hours=3)

        def unexpected_request(url):
            self.fail(f"Source queried outside its match window: {url}")

        self.assertEqual(collect([LIVE_SOURCE], "live", outside_match, unexpected_request)["liveMatches"], [])

    def test_fixtures_keep_their_identity_when_date_changes(self):
        source = {
            "name": "Example calendar", "url": "https://example.org/calendar.html",
            "series": {"qualifier": {"title": "Qualifier", "venue": "Nepal"}},
            "seasonStartYear": 2026, "seasonStartMonth": 10,
        }
        html = b'''<h3 id="qualifier">Qualifier</h3><table>
          <tr><th>No.</th><th>Date</th><th>Team 1</th><th>Team 2</th><th>Venue</th><th>Result</th></tr>
          <tr><td>1st ODI</td><td>6 January</td><td>Nepal</td><td>Italy</td><td>Kirtipur</td><td></td></tr>
        </table>'''
        original = collect_calendar(html, source, NOW.date())
        moved = collect_calendar(html.replace(b"6 January", b"8 January"), source, NOW.date())
        self.assertEqual(original["fixtures"][0]["date"], "2027-01-06")
        self.assertEqual(moved["fixtures"][0]["date"], "2027-01-08")
        self.assertEqual(original["fixtures"][0]["id"], moved["fixtures"][0]["id"])
        self.assertEqual(moved["events"][0]["endDate"], "2027-01-08")
        self.assertEqual(moved["fixtures"][0]["event"], moved["events"][0]["id"])

    def test_archive_uses_source_metadata_and_a_universal_recent_result_window(self):
        match = {
            "info": {
                "dates": ["2026-11-20"], "event": {"name": "Example Championship"},
                "teams": ["Alpha", "Beta"], "gender": "male", "balls_per_over": 6,
                "outcome": {"winner": "Alpha", "by": {"runs": 5}},
            },
            "innings": [],
        }
        archive = io.BytesIO()
        with ZipFile(archive, "w") as output:
            output.writestr("1001.json", json.dumps(match))
            output.writestr("1002.json", json.dumps({
                **match, "info": {**match["info"], "dates": ["2026-10-01"]},
            }))
        source = {
            "name": "Example archive", "url": "https://example.org/archive.zip",
            "competition": "Example League",
        }
        records = collect_archive(archive.getvalue(), source, NOW.date())["results"]
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["competition"], "Example League")

    def test_rss_retains_news_leads_and_discards_article_content(self):
        source = {"name": "Example news", "url": "https://example.org/rss", "articlePath": "/cricket/",
                  "section": "World", "competition": "Example Cup"}
        xml = b'''<rss><channel><item><title>Squad confirmed</title>
          <pubDate>Sun, 06 Dec 2026 10:15:00 +0545</pubDate>
          <link>https://example.org/cricket/2026/12/6/squad?tracking=1</link>
          <description>Article body</description></item></channel></rss><footer/>'''
        candidate, = collect_news(xml, source, date(2026, 12, 6))["newsCandidates"]
        self.assertTrue(candidate["reviewRequired"])
        self.assertEqual(candidate["sourceUrl"], "https://example.org/cricket/2026/12/6/squad")
        self.assertEqual(candidate["publishedAt"], "2026-12-06T10:15:00+05:45")
        self.assertEqual(candidate["competition"], "Example Cup")
        self.assertNotIn("Article body", str(candidate))


if __name__ == "__main__":
    unittest.main()
