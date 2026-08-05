# Atlas UI Kit

`atlas/components/` sisältää uudelleenkäytettävät Web Componentit, joita voivat käyttää sekä TTT että muut GitHub Pages -sivustot, kuten `hyvinvointivaltio/home`.

## Koko kirjaston käyttöönotto

```html
<script
  type="module"
  src="https://tilastomuuttujat.github.io/TTT/atlas/components/atlas-ui.js">
</script>
```

Tämän jälkeen sivulla voi käyttää kaikkia komponentteja.

## Komponentit

### `atlas-stat-card`

Visualisoi `visualization-cards.json`-esiasetuksen ja `tilastomuuttujat.json`-aikasarjat.

```html
<atlas-stat-card card="JULKINEN_VELKA_POLKU"></atlas-stat-card>
```

### `atlas-article`

Näyttää yhden `artikkelit.json`-artikkelin.

```html
<atlas-article article="1990-luvun-laman-pitka-varjo"></atlas-article>
```

Tiivistetty versio:

```html
<atlas-article article="1990-luvun-laman-pitka-varjo" compact></atlas-article>
```

### `atlas-topic`

Yhdistää murroskohteen, artikkelin ja valitut tilastokortit yhdeksi moduuliksi.

```html
<atlas-topic
  item="1990-luvun-lama"
  cards="TYOTTOMYYS_1990_2024,JULKINEN_VELKA_POLKU">
</atlas-topic>
```

### `atlas-timeline`

Muodostaa murrosatlaksesta aikajanan joko tunnisteiden tai toimialueen perusteella.

```html
<atlas-timeline domain="talous" limit="8"></atlas-timeline>
```

```html
<atlas-timeline items="1990-luvun-lama,finanssikriisi-2008"></atlas-timeline>
```

### `atlas-network`

Näyttää valitun murroskohteen lähimmät relaatiot.

```html
<atlas-network focus="1990-luvun-lama" depth="1"></atlas-network>
```

## Käyttö hyvinvointivaltio-repositoriossa

```html
<script
  type="module"
  src="https://tilastomuuttujat.github.io/TTT/atlas/components/atlas-ui.js">
</script>

<section>
  <h2>1990-luvun lama</h2>
  <atlas-topic
    item="1990-luvun-lama"
    cards="TYOTTOMYYS_1990_2024,JULKINEN_VELKA_POLKU">
  </atlas-topic>
</section>
```

Komponentit päättelevät oletuspolut moduulin sijainnista ja hakevat automaattisesti TTT:n julkaistut JSON-tiedostot.

## Omien tiedostojen käyttö

Yhteinen juuriosoite voidaan antaa `data-base`-attribuutilla:

```html
<atlas-topic
  item="1990-luvun-lama"
  data-base="https://example.org/atlas/">
</atlas-topic>
```

Komponenteilla on lisäksi tiedostokohtaisia URL-attribuutteja, kuten `atlas-url`, `articles-url`, `cards-url` ja `data-url`.

## Teeman sovittaminen

```css
atlas-stat-card,
atlas-topic,
atlas-article,
atlas-timeline,
atlas-network {
  --atlas-paper: #ffffff;
  --atlas-line: #d8d8d8;
  --atlas-title: #203c37;
  --atlas-ink: #172421;
  --atlas-link: #2f6f68;
  --atlas-radius: 12px;
  --atlas-serif: Georgia, serif;
  --atlas-sans: system-ui, sans-serif;
}
```

## Tiedostot

- `atlas-ui.js`: koko komponenttikirjaston lataava entry point
- `atlas-data.js`: yhteiset lataus-, URL- ja HTML-apufunktiot
- `atlas-stat-card.js`: tilastokortti
- `atlas-article.js`: artikkeli
- `atlas-topic.js`: yhdistetty aihekortti
- `atlas-timeline.js`: aikajana
- `atlas-network.js`: relaatiokartta
- `ui-demo.html`: kaikkien komponenttien demonäkymä

## Demo

```text
https://tilastomuuttujat.github.io/TTT/atlas/components/ui-demo.html
```
