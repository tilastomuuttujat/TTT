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
Lue kertomus avaa oikealta liukuvan sivupaneelin ja pysäyttää opastuksen. Paneeli on enintään 560 px leveä ja koko näkyvän ruudun korkuinen. Päänäkymä säilyy näkyvissä läpinäkyvän taustan läpi. Oikeassa reunassa on 28 px leveä Lue artikkeli -vedin. Avattuna sama vedin seuraa paneelin vasenta reunaa ja vaihtuu Sulje artikkeli -tekstiksi. Pystysuuntainen teksti asetetaan writing-mode-ominaisuudella, jotta se ei leikkaudu. Erilliset lukulinkit on poistettu; artikkeli määräytyy aktiivisen animaation mukaan. myös X ja Esc sulkevat paneelin liu'uttamalla sen oikealle. Etenemispiste säilyy, kohdistus palautuu lukupainikkeeseen ja vain artikkelin sisältö vierii. Avaus kestää 650 ms; vähennetyn liikkeen asetuksella siirtymä on välitön. Typografia ja värit seuraavat atlasnäkymää.
Artikkelien ylläpitolähde on `stories/stories.json`. Päivitä JSON ja aja molemmat rakentajat, jotta erilliset artikkelisivut ja paneelit vastaavat toisiaan.
