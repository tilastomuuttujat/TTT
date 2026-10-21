"""Frozen-batch checks plus optional PostgreSQL integration (TEST_DATABASE_URL)."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from evidence_fixture import synthetic_bundle, write_fixture

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("replay", ROOT / "scripts/replay-atlas-evidence.py")
replay = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(replay)


class EvidenceValidation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture_dir = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.fixture_dir.cleanup)
        write_fixture(cls.fixture_dir.name)
        cls.directory = Path(cls.fixture_dir.name)
        cls.bundle, cls.manifest, cls.counts = replay.load_batch(cls.directory)

    def modified(self):
        return copy.deepcopy(self.bundle)

    def first_metric(self, b):
        return b["case_fields"][0]["fields"]["deepened_evidence_20261021"]["episodes"][0]["metrics"][0]

    def test_full_batch_and_arithmetic(self):
        self.assertEqual(self.counts["phase_checks"] + self.counts["trend_checks"] + self.counts["endpoint_checks"], 7)
        self.assertEqual(self.counts["observation_references"], 8)
        self.assertEqual(self.counts["source_observations"], 8)

    def test_changed_source_is_rejected(self):
        b = self.modified()
        b["source_observations"][0]["value"] += 1
        with self.assertRaisesRegex(ValueError, "Source differs"):
            replay.validate(b)

    def test_wrong_mean_is_rejected(self):
        b = self.modified()
        self.first_metric(b)["pre"]["mean"] += 1
        with self.assertRaisesRegex(ValueError, "Arithmetic mismatch"):
            replay.validate(b)

    def test_wrong_endpoint_is_rejected(self):
        b = self.modified()
        self.first_metric(b)["shock_vs_baseline"]["endpoint_year"] -= 1
        with self.assertRaisesRegex(ValueError, "Endpoint shifted"):
            replay.validate(b)

    def test_wrong_slope_is_rejected(self):
        b = self.modified()
        self.first_metric(b)["pre"]["trend"]["slope_units_per_year"] += 1
        with self.assertRaisesRegex(ValueError, "slope"):
            replay.validate(b)

    def test_duplicate_observation_is_rejected(self):
        b = self.modified()
        b["source_observations"].append(b["source_observations"][0])
        with self.assertRaisesRegex(ValueError, "Duplicate source"):
            replay.validate(b)

    def test_duplicate_json_key_and_nonfinite_are_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "input.json"
            for text in ('{"value":1,"value":2}', '{"value":NaN}'):
                p.write_text(text)
                with self.assertRaises(ValueError):
                    replay.read_json(p)

    def test_snapshot_cannot_be_annualized(self):
        b = self.modified()
        b["indicator_values"][0]["meta"]["not_annual"] = False
        with self.assertRaisesRegex(ValueError, "annualized"):
            replay.validate(b)

    def test_causal_escalation_is_rejected(self):
        b = self.modified()
        b["case_fields"][0]["fields"]["deepened_evidence_20261021"]["causal_confirmation"] = True
        with self.assertRaisesRegex(ValueError, "Causal"):
            replay.validate(b)

    def test_default_sql_rolls_back_and_is_deterministic(self):
        sql = replay.make_sql(self.bundle)
        self.assertTrue(sql.endswith("rollback;\n"))
        self.assertEqual(sql, replay.make_sql(self.bundle))
        self.assertTrue(replay.make_sql(self.bundle, True).endswith("commit;\n"))
        self.assertNotIn("create function", sql.lower())

    def test_checksum_detects_edited_bundle(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            (p / "manifest.json").write_bytes((self.directory / "manifest.json").read_bytes())
            (p / "bundle.json").write_bytes((self.directory / "bundle.json").read_bytes() + b" ")
            with self.assertRaisesRegex(ValueError, "checksum"):
                replay.load_batch(p)

    def test_source_and_canonical_record_must_agree(self):
        b = self.modified()
        b["case_fields"][0]["fields"]["decision_implementation_20261021"]["records"][0]["summary"] = "changed"
        with self.assertRaisesRegex(ValueError, "canonical"):
            replay.validate(b)

    def test_sql_quotes_and_dollar_tag_do_not_escape(self):
        b = self.modified()
        b["scope"] = "quote ' slash \\ newline\n $atlas_replay$; drop table x;"
        sql = replay.make_sql(b)
        tag = "$atlas_" + replay.digest(b) + "$"
        self.assertEqual(sql.count(tag), 2)
        self.assertEqual(replay.sql_literal("O'Brien"), "'O''Brien'")


@unittest.skipUnless(os.environ.get("TEST_DATABASE_URL"), "TEST_DATABASE_URL not set")
class PostgreSQLReplay(unittest.TestCase):
    """Use a disposable empty local database ONLY. Never a Supabase production URL."""

    @classmethod
    def setUpClass(cls):
        cls.bundle = synthetic_bundle()
        url = os.environ["TEST_DATABASE_URL"]
        if replay.urlparse(url).hostname not in ("localhost", "127.0.0.1", "::1"):
            raise ValueError("Integration tests require a disposable localhost database")

    def psql(self, sql, ok=True):
        env = os.environ.copy()
        env["PGDATABASE"] = env["TEST_DATABASE_URL"]
        r = subprocess.run(["psql", "-X", "-At", "--no-password", "--set", "ON_ERROR_STOP=1"],
                           input=sql, text=True, capture_output=True, env=env)
        if ok:
            self.assertEqual(r.returncode, 0, r.stderr)
        else:
            self.assertNotEqual(r.returncode, 0)
        return r

    def setUp(self):
        # Refuse to replace pre-existing tables: fixture errors rather than DROP/TRUNCATE.
        series_types = {"lenses": "text[]", "quality": "jsonb", "metadata": "jsonb",
                        "published": "boolean", "start_year": "int", "end_year": "int"}
        value_types = {"year": "int", "value": "numeric", "meta": "jsonb", "is_published": "boolean"}
        columns = lambda names, types: ",".join(n + " " + types.get(n, "text") for n in names)
        self.psql("create table atlas_mechanism_cases(id uuid primary key,data jsonb);"
                  "create table dataset_meta(id text primary key,data jsonb);"
                  f"create table indicator_series({columns(replay.SERIES_COLUMNS,series_types)},primary key(series_key));"
                  f"create table indicator_values({columns(replay.VALUE_COLUMNS,value_types)},primary key(series_key,year,group_key));")
        seed = []
        for c in self.bundle["case_fields"]:
            seed.append(f"insert into atlas_mechanism_cases values('{c['id']}', '{{\"unrelated\":\"preserve\"}}');")
        for row in self.bundle["source_observations"]:
            seed.append("insert into indicator_values select * from jsonb_populate_record(null::indicator_values,"
                        + replay.sql_literal(replay.compact(row)) + "::jsonb);")
        self.psql("\n".join(seed))

    def tearDown(self):
        self.psql("drop table atlas_mechanism_cases,dataset_meta,indicator_values,indicator_series;")

    def snapshot(self):
        return self.psql("select 'c',to_jsonb(t) from atlas_mechanism_cases t order by id;"
                         "select 'm',to_jsonb(t) from dataset_meta t order by id;"
                         "select 's',to_jsonb(t) from indicator_series t order by series_key;"
                         "select 'v',to_jsonb(t) from indicator_values t order by series_key,year,group_key;").stdout

    def test_atomic_replay_and_idempotency(self):
        before = self.snapshot()
        self.psql(replay.make_sql(self.bundle))
        self.assertEqual(self.snapshot(), before, "Dry run mutated database")
        first = self.psql(replay.make_sql(self.bundle, True))
        self.assertIn("patched fields=2", first.stderr)
        once = self.snapshot()
        second = self.psql(replay.make_sql(self.bundle, True))
        self.assertIn("inserted rows=0, patched fields=0", second.stderr)
        self.assertEqual(self.snapshot(), once)
        self.assertEqual(self.psql("select count(*) from atlas_mechanism_cases where data->>'unrelated'='preserve';").stdout.strip(), "1")

    def test_changed_source_fails_without_mutation(self):
        self.psql("update indicator_values set value=value+1;")
        before = self.snapshot()
        self.psql(replay.make_sql(self.bundle, True), ok=False)
        self.assertEqual(self.snapshot(), before)

    def test_late_conflict_rolls_back_earlier_inserts(self):
        # Report conflicts are checked after series and case changes; all must roll back.
        rid = self.bundle["dataset_meta"][0]["id"]
        self.psql(f"insert into dataset_meta values('{rid}', '{{\"newer\":true}}');")
        before = self.snapshot()
        self.psql(replay.make_sql(self.bundle, True), ok=False)
        self.assertEqual(self.snapshot(), before)

    def test_missing_base_card_fails_without_partial_import(self):
        cid = self.bundle["case_fields"][0]["id"]
        self.psql(f"delete from atlas_mechanism_cases where id='{cid}';")
        before = self.snapshot()
        self.psql(replay.make_sql(self.bundle, True), ok=False)
        self.assertEqual(self.snapshot(), before)


if __name__ == "__main__":
    unittest.main()
