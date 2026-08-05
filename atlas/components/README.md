# Atlas-visualisointikomponentit

`atlas-stat-card` on riippumaton Web Component, joka lukee visualisoinnin esiasetuksen `visualization-cards.json`-tiedostosta ja varsinaiset aikasarjat `tilastomuuttujat.json`-tiedostosta.

## Käyttö TTT-repositoriossa

```html
<script type="module" src="./components/atlas-stat-card.js"></script>

<atlas-stat-card card="TYOTTOMYYS_1990_2024"></atlas-stat-card>
```

## Käyttö hyvinvointivaltio-repositoriossa

```html
<script
  type="module"
  src="https://tilastomuuttujat.github.io/TTT/atlas/components/atlas-stat-card.js">
</script>

<atlas-stat-card card="VAESTON_IKAANTYMINEN"></atlas-stat-card>
```

Komponentti päättelee oletuspolut JavaScript-moduulin sijainnista ja hakee automaattisesti:

- `https://tilastomuuttujat.github.io/TTT/atlas/visualization-cards.json`
- `https://tilastomuuttujat.github.io/TTT/atlas/tilastomuuttujat.json`

## Omat URL-osoitteet

```html
<atlas-stat-card
  card="JULKINEN_VELKA_POLKU"
  cards-url="https://example.org/cards.json"
  data-url="https://example.org/statistics.json">
</atlas-stat-card>
```

Vaihtoehtoisesti yhteinen juuriosoite voidaan antaa `data-base`-attribuutilla:

```html
<atlas-stat-card
  card="SYNTYVYYS_MURROS"
  data-base="https://tilastomuuttujat.github.io/TTT/atlas/">
</atlas-stat-card>
```

## Teeman sovittaminen sivustoon

Komponentti käyttää CSS-muuttujia, jotka voidaan määritellä isäntäsivulla:

```css
atlas-stat-card {
  --atlas-paper: #ffffff;
  --atlas-line: #d8d8d8;
  --atlas-title: #203c37;
  --atlas-ink: #172421;
  --atlas-radius: 12px;
  --atlas-serif: Georgia, serif;
  --atlas-sans: system-ui, sans-serif;
}
```

## Nykyiset korttitunnukset

- `TYOTTOMYYS_1990_2024`
- `TYOLLISYYS_POLKU`
- `JULKINEN_VELKA_POLKU`
- `VAESTON_IKAANTYMINEN`
- `RAKENNEMUUTOS_KAUPUNGISTUMINEN`
- `SYNTYVYYS_MURROS`

## Rakenteen vastuut

- `tilastomuuttujat.json`: vain tilastodata ja lähdetiedot
- `visualization-cards.json`: visualisointien esiasetukset
- `components/atlas-stat-card.js`: esitystapa ja piirto
- hyödyntävä sivusto: valitsee kortin ja sovittaa teeman
