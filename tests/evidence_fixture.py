"""Entirely fictional evidence for tests; contains no exported database rows."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path


def synthetic_bundle():
    observations = [{"year": y, "value": y - 1990, "value_kind": "observed",
                     "validation_status": "fixture"} for y in range(2000, 2008)]
    phases = {}
    for name, start, end in (("pre", 2000, 2002), ("shock", 2003, 2004), ("post", 2005, 2007)):
        n = end - start + 1
        trend = {"status": "descriptive_OLS", "n": n, "not_causal": True,
                 "slope_units_per_year": 1} if n >= 3 else {"status": "fewer_than_three_points"}
        phases[name] = {"window": [start, end], "n": n, "missing_years": [],
                        "expected_calendar_years": n, "mean_status": "complete_window",
                        "mean": (start + end) / 2 - 1990, "trend": trend}
    def comparison(year):
        endpoint = year - 1990
        return {"status": "descriptive_comparison", "baseline_year": 2002, "endpoint_year": year,
                "baseline": 12, "endpoint": endpoint, "absolute_change": endpoint - 12,
                "relative_percent_change": (endpoint / 12 - 1) * 100, "percentage_point_change": None}
    metric = {"series_key": "fixture.annual", "group_key": "FICTIONAL", "known_break_years": [],
              "observations": observations, **phases, "shock_vs_baseline": comparison(2004),
              "followup_vs_baseline": comparison(2007)}
    episode = {"code": "fictional_episode", "pre": [2000, 2002], "shock": [2003, 2004], "post": [2005, 2007],
               "causal_identification": False, "metrics": [metric], "period_evidence": []}
    url = "https://example.invalid/fictional-evidence"
    record = {"id": "fictional_implementation", "summary": "Fictional fixture only",
              "statute_ids": ["fictional/1"], "causal_effect_identified": False,
              "facts": [{"id": "fictional_fact", "source_id": "fictional_source", "source_url": url,
                         "fact_kind": "reported_implementation_evidence", "is_annual_time_series_observation": False}]}
    implementation = {"causal_confirmation": False, "records": [record], "sources": {"fictional_source": {"url": url}},
                      "episode_links": [{"episode_code": episode["code"], "record_ids": [record["id"]],
                                         "event_links": [{"statute_id": "fictional/1", "implementation_record_ids": [record["id"]]}]}]}
    series_columns = "series_key title description source source_url unit geography frequency start_year end_year data_class status theme pressure_domain indicator_role lenses interpretation quality metadata published source_project_ref".split()
    series = dict.fromkeys(series_columns)
    series.update(series_key="fixture.period", title="Fictional period", source="Fictional", source_url=url,
                  unit="fictional units", geography="Fictional", frequency="period", start_year=2000, end_year=2002,
                  data_class="observed", status="fixture", lenses=[], quality={}, metadata={}, published=True)
    value_columns = "series_key year group_key group_label period value value_text value_kind validation_status validation_note is_published source_url source_version meta".split()
    value = dict.fromkeys(value_columns)
    value.update(series_key=series["series_key"], year=2000, group_key="FICTIONAL", group_label="Fictional",
                 period="2000–2002", value=3, value_kind="observed", validation_status="fixture", is_published=True,
                 source_url=url, source_version="fictional-v1", meta={"not_annual": True})
    return {"schema_version": 1, "batch_id": "fictional_evidence_test", "as_of": "2008-01-01",
            "project_id": "aaaaaaaaaaaaaaaaaaaa", "scope": "Fictional data only",
            "case_fields": [{"id": "11111111-1111-4111-8111-111111111111", "fields": {
                "deepened_evidence_20261021": {"causal_confirmation": False, "episodes": [episode]},
                "decision_implementation_20261021": implementation}}],
            "dataset_meta": [{"id": "decision_implementation_20261021", "data": {"canonical_records": [record]}}],
            "indicator_series": [series], "indicator_values": [value],
            "source_observations": [{"series_key": metric["series_key"], "group_key": metric["group_key"],
                                     "period": str(o["year"]), "is_published": True, "source_url": url,
                                     "source_version": "fictional-v1", **o} for o in observations]}


def write_fixture(directory):
    spec = importlib.util.spec_from_file_location("replay", Path(__file__).resolve().parents[1] / "scripts/replay-atlas-evidence.py")
    replay = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(replay)
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    bundle = synthetic_bundle()
    raw = (json.dumps(bundle, ensure_ascii=False, indent=2) + "\n").encode()
    (directory / "bundle.json").write_bytes(raw)
    manifest = {"schema_version": 1, "batch_id": bundle["batch_id"], "project_id": bundle["project_id"],
                "bundle_sha256": hashlib.sha256(raw).hexdigest(), "expected_counts": replay.validate(bundle)}
    (directory / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True)
    write_fixture(parser.parse_args().output_dir)
