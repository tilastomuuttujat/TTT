// js/renderers/manifest.js -- kaikki renderöijät, skeemat ja käyttöohjeet.
// Käyttö: import { RENDERERS, getRenderer, rendererKeys } from "./renderers/manifest.js";
//
// Rakenne per renderöijä:
//   key          -- tiedostonimi (renderers/<key>.js) ja content.view-arvo
//   label        -- ihmisluettava nimi
//   description  -- mitä renderöijä tekee
//   when         -- milloin tämä tyyppi kannattaa valita
//   fields       -- kentät: { key, type, required, description, example? }
//   example      -- valmis esimerkkisisältö jota voi kopioida suoraan content-kenttään

export const RENDERERS = [

  // ── NARRATIIVISET ────────────────────────────────────────────────────────

  {
    key: "timeline",
    label: "Aikajana",
    description: "Pystysuora selkäranka-aikajana tapahtumineen ja merkityksineen.",
    when: "Kun haluat näyttää tapahtumasarjan kronologisesti tai miten jokin kehittyi ajan myötä.",
    fields: [
      { key: "events",                type: "array",   required: true,  description: "Tapahtumat järjestyksessä." },
      { key: "events[].aika",         type: "string",  required: false, description: "Ajankohta (myös: year, period)." },
      { key: "events[].tapahtuma",    type: "string",  required: true,  description: "Tapahtuman otsikko (myös: title, event)." },
      { key: "events[].merkitys",     type: "string",  required: false, description: "Selitysteksti (myös: description, desc)." },
      { key: "events[].vaikutus_positiivinen", type: "string", required: false, description: "Positiivinen vaikutus -- näkyy vihreänä chipinä." },
      { key: "events[].vaikutus_kielteinen",   type: "string", required: false, description: "Kielteinen vaikutus -- näkyy punaisena chipinä." },
      { key: "scenarios",             type: "array",   required: false, description: "Varafallback jos events puuttuu: {label, desc}." },
      { key: "body",                  type: "string",  required: false, description: "Johdantoteksti ennen aikajanaa." },
      { key: "note",                  type: "string",  required: false, description: "Huomiolaatikko." },
      { key: "source",                type: "string",  required: false, description: "Lähdeviittaus." },
    ],
    example: {
      view: "timeline",
      body: "Johdantoteksti tähän.",
      events: [
        { aika: "1990", tapahtuma: "Ensimmäinen tapahtuma", merkitys: "Tämä muutti suunnan." },
        { aika: "1995", tapahtuma: "Toinen tapahtuma", merkitys: "Seuraukset alkoivat näkyä.", vaikutus_kielteinen: "Resurssit vähenivät" },
        { aika: "2000", tapahtuma: "Kolmas tapahtuma", merkitys: "Rakenne vakiintui." },
      ],
    },
  },

  {
    key: "chain",
    label: "Ketju",
    description: "Kytketty syy–seuraus-virtaus vaihe vaiheelta.",
    when: "Kun haluat näyttää miten yksi asia johtaa toiseen -- mekanismit, polkuriippuvuus, kausaaliketju.",
    fields: [
      { key: "steps",              type: "array",  required: false, description: "Vaiheet: {event|label, consequence|desc, concrete}." },
      { key: "steps[].event",      type: "string", required: true,  description: "Vaiheen otsikko (myös: label)." },
      { key: "steps[].consequence",type: "string", required: false, description: "Seuraus tai selitys (myös: desc)." },
      { key: "steps[].concrete",   type: "string", required: false, description: "Konkreettinen esimerkki -- näkyy tummana laatikkona." },
      { key: "nodes",              type: "array",  required: false, description: "Vaihtoehtoinen skeema: {label, desc, mechanism} + links[]." },
      { key: "body",               type: "string", required: false, description: "Johdantoteksti." },
      { key: "open_question",      type: "string", required: false, description: "Avoin kysymys ketjun lopussa." },
    ],
    example: {
      view: "chain",
      body: "Tämä ketju näyttää miten rakenne syntyi.",
      steps: [
        { event: "Lähtötilanne", consequence: "Paine kasvaa.", concrete: "Konkreettinen ilmentymä." },
        { event: "Välitön reaktio", consequence: "Ratkaisu tehdään poikkeustilassa." },
        { event: "Normalisoituminen", consequence: "Väliaikainen muuttuu pysyväksi.", concrete: "Esimerkki pysyvyydestä." },
      ],
      open_question: "Mikä olisi voinut katkaista ketjun?",
    },
  },

  {
    key: "path",
    label: "Polku",
    description: "Rinnakkaiset reitit tai vaiheistettu etenemispolku.",
    when: "Kun haluat vertailla kahta tai useampaa vaihtoehtoa, tai näyttää konkreettiset askeleet tavoitteeseen.",
    fields: [
      { key: "paths",               type: "array",  required: false, description: "Rinnakkaiset reitit: {condition|label, claim|desc, promise?, price?}." },
      { key: "steps",               type: "array",  required: false, description: "Etenemispolku: {label, desc, actors[], timeframe, difficulty}." },
      { key: "steps[].label",       type: "string", required: true,  description: "Vaiheen nimi." },
      { key: "steps[].desc",        type: "string", required: false, description: "Kuvaus." },
      { key: "steps[].actors",      type: "array",  required: false, description: "Toimijat listana." },
      { key: "steps[].timeframe",   type: "string", required: false, description: "Aikajänne, esim. '0–2 vuotta'." },
      { key: "steps[].difficulty",  type: "string", required: false, description: "Vaikeus, esim. 'vaikea'." },
      { key: "human_unit",          type: "string", required: false, description: "Ihmisläheinen kiteytys -- mitä tämä tarkoittaa tavalliselle ihmiselle." },
      { key: "note",                type: "string", required: false, description: "Huomiolaatikko." },
    ],
    example: {
      view: "path",
      steps: [
        { label: "Ensimmäinen askel", desc: "Kuvaus.", actors: ["toimija A", "toimija B"], timeframe: "0–1 vuotta", difficulty: "kohtalainen" },
        { label: "Toinen askel", desc: "Kuvaus.", timeframe: "1–3 vuotta", difficulty: "vaikea" },
      ],
      human_unit: "Käytännössä tämä tarkoittaa…",
    },
  },

  {
    key: "sector",
    label: "Sektori",
    description: "Ruudukkomainen korttinäkymä teemojen tai ulottuvuuksien vertailuun.",
    when: "Kun haluat esittää 2–6 rinnakkaista teemaa, etua/riskiä, tai osa-aluetta strukturoidusti.",
    fields: [
      { key: "sectors",              type: "array",  required: true,  description: "Kortit: {name|sector|title, description|desc, risk?, score?}." },
      { key: "sectors[].name",       type: "string", required: true,  description: "Kortin otsikko (myös: sector, title)." },
      { key: "sectors[].description",type: "string", required: false, description: "Sisältöteksti (myös: desc)." },
      { key: "sectors[].risk",       type: "string", required: false, description: "Riskikuvaus -- näkyy kortissa omalla rivillä." },
      { key: "sectors[].score",      type: "number", required: false, description: "Pistearvo -- näkyy kortissa oikeassa yläkulmassa." },
      { key: "body",                 type: "string", required: false, description: "Johdantoteksti." },
      { key: "reader_shift",         type: "string", required: false, description: "Lukijan näkökulman muutos -- näkyy kursivoituna." },
    ],
    example: {
      view: "sector",
      body: "Neljä ulottuvuutta.",
      sectors: [
        { name: "Etu 1", description: "Kuvaus.", risk: "Riski tähän liittyen." },
        { name: "Etu 2", description: "Kuvaus." },
        { name: "Etu 3", description: "Kuvaus.", score: 3 },
        { name: "Etu 4", description: "Kuvaus." },
      ],
    },
  },

  {
    key: "calculation",
    label: "Laskuri",
    description: "Interaktiivinen liukunäppäinlaskuri tai staattinen kaavakortti.",
    when: "Kun haluat konkretisoidaan numerot -- 'mitä tämä tarkoittaa sinulle' -- tai esittää kaavan komponentit.",
    fields: [
      { key: "formula",          type: "string",  required: false, description: "Kaava tekstinä, esim. 'nettolisä ≈ brutto × 0.10'." },
      { key: "variable",         type: "object",  required: false, description: "Interaktiivinen muuttuja: {id, min, max, default, unit, label}." },
      { key: "result_formula",   type: "string",  required: false, description: "Laskentakaava, esim. 'round(x * 0.10)'. Vain +−×/ ja round()." },
      { key: "result_template",  type: "string",  required: false, description: "Tulosteksti: '{x}' ja '{result}' korvataan arvoilla." },
      { key: "human_unit",       type: "string",  required: false, description: "Ihmisläheinen selitys tulokselle." },
      { key: "variables",        type: "array",   required: false, description: "Staattinen kaava: [{name, meaning}]." },
      { key: "example",          type: "object",  required: false, description: "Esimerkki: avain-arvo-pareja." },
    ],
    example: {
      view: "calculation",
      formula: "nettolisä ≈ bruttopalkka × 0.10",
      variable: { id: "x", min: 500, max: 1500, default: 970, unit: "€/kk", label: "Bruttopalkka" },
      result_formula: "round(x * 0.10)",
      result_template: "Nettolisä käteen: noin {result} €/kk",
      human_unit: "Alle 100 € ei kata lastenhoitoa.",
    },
  },

  // ── TILASTOLLISET ────────────────────────────────────────────────────────

  {
    key: "correlation",
    label: "Korrelaatio",
    description: "Hajontakaavio kahden muuttujan välisestä yhteydestä, trendiviiva ja R².",
    when: "Kun haluat näyttää onko kahden asian välillä yhteys -- ja kuinka vahva se on.",
    fields: [
      { key: "points",      type: "array",  required: false, description: "Pisteet: [{x, y, label?}]. Käytä tätä tai series[]." },
      { key: "series",      type: "array",  required: false, description: "Useampi sarja: [{name, points[{x,y,label?}]}]." },
      { key: "x_label",     type: "string", required: false, description: "X-akselin otsikko." },
      { key: "y_label",     type: "string", required: false, description: "Y-akselin otsikko." },
      { key: "r_squared",   type: "number", required: false, description: "R²-arvo valmiina (0–1). Jos puuttuu, lasketaan automaattisesti." },
      { key: "body",        type: "string", required: false, description: "Johdantoteksti." },
      { key: "reader_shift",type: "string", required: false, description: "Tulkintateksti." },
      { key: "source",      type: "string", required: false, description: "Lähde." },
    ],
    example: {
      view: "correlation",
      body: "Kuntakohtainen hajonta.",
      x_label: "muuttuja A",
      y_label: "muuttuja B",
      points: [
        { x: 6.2, y: 310, label: "Espoo" },
        { x: 10.2, y: 420, label: "Oulu" },
        { x: 18.1, y: 650, label: "Lieksa" },
      ],
    },
  },

  {
    key: "regression",
    label: "Regressio",
    description: "Aikasarja havaitulla ja ennustetulla käyrällä, luottamusväli varjostettuna.",
    when: "Kun haluat vertailla toteutunutta kehitystä ennustettuun tai trendiin -- 'mitä olisi voinut tapahtua'.",
    fields: [
      { key: "observed",    type: "array",  required: true,  description: "Havaitut arvot numerotaulukkona." },
      { key: "predicted",   type: "array",  required: false, description: "Ennustetut arvot, sama pituus kuin observed." },
      { key: "confidence",  type: "array",  required: false, description: "Luottamusvälit: [{low, high}] tai [±offset]." },
      { key: "labels",      type: "array",  required: false, description: "X-akselin merkit, esim. vuosiluvut." },
      { key: "x_label",     type: "string", required: false, description: "X-akselin otsikko." },
      { key: "y_label",     type: "string", required: false, description: "Y-akselin otsikko." },
      { key: "model",       type: "string", required: false, description: "Mallin kuvaus, esim. 'lineaarinen trendi'." },
      { key: "r_squared",   type: "number", required: false, description: "R²-arvo (0–1)." },
    ],
    example: {
      view: "regression",
      labels: ["2000", "2005", "2010", "2015", "2020"],
      observed:  [24.2, 26.4, 30.2, 31.2, 33.8],
      predicted: [27.0, 29.0, 31.0, 33.0, 35.0],
      confidence: [{"low":25.5,"high":28.5},{"low":27.4,"high":30.6},{"low":29.2,"high":32.8},{"low":31.0,"high":35.0},{"low":32.8,"high":37.2}],
      x_label: "vuosi",
      y_label: "arvo (%)",
    },
  },

  {
    key: "lag",
    label: "Viive",
    description: "Kaksi aikasarjaa visuaalisella viiveanalyysillä ja ristikorrelaatiokaaviolla.",
    when: "Kun yksi ilmiö seuraa toista viiveellä -- lapsuus ja aikuisikä, leikkaukset ja kuormitus.",
    fields: [
      { key: "series_a",      type: "array",  required: true,  description: "Ensimmäinen aikasarja numerotaulukkona." },
      { key: "series_b",      type: "array",  required: true,  description: "Toinen aikasarja, sama pituus." },
      { key: "labels",        type: "array",  required: false, description: "X-akselin merkit (vuodet tms.)." },
      { key: "a_label",       type: "string", required: false, description: "Ensimmäisen sarjan nimi." },
      { key: "b_label",       type: "string", required: false, description: "Toisen sarjan nimi." },
      { key: "lag_periods",   type: "number", required: false, description: "Asetettu viive jaksoina (negatiivinen = B ennen A:ta)." },
      { key: "max_lag",       type: "number", required: false, description: "Ristikorrelaation laskentarajat (oletus: n/3)." },
      { key: "cross_correlation", type: "array", required: false, description: "Valmiit ristikorrelaatioarvot: [{lag, r}]." },
    ],
    example: {
      view: "lag",
      a_label: "Ilmiö A",
      b_label: "Ilmiö B (viiveellä)",
      labels: ["2000","2001","2002","2003","2004","2005","2006","2007","2008","2009"],
      series_a: [48, 52, 68, 88, 89, 84, 79, 74, 68, 62],
      series_b: [50, 51, 53, 57, 64, 72, 80, 86, 90, 95],
      lag_periods: 3,
    },
  },

  {
    key: "distribution",
    label: "Jakauma",
    description: "Histogrammi mediaanilla, kvartiilivälivyöhykkeellä ja poikkeavien havaintojen merkinnällä.",
    when: "Kun haluat näyttää miten arvot jakautuvat -- ja missä kohtaa jakaumaa yksittäinen tapaus sijaitsee.",
    fields: [
      { key: "values",           type: "array",  required: false, description: "Yksittäiset arvot numerotaulukkona. Käytä tätä tai groups[]." },
      { key: "groups",           type: "array",  required: false, description: "Useampi ryhmä: [{name, values[]}]." },
      { key: "bins",             type: "number", required: false, description: "Pylväiden määrä (oletus: sqrt(n), max 30)." },
      { key: "highlight_value",  type: "number", required: false, description: "Korostettava arvo -- piirtää pystyviivan ja värittää palkin." },
      { key: "unit",             type: "string", required: false, description: "Yksikkö, esim. '€/kk'." },
      { key: "percentiles",      type: "object", required: false, description: "Valmiit persentiiliarvot: {p25, p50, p75}." },
    ],
    example: {
      view: "distribution",
      values: [42, 55, 62, 70, 75, 80, 85, 90, 97, 105, 120, 145, 180, 240, 380],
      unit: "€/kk",
      highlight_value: 97,
      note: "Korostettu arvo vastaa Maijan tilannetta.",
    },
  },

  // ── VISUAALISET ──────────────────────────────────────────────────────────

  {
    key: "heatmap",
    label: "Lämpökartta",
    description: "Kaksiulotteinen matriisi jossa väri-intensiteetti kertoo arvon suuruuden.",
    when: "Kun sinulla on kaksi kategoriaulottuvuutta ja numeerinen arvo niiden risteyksessä -- aika × alue, ryhmä × mittari.",
    fields: [
      { key: "rows",         type: "array",  required: false, description: "Rivit: [{label, values[]}]. Käytä tätä tai matrix[][]." },
      { key: "matrix",       type: "array",  required: false, description: "Pelkkä numeromatriisi: [[1,2,3],[4,5,6]]. Käytä row_labels[] kanssa." },
      { key: "col_labels",   type: "array",  required: false, description: "Sarakkeiden otsikot." },
      { key: "row_labels",   type: "array",  required: false, description: "Rivien otsikot (vain matrix-skeemalla)." },
      { key: "unit",         type: "string", required: false, description: "Yksikkö tooltipissä." },
      { key: "palette",      type: "string", required: false, description: "Väripaletti: 'default' | 'danger' | 'blue' | 'green'." },
      { key: "show_values",  type: "boolean",required: false, description: "Näytä arvot soluissa (oletus: true jos matriisi pieni)." },
    ],
    example: {
      view: "heatmap",
      col_labels: ["2000", "2005", "2010", "2015", "2020"],
      unit: "%",
      palette: "danger",
      rows: [
        { label: "Alue A", values: [5.2, 6.1, 7.4, 7.1, 6.9] },
        { label: "Alue B", values: [8.4, 9.6, 11.2, 11.6, 11.0] },
        { label: "Alue C", values: [9.2, 10.8, 13.2, 13.0, 12.4] },
      ],
    },
  },

  {
    key: "funnel",
    label: "Suppilo",
    description: "Suppilokaavio joka näyttää pudotukset vaiheesta toiseen.",
    when: "Kun haluat näyttää miten suuri joukko kutistuu järjestelmän läpi -- aktivointipolku, hakuprosessi, palveluketju.",
    fields: [
      { key: "stages",          type: "array",  required: true,  description: "Vaiheet laskevassa järjestyksessä: [{label, value, desc?}]." },
      { key: "stages[].label",  type: "string", required: true,  description: "Vaiheen nimi." },
      { key: "stages[].value",  type: "number", required: true,  description: "Absoluuttinen arvo (henkilömäärä, euroa tms.)." },
      { key: "stages[].desc",   type: "string", required: false, description: "Selitys pudotukselle -- näkyy listamuodossa alla." },
      { key: "unit",            type: "string", required: false, description: "Yksikkö arvoille, esim. 'henkilöä'." },
    ],
    example: {
      view: "funnel",
      unit: "henkilöä",
      stages: [
        { label: "Hakijat", value: 10000, desc: "Kaikki hakemuksen jättäneet." },
        { label: "Haastatteluun", value: 3200, desc: "68 % karsiutuu ensiarvioinnissa." },
        { label: "Soveltuvuusarvio", value: 1100 },
        { label: "Valittu", value: 280, desc: "Lopullinen valinta." },
      ],
    },
  },
  
  // ── RAKENNE & VERKKO ──────────────────────────────────────────────────────

  {
    key: "network",
    label: "Verkko",
    description: "D3-voimakuvaaja käsitteistä ja niiden suunnatuista yhteyksistä, mekanismiväritys.",
    when: "Kun haluat näyttää monimutkaisen, ei-lineaarisen yhteysrakenteen (silmukat, risteävät vaikutukset).",
    fields: [
      { key: "nodes",            type: "array",  required: true,  description: "Solmut: {id, label, desc?, mechanism?}." },
      { key: "nodes[].mechanism",type: "string", required: false, description: "Ryhmä/väri, esim. 'rahoitus', 'rakenne', 'kapasiteetti', 'valta'." },
      { key: "links",            type: "array",  required: true,  description: "Suunnatut yhteydet: {from, to}." },
    ],
    example: {
      view: "network",
      nodes: [
        { id: "n1", label: "Rahoitus", mechanism: "rahoitus", desc: "Resurssit ohjautuvat menneisyyteen." },
        { id: "n2", label: "Rakenne", mechanism: "rakenne", desc: "Vastuu hajoaa." },
        { id: "n3", label: "Kapasiteetti", mechanism: "kapasiteetti" },
      ],
      links: [ { from: "n1", to: "n2" }, { from: "n2", to: "n3" }, { from: "n3", to: "n1" } ],
    },
  },

  {
    key: "relaatio",
    label: "Relaatioverkko",
    description: "Kapseloitu mini-relaatioverkko (sama nodes/links-data kuin ketjuilla), klikkaus avaa selitteen.",
    when: "Kun chain-liite on rakenteeltaan verkko (silmukka, useita risteyksiä) eikä suora ketju.",
    fields: [
      { key: "nodes", type: "array", required: true, description: "Solmut: {id, label, desc?, mechanism?}." },
      { key: "links", type: "array", required: true, description: "Suunnatut yhteydet: {from, to}." },
    ],
    example: {
      view: "relaatio",
      nodes: [
        { id: "n1", label: "Eriarvoisuus", mechanism: "rakenne", desc: "Lähtökohtien ero." },
        { id: "n2", label: "Periytyminen", mechanism: "rakenne" },
        { id: "n3", label: "Resurssipula", mechanism: "rahoitus" },
      ],
      links: [ { from: "n1", to: "n2" }, { from: "n2", to: "n3" }, { from: "n3", to: "n1" } ],
    },
  },

  {
    key: "kerroskartta",
    label: "Kerroskartta",
    description: "Konsentriset, järjestetyt kehät (ydin → ulkokehä); säde kantaa merkitystä. Klikkaus avaa selitteen.",
    when: "Kun kirjan/luvun argumentti on kerroksellinen: ytimestä ulospäin etenevä analyysitaso.",
    fields: [
      { key: "layers",         type: "array",  required: true,  description: "Kerrokset ytimestä ulos: [string] tai [{name}]." },
      { key: "nodes",          type: "array",  required: true,  description: "Solmut: {layer:int, label, short?, text}." },
      { key: "nodes[].layer",  type: "number", required: true,  description: "Kerroksen indeksi (0 = ydin)." },
      { key: "intro",          type: "string", required: false, description: "Oletusteksti selitepaneelissa." },
    ],
    example: {
      view: "kerroskartta",
      layers: ["Ydin", "Kokemus", "Mekanismi", "Vastuu"],
      nodes: [
        { layer: 0, label: "Ydinkäsite", short: "Ydin", text: "Selitys ytimessä." },
        { layer: 1, label: "Kokemus", short: "Kokemus", text: "Selitys." },
        { layer: 3, label: "Vastuun palautus", short: "Vastuu", text: "Uloin kehä." },
      ],
      intro: "Klikkaa käsitettä lukeaksesi.",
    },
  },

  {
    key: "virtauskartta",
    label: "Virtauskartta (Sankey)",
    description: "Painotetut virrat sarakkeiden välillä; leveys = arvo. Klikkaus korostaa yhden virran.",
    when: "Kun haluat näyttää mihin resurssi/huomio jakautuu ja mihin se päätyy. Merkitse leveys havainnollistavaksi, ei euromääräiseksi, ellei dataa ole.",
    fields: [
      { key: "nodes",          type: "array",  required: true,  description: "Solmut: {id, label, col:int, color?}." },
      { key: "nodes[].col",    type: "number", required: true,  description: "Sarakeindeksi (0 = vasen)." },
      { key: "links",          type: "array",  required: true,  description: "Virrat: {from, to, value, note?}." },
    ],
    example: {
      view: "virtauskartta",
      nodes: [
        { id: "R", label: "Resurssi", col: 0 },
        { id: "A", label: "Ylläpito", col: 1, color: "#a3503a" },
        { id: "B", label: "Ennaltaehkäisy", col: 1, color: "#4a7a3c" },
        { id: "X", label: "Jatkuvuus", col: 2 },
        { id: "Y", label: "Tarkoitus", col: 2 },
      ],
      links: [
        { from: "R", to: "A", value: 70 }, { from: "R", to: "B", value: 30 },
        { from: "A", to: "X", value: 70 }, { from: "B", to: "Y", value: 30 },
      ],
    },
  },

  // ── VERTAILEVAT ───────────────────────────────────────────────────────────

  {
    key: "sukupolvikella",
    label: "Sukupolvikehä",
    description: "Alaspäin aukeava puolikaari: keskus = yhteenkuuluvuus, säde = irrallisuus. Henkilön voi vetää toiseen aikaan.",
    when: "Kun haluat näyttää saman ikäpolven aseman eri aikoina -- rakenne, ei luonne.",
    fields: [
      { key: "dims",           type: "array",  required: false, description: "Ulottuvuudet: [[avain, otsikko], …]. Oletus sisäänrakennettu." },
      { key: "eras",           type: "array",  required: false, description: "Aikakaudet: {birth, at25, person, color, d:{avain:0–100}}." },
      { key: "default_active", type: "number", required: false, description: "Aluksi valittu henkilö (indeksi)." },
    ],
    example: {
      view: "sukupolvikella",
      dims: [["yhteisollisyys", "Yhteisöllisyys"], ["turva", "Turva"], ["tunnustus", "Tunnustus"]],
      eras: [
        { birth: 1925, at25: 1950, person: "Vilho", color: "#1f6f6b", d: { yhteisollisyys: 85, turva: 45, tunnustus: 70 } },
        { birth: 2025, at25: 2050, person: "Vilja", color: "#a3503a", d: { yhteisollisyys: 36, turva: 36, tunnustus: 40 } },
      ],
      default_active: 1,
    },
  },

  {
    key: "profiilikeha",
    label: "Profiilikehä (radar)",
    description: "Vertaileva radar: muutama sarja monella akselilla. Legendan klikkaus korostaa yhden.",
    when: "Kun vertailet 2–4 kohdetta useilla ulottuvuuksilla (esim. Pohjoismaiset serkut).",
    fields: [
      { key: "axes",            type: "array",  required: true,  description: "Akselit: {key, label}." },
      { key: "series",          type: "array",  required: true,  description: "Sarjat: {label, place?, color, values:{akselinAvain: 0–max}}." },
      { key: "max",             type: "number", required: false, description: "Akselin maksimi (oletus 100)." },
    ],
    example: {
      view: "profiilikeha",
      axes: [{ key: "julkinen", label: "Julkinen tuki" }, { key: "asuminen", label: "Asuminen" }, { key: "vakaus", label: "Vakaus" }],
      series: [
        { label: "Vilja", place: "Helsinki", color: "#3a6ea5", values: { julkinen: 70, asuminen: 45, vakaus: 50 } },
        { label: "Nora", place: "Oslo", color: "#1f6f6b", values: { julkinen: 82, asuminen: 52, vakaus: 90 } },
      ],
      max: 100,
    },
  },

  {
    key: "nelikentta",
    label: "Nelikenttä (2×2)",
    description: "Tapaukset kahdella analyyttisellä akselilla; neljä nimettyä kvadranttia. Klikkaus avaa selitteen.",
    when: "Kun haluat sijoittaa tapaukset/järjestelmät kahden ulottuvuuden suhteen -- erittäin luettava.",
    fields: [
      { key: "x",          type: "object", required: true,  description: "Vaaka-akseli: {label, low, high}." },
      { key: "y",          type: "object", required: true,  description: "Pystyakseli: {label, low, high}." },
      { key: "quadrants",  type: "object", required: false, description: "Kvadranttien nimet: {tl, tr, bl, br}." },
      { key: "points",     type: "array",  required: true,  description: "Pisteet: {label, x:0–1, y:0–1, note?}." },
    ],
    example: {
      view: "nelikentta",
      x: { label: "Näkee mittarin", low: "vähän", high: "paljon" },
      y: { label: "Näkee kokemuksen", low: "vähän", high: "paljon" },
      quadrants: { tr: "Näkee molemmat", br: "Mittarisokeus", tl: "Hiljainen hyvä", bl: "Näkymätön" },
      points: [
        { label: "Suoritemittari", x: 0.85, y: 0.2, note: "Optimoi lukua, ohittaa ihmisen." },
        { label: "Neuvola", x: 0.7, y: 0.85, note: "Näkee mittarin ja kokemuksen." },
      ],
    },
  },

  // ── SKENAARIOT ────────────────────────────────────────────────────────────

  {
    key: "skenaariopuu",
    label: "Skenaariopuu",
    description: "Haarautuva puu päätöshetkestä eri tulevaisuuksiin (vaaka, aika vasemmalta oikealle).",
    when: "Kun ennuste tai päätös haarautuu vaihtoehtoisiin polkuihin -- palauttaa valinnan (rekisteri 4).",
    fields: [
      { key: "root",            type: "object", required: true,  description: "Juurisolmu: {label, kind?, note?, children:[...]}." },
      { key: "root.children[].kind", type: "string", required: false, description: "'now' | 'path' | 'good' | 'bad' (väritys)." },
    ],
    example: {
      view: "skenaariopuu",
      root: {
        label: "Nyt", kind: "now", note: "Valinnan hetki.",
        children: [
          { label: "Logiikka jatkuu", kind: "path", children: [{ label: "Lukko syvenee", kind: "bad", note: "Ennusteet toteutuvat." }] },
          { label: "Reformi", kind: "path", children: [{ label: "Logiikka kääntyy", kind: "good", note: "Ennusteet kumoutuvat." }] },
        ],
      },
    },
  },

  // ── EDITORIAALINEN ────────────────────────────────────────────────────────

  {
    key: "rekisterikartta",
    label: "Rekisterikartta",
    description: "Lämpökartta: rivit × neljä lukurekisteriä, solun tummuus = liitemäärä, painopiste lihavoituna.",
    when: "Editoriaalinen yleiskuva: missä kirja näyttää (rekisteri 1) ja missä se palauttaa valinnan (rekisteri 4).",
    fields: [
      { key: "rows",               type: "array",   required: true,  description: "Rivit: {label, counts:{r1,r2,r3,r4}, unclassified?}." },
      { key: "show_unclassified",  type: "boolean", required: false, description: "Näytä luokittelematta-sarake (oletus: jos arvoja on)." },
    ],
    example: {
      view: "rekisterikartta",
      rows: [
        { label: "Kirja A", counts: { r1: 28, r2: 22, r3: 7, r4: 21 } },
        { label: "Kirja B", counts: { r1: 38, r2: 11, r3: 1, r4: 1 } },
      ],
    },
  },

];

// ── apufunktiot ──────────────────────────────────────────────────────────────

/** Palauttaa renderöijän metadatan key:n perusteella, tai null. */
export function getRenderer(key) {
  return RENDERERS.find(r => r.key === key) || null;
}

/** Palauttaa kaikkien renderöijien key-listat. */
export function rendererKeys() {
  return RENDERERS.map(r => r.key);
}

/** Palauttaa valmiin esimerkkisisällön content-kenttään. */
export function exampleContent(key) {
  const r = getRenderer(key);
  return r ? { ...r.example } : null;
}

/** Palauttaa pakolliset kentät renderöijälle. */
export function requiredFields(key) {
  const r = getRenderer(key);
  return r ? r.fields.filter(f => f.required).map(f => f.key) : [];
}

/** Tarkistaa onko content-objekti validi renderöijälle.
 *  Palauttaa { valid: boolean, missing: string[] } */
export function validateContent(key, content) {
  const req = requiredFields(key);
  const missing = req.filter(k => {
    const topKey = k.split("[")[0];
    const val = content[topKey];
    return val === undefined || val === null || (Array.isArray(val) && val.length === 0);
  });
  return { valid: missing.length === 0, missing };
}