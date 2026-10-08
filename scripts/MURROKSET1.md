# Visuaalinen sisällysluettelo ja kertomukset

`murrokset1.html` säilyttää alkuperäisen käyrän ja ankkuripainikkeet. Seitsemän sekunnin toimettomuus käynnistää lyhyen esittelyn. Kussakin neljässä aiheessa on kolme 5,5 sekunnin lausetta. Ilman käyttäjän reaktiota esittely vaihtaa seuraavaan aiheeseen ja kiertää aiheet. Pisteillä voi siirtyä vaiheeseen; valinta pysäyttää etenemisen. Jatka jatkaa samasta kohdasta.

**Lue kertomus** pysäyttää esittelyn ja avaa itsenäisen artikkelisivun. Paluulinkki käyttää `murrokset1.html?story=0…3`-osoitetta ja palauttaa valittuun aiheeseen pysäytettynä. Artikkelit toimivat ilman JavaScriptiä ja tietokantayhteyttä. Vähennetyn liikkeen asetus estää automaattisen esittelyn.

## Ylläpito

`assets/murrokset1-guide.json` sisältää neljä `chapters`-aihetta. Muokkaa otsikkoa, paikkaa ja aikaa (`era`), kolmea `preview_lines`-lausetta, artikkelin suhteellista `article_url`-osoitetta sekä `range`-korostusväliä. `loop` on mekanismin neljän osan teksti. `phases`, `story_lines`, `curve_notes` ja `loop_notes` ovat yhteensopivuus- ja varatekstejä. Pidä uudet esittelylauseet ytimekkäinä ja tapahtumajärjestys selkeänä.

Artikkelit ovat `stories/stories.json`-tiedostossa: `slug`, otsikko, paikka ja aika, tekstin luonne, johdanto, osiot ja lähteet. Kappaleen lähdeviitteen numero vastaa oman artikkelin `sources`-listaa. Historialliset havainnot viitataan lähteisiin, toimituksellinen tulkinta erotetaan havainnoista. Tulevaisuuspolku nimetään ehdolliseksi. Keksittyä perhettä ei esitetä dokumentoituna tapauksena.

Muodosta ja tarkista repositorion juuresta:

```sh
python scripts/build-murrokset-stories.py
node scripts/build-murrokset1.mjs
node --test tests/murrokset-stories.test.mjs
```

Julkaise JSONit, muodostetut HTML-artikkelit, `stories/stories.css` ja `assets/murrokset1-guided.js`. Kooste sisältää viimeksi muodostetun opastuksen varalla, joten se kannattaa muodostaa myös tekstimuutosten jälkeen. Opastustekstit luetaan normaalisti erillisestä JSONista.

Luettava esittelykomponentti on `scripts/murrokset1-tour.txt`. Selite etsii tyhjää aluetta, väistää painikkeet, niiden tekstit, käyrän ja mekanismin sekä huomioi näkyvän alueen korkeuden. Sijoittelu ei siirrä kuviota. Selite häipyy ja seuraava piirtyy tilalle; vähennetyn liikkeen asetuksella vaihto tapahtuu ilman animaatiota.

Alkuperäinen `assets/index--gBIk-ew.js` ja erillinen `murrokset.html` säilyvät. Käyrän pisteytys on havainnollistava tulkinta, ei historiallinen mittaus.

### Artikkeli ruudulla
Lue kertomus kasvattaa lukupaneelin nollakoosta painikkeen viereen ja pysäyttää opastuksen. Paneeli sijoitetaan painikkeen oikealle tai vasemmalle puolelle, tai tilan mukaan sen ylä- tai alapuolelle. Paneeli on enintään 620 px leveä ja 72 % ruudun korkeudesta; pienessä näkymässä sijoittelu sovitetaan ruudun sisään. Läpinäkyvä tausta säilyttää pääkuvion näkyvissä; vain artikkelisisältö vierii. Sulkeminen kutistaa paneelin samaan nollapisteeseen. Vähennetyn liikkeen asetuksella avaus ja sulkeminen ovat välittömiä. X ja Esc sulkevat dialogin; etenemispiste säilyy ja kohdistus palautuu lukupainikkeeseen. Artikkelien ylläpitolähde on edelleen `stories/stories.json`. Rakentaja sisällyttää sisällön JavaScriptiin, joten avaaminen ei tarvitse uutta verkkopyyntöä. Päivitä JSON ja aja molemmat rakentajat, jotta erilliset artikkelisivut ja dialogit vastaavat toisiaan.
