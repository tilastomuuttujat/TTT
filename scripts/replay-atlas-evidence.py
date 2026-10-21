#!/usr/bin/env python3
"""Validate a frozen evidence batch and replay it atomically. Python stdlib only."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ROOT / "data/updates/20261021-evidence"
OWNED_FIELDS = {"deepened_evidence_20261021", "decision_implementation_20261021"}
SOURCE_COLUMNS = "series_key year group_key period value value_kind validation_status is_published source_url source_version".split()
SERIES_COLUMNS = "series_key title description source source_url unit geography frequency start_year end_year data_class status theme pressure_domain indicator_role lenses interpretation quality metadata published source_project_ref".split()
VALUE_COLUMNS = "series_key year group_key group_label period value value_text value_kind validation_status validation_note is_published source_url source_version meta".split()


def require(ok, message):
    if not ok:
        raise ValueError(message)


def unique_pairs(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"), object_pairs_hook=unique_pairs,
                      parse_constant=lambda s: (_ for _ in ()).throw(ValueError(f"Non-finite JSON: {s}")))


def compact(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def digest(value):
    return hashlib.sha256(compact(value).encode()).hexdigest()


def key(row):
    return row["series_key"], row["year"], row["group_key"]


def close(actual, expected, label):
    require(isinstance(actual, (int, float)) and not isinstance(actual, bool)
            and math.isfinite(actual) and math.isclose(actual, expected, rel_tol=1e-9, abs_tol=1e-8),
            f"Arithmetic mismatch: {label}")


def unique(rows, key_fn, label):
    result = {key_fn(row): row for row in rows}
    require(len(result) == len(rows), f"Duplicate {label}")
    return result


def validate(bundle):
    # Also rejects non-finite numbers in programmatically supplied bundles.
    compact(bundle)
    require(bundle["schema_version"] == 1, "Unsupported schema version")
    require(re.fullmatch(r"[a-z0-9_]+", bundle["batch_id"]), "Invalid batch id")
    require(re.fullmatch(r"[a-z0-9]{20}", bundle["project_id"]), "Invalid project id")
    cases = unique(bundle["case_fields"], lambda c: c["id"], "case")
    refs = unique(bundle["source_observations"], key, "source observation")
    unique(bundle["indicator_series"], lambda r: r["series_key"], "series")
    values = unique(bundle["indicator_values"], key, "imported observation")
    reports = unique(bundle["dataset_meta"], lambda r: r["id"], "report")
    require(bool(cases), "Empty batch")
    for row in bundle["indicator_series"]:
        require(set(row) == set(SERIES_COLUMNS), "Unexpected series fields")
        require(row["frequency"] == "period", "This batch imports period series only")
    for row in bundle["indicator_values"]:
        require(set(row) == set(VALUE_COLUMNS), "Unexpected value fields")
        require(row["meta"].get("not_annual") is True, "Period observation annualized")
    counts = dict(cards=len(cases), episodes=0, comparisons=0, observation_references=0,
                  source_observations=len(refs), imported_series=len(bundle["indicator_series"]),
                  imported_observations=len(values), phase_checks=0, trend_checks=0,
                  endpoint_checks=0, implementation_records=0, implementation_facts=0,
                  statutory_event_links=0)
    canonical_records = {r["id"]: r for r in reports["decision_implementation_20261021"]["data"]["canonical_records"]}
    episode_codes = set()
    used_refs = set()
    for case in cases.values():
        require(re.fullmatch(r"[0-9a-f-]{36}", case["id"]), "Invalid case id")
        require(set(case["fields"]) == OWNED_FIELDS, "Unexpected case field ownership")
        evidence = case["fields"]["deepened_evidence_20261021"]
        implementation = case["fields"]["decision_implementation_20261021"]
        require(evidence["causal_confirmation"] is False and implementation["causal_confirmation"] is False,
                "Causal status escalated")
        episodes = unique(evidence["episodes"], lambda e: e["code"], "episode")
        for e in episodes.values():
            require(e["code"] not in episode_codes, "Episode duplicated across cards")
            episode_codes.add(e["code"])
            require(e["causal_identification"] is False, "Causal identification escalated")
            counts["episodes"] += 1
            for metric in e["metrics"]:
                counts["comparisons"] += 1
                obs = unique(metric["observations"], lambda o: o["year"], "metric year")
                for o in obs.values():
                    k = (metric["series_key"], o["year"], metric["group_key"])
                    require(k in refs, f"Missing source: {k}")
                    source = refs[k]
                    used_refs.add(k)
                    for field in ("value", "value_kind", "validation_status"):
                        require(source[field] == o[field], f"Source differs: {k}/{field}")
                    require(source["is_published"] is True and source["value_kind"] != "projection", "Unpublished/projection source")
                    counts["observation_references"] += 1
                breaks = metric["known_break_years"]
                for phase_name in ("pre", "shock", "post"):
                    phase = metric[phase_name]
                    start, end = e[phase_name]
                    require(phase["window"] == [start, end], "Phase window differs")
                    rows = [o for y, o in obs.items() if start <= y <= end]
                    missing = sorted(set(range(start, end + 1)) - set(obs))
                    require(phase["n"] == len(rows) and phase["missing_years"] == missing,
                            "Phase coverage differs")
                    require(phase["expected_calendar_years"] == end - start + 1, "Phase calendar count differs")
                    crosses = any(start < y <= end for y in breaks)
                    mean_status = ("no_observations" if not rows else "withheld_method_break" if crosses
                                   else "partial_window_not_full_mean" if missing else "complete_window")
                    require(phase["mean_status"] == mean_status, "Invalid phase mean status")
                    if rows and not crosses:
                        close(phase["mean"], sum(o["value"] for o in rows) / len(rows), "mean")
                    else:
                        require(phase["mean"] is None, "Mean crosses break or empty window")
                    counts["phase_checks"] += 1
                    trend = phase["trend"]
                    # Trends use observed year range; no crossing if all observed years lie on one side.
                    actual_break = bool(rows) and any(min(o["year"] for o in rows) < y <= max(o["year"] for o in rows) for y in breaks)
                    if trend["status"] == "descriptive_OLS":
                        require(len(rows) >= 3 and not actual_break, "Invalid OLS window")
                        xbar = sum(o["year"] for o in rows) / len(rows)
                        ybar = sum(o["value"] for o in rows) / len(rows)
                        slope = sum((o["year"] - xbar) * (o["value"] - ybar) for o in rows) / sum((o["year"] - xbar) ** 2 for o in rows)
                        close(trend["slope_units_per_year"], slope, "slope")
                        require(trend["n"] == len(rows) and trend["not_causal"] is True, "OLS metadata differs")
                        counts["trend_checks"] += 1
                    else:
                        expected = "fewer_than_three_points" if len(rows) < 3 else "withheld_method_break"
                        require(trend["status"] == expected and (len(rows) < 3 or actual_break), "Invalid withheld trend")
                for name, endpoint_year in (("shock_vs_baseline", e["shock"][1]), ("followup_vs_baseline", e["post"][1])):
                    result = metric[name]
                    baseline_year = e["shock"][0] - 1
                    expected = ("exact_endpoint_missing" if baseline_year not in obs or endpoint_year not in obs
                                else "withheld_method_break" if any(baseline_year < y <= endpoint_year for y in breaks)
                                else "descriptive_comparison")
                    require(result["status"] == expected, "Invalid endpoint comparison status")
                    if expected == "descriptive_comparison":
                        a, b = obs[baseline_year]["value"], obs[endpoint_year]["value"]
                        require(result["baseline_year"] == baseline_year and result["endpoint_year"] == endpoint_year, "Endpoint shifted")
                        close(result["baseline"], a, "baseline")
                        close(result["endpoint"], b, "endpoint")
                        close(result["absolute_change"], b - a, "absolute change")
                        if a:
                            close(result["relative_percent_change"], (b / a - 1) * 100, "relative change")
                        if result["percentage_point_change"] is not None:
                            close(result["percentage_point_change"], b - a, "percentage points")
                        counts["endpoint_checks"] += 1
            for period in e.get("period_evidence", []):
                for o in period["observations"]:
                    require(values[key(o["source_row"])]["value"] == o["value"], "Period value differs")
        records = unique(implementation["records"], lambda r: r["id"], "implementation record")
        for r in records.values():
            require(r == canonical_records[r["id"]], "Card differs from canonical implementation record")
            require(r["causal_effect_identified"] is False, "Implementation treated as causal")
            unique(r["facts"], lambda f: f["id"], "fact")
            counts["implementation_records"] += 1
            for fact in r["facts"]:
                source = implementation["sources"][fact["source_id"]]
                require(source["url"] == fact["source_url"] and source["url"].startswith("https://"), "Fact source mismatch")
                require(fact["is_annual_time_series_observation"] is False, "Implementation snapshot annualized")
                if fact["fact_kind"] == "ex_ante_expectation":
                    require(fact["not_realized_observation"] is True, "Expectation mixed with actuals")
                counts["implementation_facts"] += 1
        for link in implementation["episode_links"]:
            require(link["episode_code"] in episodes, "Orphan implementation episode")
            for rid in link["record_ids"]:
                require(rid in records, "Orphan implementation record")
            for event in link["event_links"]:
                require(event["implementation_record_ids"], "Unmapped statute event")
                for rid in event["implementation_record_ids"]:
                    require(event["statute_id"] in records[rid]["statute_ids"], "Wrong statute mapping")
                counts["statutory_event_links"] += 1
    require(used_refs == set(refs), "Unused source observations")
    require(counts["implementation_records"] == len(canonical_records), "Missing implementation records")
    return counts


def load_batch(directory):
    directory = Path(directory)
    manifest = read_json(directory / "manifest.json")
    raw = (directory / "bundle.json").read_bytes()
    require(hashlib.sha256(raw).hexdigest() == manifest["bundle_sha256"], "Bundle checksum mismatch")
    bundle = read_json(directory / "bundle.json")
    require(bundle["batch_id"] == manifest["batch_id"] and bundle["project_id"] == manifest["project_id"], "Manifest identity differs")
    counts = validate(bundle)
    require(counts == manifest["expected_counts"], "Manifest counts differ")
    return bundle, manifest, counts


def sql_literal(value):
    return "'" + value.replace("'", "''") + "'"


def psql_env(connection):
    """libpq does not expand a URI supplied only through PGDATABASE defaults."""
    parsed = urlparse(connection)
    require(parsed.scheme in ("postgres", "postgresql"), "PostgreSQL URL required")
    options = {"sslmode": "PGSSLMODE", "sslrootcert": "PGSSLROOTCERT", "sslcert": "PGSSLCERT",
               "sslkey": "PGSSLKEY", "connect_timeout": "PGCONNECT_TIMEOUT",
               "application_name": "PGAPPNAME", "channel_binding": "PGCHANNELBINDING"}
    query = parse_qs(parsed.query, keep_blank_values=True)
    require(set(query) <= set(options) and all(len(v) == 1 for v in query.values()), "Unsupported connection option")
    env = {k: v for k, v in os.environ.items() if not k.startswith("PG")}
    env.update(PGHOST=parsed.hostname or "", PGPORT=str(parsed.port or 5432),
               PGUSER=unquote(parsed.username or ""), PGPASSWORD=unquote(parsed.password or ""),
               PGDATABASE=unquote(parsed.path.removeprefix("/")))
    env.update({options[k]: v[0] for k, v in query.items()})
    return env


def make_sql(bundle, commit=False):
    """Fixed table/column allowlists; JSON is passed as a quoted SQL literal, never SQL."""
    counts = validate(bundle)
    sha = digest(bundle)
    tag = "$atlas_" + sha + "$"
    while tag in compact(bundle):
        tag = tag[:-1] + "_x$"
    # Per-batch audit is deterministic and never duplicates on a second run.
    audit_id = "replay:" + bundle["batch_id"]
    audit = {"batch_id": bundle["batch_id"], "bundle_digest": sha, "counts": counts,
             "scope": "frozen_replay_not_new_source_verification", "as_of": bundle["as_of"]}
    writes = []
    for table, rows, columns, keys in (
        ("indicator_series", bundle["indicator_series"], SERIES_COLUMNS, ["series_key"]),
        ("indicator_values", bundle["indicator_values"], VALUE_COLUMNS, ["series_key", "year", "group_key"]),
    ):
        col_list = ",".join(columns)
        projection = ",".join(f"r.{c}" for c in columns)
        # Static identifiers only; equality by the selected owned columns tolerates server timestamps.
        equality = " and ".join(f"t.{k}=r.{k}" for k in keys)
        projected_json = "jsonb_build_object(" + ",".join(f"'{c}',t.{c}" for c in columns) + ")"
        writes.append(f"""
  for wanted in select value from jsonb_array_elements({sql_literal(compact(rows))}::jsonb) loop
    select {projected_json} into actual from public.{table} t,
      jsonb_populate_record(null::public.{table},wanted) r where {equality};
    if found and actual is distinct from wanted then raise exception 'Conflicting {table} row: %', wanted->>'series_key'; end if;
    if not found then
      insert into public.{table} ({col_list}) select {projection}
        from jsonb_populate_record(null::public.{table},wanted) r;
      inserted := inserted + 1;
    end if;
  end loop;""")
    source_json = "jsonb_build_object(" + ",".join(f"'{c}',v.{c}" for c in SOURCE_COLUMNS) + ")"
    reports = bundle["dataset_meta"] + [{"id": audit_id, "data": audit}]
    return f"""-- Generated by scripts/replay-atlas-evidence.py; bundle digest {sha}
-- {'COMMIT' if commit else 'DRY RUN: rolled back'}; source re-fetch is deliberately not implied.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local standard_conforming_strings = on;
-- Prevent another writer changing a checked source or absent key during this short transaction.
lock table public.atlas_mechanism_cases, public.dataset_meta, public.indicator_series,
  public.indicator_values in share row exclusive mode;
do {tag}
declare wanted jsonb; actual jsonb; card jsonb; field_name text; field_value jsonb;
        current_card jsonb; inserted integer := 0; patched integer := 0;
begin
  for wanted in select value from jsonb_array_elements({sql_literal(compact(bundle['source_observations']))}::jsonb) loop
    select {source_json} into actual from public.indicator_values v
      where v.series_key=wanted->>'series_key' and v.year=(wanted->>'year')::int and v.group_key=wanted->>'group_key';
    if not found or actual is distinct from wanted then
      raise exception 'Missing or changed source observation: %/%/%',wanted->>'series_key',wanted->>'year',wanted->>'group_key';
    end if;
  end loop;
{''.join(writes)}
  for card in select value from jsonb_array_elements({sql_literal(compact(bundle['case_fields']))}::jsonb) loop
    select data into current_card from public.atlas_mechanism_cases where id=(card->>'id')::uuid;
    if not found or jsonb_typeof(current_card) is distinct from 'object' then
      raise exception 'Missing or invalid base card: %',card->>'id';
    end if;
    for field_name,field_value in select * from jsonb_each(card->'fields') loop
      if current_card ? field_name then
        if current_card->field_name is distinct from field_value then
          raise exception 'Changed case field, new reviewed batch required: %/%',card->>'id',field_name;
        end if;
      else
        current_card := jsonb_set(current_card,array[field_name],field_value);
        patched := patched + 1;
      end if;
    end loop;
    update public.atlas_mechanism_cases set data=current_card
      where id=(card->>'id')::uuid and data is distinct from current_card;
  end loop;
  for wanted in select value from jsonb_array_elements({sql_literal(compact(reports))}::jsonb) loop
    select data into actual from public.dataset_meta where id=wanted->>'id';
    if found and actual is distinct from wanted->'data' then
      raise exception 'Changed report, new reviewed batch required: %',wanted->>'id';
    end if;
    if not found then
      insert into public.dataset_meta(id,data) values(wanted->>'id',wanted->'data');
      inserted := inserted + 1;
    end if;
  end loop;
  raise notice 'Atlas replay: inserted rows=%, patched fields=%',inserted,patched;
end
{tag};
{'commit' if commit else 'rollback'};
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["validate", "sql", "apply"])
    parser.add_argument("--batch-dir", type=Path, default=DEFAULT)
    parser.add_argument("--commit", action="store_true", help="Commit; default SQL/apply rolls back")
    parser.add_argument("--project-id", help="Must match the batch and connection when applying")
    args = parser.parse_args()
    bundle, manifest, counts = load_batch(args.batch_dir)
    if args.command == "validate":
        require(not args.commit, "--commit requires sql or apply")
        print(json.dumps({"batch_id": bundle["batch_id"], "bundle_digest": digest(bundle), "counts": counts}, ensure_ascii=False, indent=2))
        return
    sql = make_sql(bundle, args.commit)
    if args.command == "sql":
        sys.stdout.write(sql)
        return
    require(args.project_id == manifest["project_id"], "Explicit matching --project-id required")
    connection = os.environ.get("ATLAS_DATABASE_URL", "")
    parsed = urlparse(connection)
    require(parsed.scheme in ("postgres", "postgresql"), "ATLAS_DATABASE_URL must be a PostgreSQL URL")
    require(parsed.hostname == f"db.{args.project_id}.supabase.co" or
            (parsed.hostname or "").endswith(".pooler.supabase.com") and parsed.username == f"postgres.{args.project_id}",
            "Connection is not bound to the expected Supabase project")
    require(parse_qs(parsed.query).get("sslmode", [""])[0] in ("require", "verify-ca", "verify-full"), "TLS sslmode required")
    env = psql_env(connection)
    # Never put credentials on the command line or print server errors that might contain them.
    result = subprocess.run(["psql", "-X", "--no-password", "--set", "ON_ERROR_STOP=1"],
                            input=sql, text=True, capture_output=True, env=env)
    if result.returncode:
        raise ValueError("Database replay failed and was rolled back; check the database session logs securely.")
    print("Applied and verified." if args.commit else "Dry run verified; all changes rolled back.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, TypeError, OSError) as exc:
        print(f"Atlas replay failed: {exc}", file=sys.stderr)
        sys.exit(1)
