# vivid-data-visions → murrosmatriisi

The importer adds observations and event evidence from the reviewed public source
repository at commit `822bb10bfe320a930de157e6a9ef2c51adfd18d3`.
`indicator_series` and `indicator_values` hold statistical observations; `items`
holds 11 local events and 4 ownership transactions. Two `dataset_meta` evidence
registries retain three local cases and ownership details, including 10 dividend
payments and the Solidium fiscal-period bridge. They are not annual budget receipts.
No causal graph edges or fictional household examples are imported.

The source commit and batch ID are intentionally fixed. Review new definitions,
source versions, aliases and existing database coverage before changing either.
No credentials or database exports belong in this repository.

## Reproduce

Requires Python 3.10+ and Git. No third-party Python packages or network fetches
are used by the builder. First obtain the source checkout:

```sh
git clone https://github.com/tilastomuuttujat/vivid-data-visions.git /tmp/vivid-source
git -C /tmp/vivid-source checkout --detach 822bb10bfe320a930de157e6a9ef2c51adfd18d3
python scripts/import-vivid-data.py --repo /tmp/vivid-source --output /tmp/vivid-batch
VIVID_REPO=/tmp/vivid-source python -m unittest discover -s tests -p test_vivid_import.py -v
```

1. Read the generated manifest and review its counts, source hashes and exclusions.
2. Execute its numbered `stage-*.sql` files in order using the authenticated
   Supabase SQL connector or an authorized PostgreSQL client. Staging writes
   only batch-owned `dataset_meta` keys, not canonical observations.
3. Execute `dry-run.sql`. It checks SHA-256 hashes, unique keys, row counts and
   conflicts, attempts canonical inserts, and finishes with `ROLLBACK`.
4. Confirm zero new canonical rows after the first dry run. Execute `commit.sql`
   only for an authorized database update. Finalization is one transaction.
5. Execute `commit.sql` again and compare counts and row fingerprints, including
   timestamps. An identical batch is a no-op; differing existing records fail
   instead of being overwritten. Staging payloads remain as the frozen replay
   input under `vivid_repository_20261021:stage:*`.

Generated SQL is an execution artifact: inspect it and use a trusted SQL runner.
The generator never connects to a database or executes SQL. Temp tables used by
finalization are transaction-local; no permanent schema or access policies change.
The manifest ID is `vivid_repository_20261021`.

## Interpretation and provenance

- Municipality: 308 municipalities, principally 2023–2024, with election turnout
  stored once at 2025 (292 mainland numeric values). Five employment/industry
  columns absent for 2024 remain missing. Local historical population, income
  and poverty observations reuse the corresponding municipal series. Shared
  observations must agree; their provenance retains the additional source query.
- Groups: regional education and age cross sections, 1987–2024; education-specific
  income observations, 2010–2024. Students are a subset of those outside the labour
  force. Employment education groups and income education groups are distinct
  classifications. These are not individual transitions or cohort follow-ups.
- Care: six Sotkanet IDs and 24 source area units, with different available years
  within 2016–2025. The source change in 2019 is explicit for home care. A fixed
  staffing threshold of 0.7 and the currently applicable threshold are separate
  measures. Cost `absValue` is in thousand euros, not a person count. Areas before
  2023 describe statistics on these area classifications, not historical governing
  organizations.
- Local: Hamina, Kajaani and Salo. Resident employment and workplace jobs differ.
  Education totals aggregate nine age bands covering ages 20–64; monthly jobseeker
  stocks are averaged over 12 months and are not Labour Force Survey estimates.
  Existing country comparator series are not blindly re-imported.
- Wealth: survey years only; household reference-person age, conditional medians,
  method breaks and 2023-price wealth are preserved. Housing income is in 2024
  prices and housing net cost/expense shares have a 2023 definition break.
- Ownership: amounts are million EUR, per-share dividends EUR. Recipients,
  payment dates, profit years, fiscal periods and cash versus stock are retained.
  Sampo's bank sale receipt belongs to Sampo, not directly to the state budget.
  These event facts are not inserted as annual indicator observations.

Municipal cells and housing/wealth extracts are checked against archived primary
responses included in the pinned repository. They use `source_snapshot_checked`.
Care, group and local extracts use
`repository_checked_not_independently_refetched`: structural checks and source
metadata are retained, but primary responses were not independently re-fetched.
This distinction is preserved in both series quality and observation status.
Missing values use `missing_source`, never zero or interpolated values.

## Verified database result, 21 October 2026

| Canonical series family | Series | Numeric observations | Missing observations |
|---|---:|---:|---:|
| Municipal, including shared local history | 25 | 13,633 | 1,636 |
| Care | 6 | 876 | 0 |
| Population groups | 13 | 53,425 | 0 |
| Other local structural-change measures | 19 | 1,407 | 0 |
| Housing and wealth | 6 | 306 | 2 |
| Total | 69 | 69,647 | 1,638 |

There are 71,285 indicator rows and 15 event rows. Within the source collection,
326 repeated rows are collapsed, chiefly the election values repeated in both
municipal snapshots. Live dry-run rollback and two identical committed runs were
verified; observation, series and event fingerprints (including timestamps)
remained unchanged on the second committed run.
