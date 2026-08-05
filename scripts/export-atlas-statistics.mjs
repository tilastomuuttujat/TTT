import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const OUTPUT_PATH =
  process.env.ATLAS_STATISTICS_OUTPUT ??
  path.join("atlas", "tilastomuuttujat.json");

if (!SUPABASE_URL) {
  throw new Error("Ympäristömuuttuja SUPABASE_URL puuttuu.");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Ympäristömuuttuja SUPABASE_SERVICE_ROLE_KEY puuttuu."
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

function cleanText(value) {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  return text === "" ? null : text;
}

function finiteNumber(value, fieldName) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(
      `Virheellinen numero kentässä ${fieldName}: ${String(value)}`
    );
  }

  return number;
}

function integerOrDefault(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

function sortFinnish(left, right) {
  return String(left ?? "").localeCompare(
    String(right ?? ""),
    "fi",
    {
      sensitivity: "base",
      numeric: true,
    }
  );
}

function validateSeriesRow(row) {
  if (!row || typeof row !== "object") {
    throw new Error("Tilastomuuttujan tietue ei ole olio.");
  }

  const code = cleanText(row.code);
  const title = cleanText(row.title);

  if (!code) {
    throw new Error(
      `Tilastomuuttujalta puuttuu code-tunnus. Tietue: ${JSON.stringify(row)}`
    );
  }

  if (!/^[A-Z0-9_]+$/.test(code)) {
    throw new Error(
      `Tilastomuuttujan code "${code}" saa sisältää vain isoja kirjaimia, numeroita ja alaviivoja.`
    );
  }

  if (!title) {
    throw new Error(
      `Tilastomuuttujalta "${code}" puuttuu title.`
    );
  }

  return {
    code,
    title,
  };
}

function normaliseValueRow(row) {
  const year = finiteNumber(
    row.year,
    "statistic_values.year"
  );

  const value = finiteNumber(
    row.value,
    "statistic_values.value"
  );

  if (!Number.isInteger(year)) {
    throw new Error(
      `Vuoden pitää olla kokonaisluku: ${String(row.year)}`
    );
  }

  return {
    year,
    value,
    note: cleanText(row.note),
  };
}

async function loadPublishedSeries() {
  const { data, error } = await supabase
    .from("statistic_series")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    throw new Error(
      `statistic_series-taulun luku epäonnistui: ${error.message}`
    );
  }

  return data ?? [];
}

async function loadValuesForSeries(codes) {
  if (codes.length === 0) return [];

  const pageSize = 1000;
  const allRows = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("statistic_values")
      .select("*")
      .in("series_code", codes)
      .order("series_code", { ascending: true })
      .order("year", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(
        `statistic_values-taulun luku epäonnistui: ${error.message}`
      );
    }

    const rows = data ?? [];
    allRows.push(...rows);

    if (rows.length < pageSize) break;
  }

  return allRows;
}

function buildExport(seriesRows, valueRows) {
  const valuesByCode = new Map();

  for (const row of valueRows) {
    const code = cleanText(row.series_code);

    if (!code) {
      throw new Error(
        `statistic_values-tietueelta puuttuu series_code: ${JSON.stringify(row)}`
      );
    }

    if (!valuesByCode.has(code)) {
      valuesByCode.set(code, []);
    }

    valuesByCode
      .get(code)
      .push(normaliseValueRow(row));
  }

  const series = seriesRows.map((row) => {
    const validated = validateSeriesRow(row);

    const values = (
      valuesByCode.get(validated.code) ?? []
    )
      .sort((a, b) => a.year - b.year)
      .map((entry) => {
        const value = {
          year: entry.year,
          value: entry.value,
        };

        if (entry.note) {
          value.note = entry.note;
        }

        return value;
      });

    const result = {
      code: validated.code,
      title: validated.title,
      group: cleanText(
        row.group_name ?? row.group
      ),
      unit: cleanText(row.unit),
      description: cleanText(row.description),
      source: cleanText(row.source),
      source_url: cleanText(row.source_url),
      decimals: integerOrDefault(
        row.decimals,
        1
      ),
      sort_order: integerOrDefault(
        row.sort_order,
        0
      ),
      values,
    };

    return Object.fromEntries(
      Object.entries(result).filter(
        ([, value]) => value !== null
      )
    );
  });

  series.sort((a, b) => {
    const orderDifference =
      integerOrDefault(a.sort_order) -
      integerOrDefault(b.sort_order);

    if (orderDifference !== 0) {
      return orderDifference;
    }

    return sortFinnish(a.code, b.code);
  });

  const valueCount = series.reduce(
    (sum, item) => sum + item.values.length,
    0
  );

  return {
    meta: {
      id: "tilastomuuttujat",
      schema_version: 1,
      generated_at: new Date().toISOString(),
      source: "Supabase",
      series_count: series.length,
      value_count: valueCount,
    },
    series,
  };
}

async function writeJson(data) {
  const absolutePath = path.resolve(
    OUTPUT_PATH
  );

  await mkdir(
    path.dirname(absolutePath),
    {
      recursive: true,
    }
  );

  const json =
    `${JSON.stringify(data, null, 2)}\n`;

  await writeFile(
    absolutePath,
    json,
    "utf8"
  );

  return absolutePath;
}

async function main() {
  console.log(
    "Luetaan julkaistut tilastomuuttujat Supabasesta…"
  );

  const seriesRows =
    await loadPublishedSeries();

  const codes = seriesRows
    .map((row) => cleanText(row.code))
    .filter(Boolean);

  console.log(
    `Löytyi ${seriesRows.length} julkaistua sarjaa.`
  );

  const valueRows =
    await loadValuesForSeries(codes);

  console.log(
    `Löytyi ${valueRows.length} havaintoarvoa.`
  );

  const exported =
    buildExport(seriesRows, valueRows);

  const outputFile =
    await writeJson(exported);

  console.log(
    `Valmis: ${outputFile} ` +
      `(${exported.meta.series_count} sarjaa, ` +
      `${exported.meta.value_count} arvoa).`
  );
}

main().catch((error) => {
  console.error(
    "Tilastomuuttujien export epäonnistui."
  );

  console.error(error);
  process.exitCode = 1;
});
