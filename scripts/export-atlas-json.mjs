import { createClient } from "@supabase/supabase-js";
import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const ATLAS_DIR = path.resolve(
  process.env.ATLAS_OUTPUT_DIR ?? "atlas"
);

const STORAGE_BASE_URL =
  `${SUPABASE_URL}/storage/v1/object/public/atlas-images/`;

const MANAGED_FILES = [
  "artikkelit.json",
  "tilastomuuttujat.json",
  "murrosatlas.json",
  "selitysatlas.json",
  "crosswalk.json",
  "lens-content.json",
  "chain-anchors.json",
  "murros-layout.json",
  "atlas-data.json",
];

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

function integerOrDefault(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

function numberOrThrow(value, fieldName) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(
      `Virheellinen numero kentässä ${fieldName}: ${String(value)}`
    );
  }

  return number;
}

function omitNulls(object) {
  return Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value !== null && value !== undefined
    )
  );
}

function storageUrl(storagePath) {
  return STORAGE_BASE_URL + encodeURIComponent(storagePath);
}

async function writeJson(filename, value) {
  const outputPath = path.join(ATLAS_DIR, filename);

  await mkdir(path.dirname(outputPath), {
    recursive: true,
  });

  await writeFile(
    outputPath,
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8"
  );

  console.log(`Kirjoitettu ${path.relative(process.cwd(), outputPath)}`);
}

async function readExistingJson(filename) {
  const filePath = path.join(ATLAS_DIR, filename);

  try {
    const text = await readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        `Tiedostoa ${filePath} ei löydy. Staattista JSONia ei voida säilyttää ja päivittää.`
      );
    }

    throw new Error(
      `Tiedoston ${filePath} lukeminen epäonnistui: ${error.message}`
    );
  }
}

function stampExistingJson(document, generatedAt) {
  if (!document || typeof document !== "object") {
    throw new Error("JSON-dokumentin juuren pitää olla olio.");
  }

  if (
    document.meta &&
    typeof document.meta === "object" &&
    !Array.isArray(document.meta)
  ) {
    const meta = { ...document.meta };

    if ("generated_at" in meta) {
      meta.generated_at = generatedAt;
    } else if ("generated" in meta) {
      meta.generated = generatedAt.slice(0, 10);
    } else if ("updated_at" in meta) {
      meta.updated_at = generatedAt;
    } else if ("updated" in meta) {
      meta.updated = generatedAt.slice(0, 10);
    } else {
      meta.generated_at = generatedAt;
    }

    return {
      ...document,
      meta,
    };
  }

  return {
    ...document,
    generated_at: generatedAt,
  };
}

async function selectAll(
  table,
  {
    columns = "*",
    order = [],
    filters = [],
    pageSize = 1000,
  } = {}
) {
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from(table)
      .select(columns);

    for (const filter of filters) {
      const [method, ...args] = filter;
      query = query[method](...args);
    }

    for (const item of order) {
      query = query.order(
        item.column,
        {
          ascending: item.ascending !== false,
        }
      );
    }

    query = query.range(
      from,
      from + pageSize - 1
    );

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `${table}-taulun luku epäonnistui: ${error.message}`
      );
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < pageSize) break;
  }

  return rows;
}

async function exportArticles(generatedAt) {
  const [
    articles,
    links,
    relationTypes,
    attachments,
    unpublishedItems,
    metaRows,
  ] = await Promise.all([
    selectAll("articles", {
      order: [{ column: "id" }],
    }),

    selectAll("article_links", {
      order: [{ column: "sort_order" }],
    }),

    selectAll("article_relation_types"),

    selectAll("attachments", {
      order: [{ column: "sort_order" }],
      filters: [
        ["not", "article_id", "is", null],
      ],
    }),

    selectAll("items", {
      columns: "id",
      filters: [
        ["eq", "unpublished", true],
      ],
    }),

    selectAll("article_dataset_meta", {
      columns: "id,data",
      filters: [
        ["eq", "id", "artikkelit"],
      ],
    }),
  ]);

  const unpublishedIds = new Set(
    unpublishedItems.map((row) => row.id)
  );

  const imagesByArticle = new Map();

  for (const attachment of attachments) {
    if (!imagesByArticle.has(attachment.article_id)) {
      imagesByArticle.set(attachment.article_id, []);
    }

    imagesByArticle
      .get(attachment.article_id)
      .push(
        omitNulls({
          url: storageUrl(attachment.storage_path),
          caption: cleanText(attachment.caption),
        })
      );
  }

  const exportedLinks = links
    .filter((link) => !unpublishedIds.has(link.item_id))
    .map((link) =>
      omitNulls({
        article_id: link.article_id,
        item_id: link.item_id,
        relation_type: link.relation_type,
        weight: link.weight,
        sort_order: link.sort_order,
      })
    );

  const exportedArticles = articles.map((article) => {
    const body = Array.isArray(article.body)
      ? article.body
      : String(article.body ?? "")
          .split(/\r?\n/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean);

    const tags = Array.isArray(article.tags)
      ? article.tags
      : String(article.tags ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);

    const result = omitNulls({
      id: article.id,
      title: article.title,
      dek: cleanText(article.dek),
      tags,
      status: article.status,
      note: cleanText(article.note) ?? "",
      body,
    });

    const images = imagesByArticle.get(article.id);

    if (images?.length) {
      result.images = images;
    }

    return result;
  });

  const relationTypeMap = Object.fromEntries(
    relationTypes.map((row) => [
      row.type,
      row.label,
    ])
  );

  const storedMeta =
    metaRows[0]?.data &&
    typeof metaRows[0].data === "object"
      ? metaRows[0].data
      : {};

  await writeJson("artikkelit.json", {
    meta: {
      ...storedMeta,
      generated_at: generatedAt,
      count: exportedArticles.length,
      link_count: exportedLinks.length,
    },
    relation_types: relationTypeMap,
    articles: exportedArticles,
    links: exportedLinks,
  });
}

async function exportStatistics(generatedAt) {
  const seriesRows = await selectAll(
    "statistic_series",
    {
      order: [
        { column: "sort_order" },
        { column: "code" },
      ],
      filters: [
        ["eq", "published", true],
      ],
    }
  );

  const publishedCodes = seriesRows.map(
    (row) => row.code
  );

  const valueRows =
    publishedCodes.length === 0
      ? []
      : await selectAll(
          "statistic_values",
          {
            order: [
              { column: "series_code" },
              { column: "year" },
            ],
            filters: [
              ["in", "series_code", publishedCodes],
            ],
          }
        );

  const valuesByCode = new Map();

  for (const row of valueRows) {
    if (!valuesByCode.has(row.series_code)) {
      valuesByCode.set(row.series_code, []);
    }

    const year = numberOrThrow(
      row.year,
      "statistic_values.year"
    );

    if (!Number.isInteger(year)) {
      throw new Error(
        `Vuoden pitää olla kokonaisluku: ${row.year}`
      );
    }

    valuesByCode
      .get(row.series_code)
      .push(
        omitNulls({
          year,
          value: numberOrThrow(
            row.value,
            "statistic_values.value"
          ),
          note: cleanText(row.note),
        })
      );
  }

  const series = seriesRows.map((row) =>
    omitNulls({
      code: row.code,
      title: row.title,
      group: cleanText(row.group_name),
      unit: cleanText(row.unit),
      description: cleanText(row.description),
      source: cleanText(row.source),
      source_url: cleanText(row.source_url),
      decimals: integerOrDefault(row.decimals, 1),
      sort_order: integerOrDefault(row.sort_order, 0),
      values: valuesByCode.get(row.code) ?? [],
    })
  );

  await writeJson("tilastomuuttujat.json", {
    meta: {
      id: "tilastomuuttujat",
      title:
        "Suomen rakennemuutosten atlaksen tilastomuuttujat",
      schema_version: 1,
      generated_at: generatedAt,
      source: "Supabase",
      count: series.length,
      series_count: series.length,
      value_count: valueRows.length,
    },
    series,
  });
}

async function exportMurrosAtlas(generatedAt) {
  const [
    items,
    relations,
    attachments,
    metaRows,
  ] = await Promise.all([
    selectAll("items", {
      order: [{ column: "year_start" }],
    }),

    selectAll("relations", {
      order: [{ column: "id" }],
    }),

    selectAll("attachments", {
      order: [{ column: "sort_order" }],
      filters: [
        ["not", "item_id", "is", null],
      ],
    }),

    selectAll("dataset_meta", {
      columns: "id,data",
      filters: [
        ["eq", "id", "murrosvaiheet"],
      ],
    }),
  ]);

  const publishedItems = items.filter(
    (item) => !item.unpublished
  );

  const publishedIds = new Set(
    publishedItems.map((item) => item.id)
  );

  const imagesByItem = new Map();

  for (const attachment of attachments) {
    if (!imagesByItem.has(attachment.item_id)) {
      imagesByItem.set(attachment.item_id, []);
    }

    imagesByItem
      .get(attachment.item_id)
      .push(
        omitNulls({
          url: storageUrl(attachment.storage_path),
          caption: cleanText(attachment.caption),
        })
      );
  }

  const exportedItems = publishedItems.map((item) => {
    const result = omitNulls({
      id: item.id,
      title: item.title,
      year_start: item.year_start,
      year_end: item.year_end,
      type: item.type,
      subtype: cleanText(item.subtype),
      domains: item.domains ?? [],
      phase: cleanText(item.phase),
      problem: cleanText(item.problem),
      mechanism: cleanText(item.mechanism),
      effects: item.effects ?? [],
      long_effect: cleanText(item.long_effect),
      current_relevance: cleanText(
        item.current_relevance
      ),
      importance: item.importance,
      confidence: item.confidence,
      sources: item.sources,
    });

    const images = imagesByItem.get(item.id);

    if (images?.length) {
      result.images = images;
    }

    return result;
  });

  const exportedRelations = relations
    .filter(
      (relation) =>
        publishedIds.has(relation.from_id) &&
        publishedIds.has(relation.to_id)
    )
    .map((relation) =>
      omitNulls({
        from: relation.from_id,
        to: relation.to_id,
        type: relation.type,
        rel_class: relation.rel_class,
        confidence: relation.confidence,
        rationale: cleanText(relation.rationale),
      })
    );

  const storedMeta =
    metaRows[0]?.data &&
    typeof metaRows[0].data === "object"
      ? metaRows[0].data
      : {};

  await writeJson("murrosatlas.json", {
    meta: {
      ...storedMeta,
      generated_at: generatedAt,
      count: exportedItems.length,
      relation_count: exportedRelations.length,
    },
    items: exportedItems,
    relations: exportedRelations,
  });
}

async function republishStaticJson(filename, generatedAt) {
  const existing = await readExistingJson(filename);
  const stamped = stampExistingJson(
    existing,
    generatedAt
  );

  await writeJson(filename, stamped);
}

async function main() {
  const generatedAt = new Date().toISOString();

  console.log("Atlas JSON -julkaisu alkaa.");
  console.log(`Kohdehakemisto: ${ATLAS_DIR}`);

  await exportArticles(generatedAt);
  await exportStatistics(generatedAt);
  await exportMurrosAtlas(generatedAt);

  for (const filename of [
    "selitysatlas.json",
    "crosswalk.json",
    "lens-content.json",
    "chain-anchors.json",
    "murros-layout.json",
    "atlas-data.json",
  ]) {
    await republishStaticJson(
      filename,
      generatedAt
    );
  }

  console.log(
    `Atlas JSON -julkaisu valmis: ${MANAGED_FILES.join(", ")}`
  );
}

main().catch((error) => {
  console.error("Atlas JSON -julkaisu epäonnistui.");
  console.error(error);
  process.exitCode = 1;
});
