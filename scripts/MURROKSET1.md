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

### Analyysi päänäkymässä
`MurrosAnalysis` avaa Lue tulkinta -vetimestä oikean sivupaneelin, jossa `MurrosAnalysisContent` näyttää tutkittavan tulkinnan ja aktiivisen ajanjakson ketjun: muutos, yhteiskunnan vastaus, jälki. Vertailu avataan details-elementistä. Taulukon ajanjakson valinta siirtää opastuksen kyseiseen tapaukseen pysäytettynä ja vaihtaa myös artikkelivetimen sisällön. Ryhmät, näytön rajat, vaihtoehtoinen selitys ja jatkokysymys ylläpidetään kunkin luvun `analysis`-kentässä tiedostossa `assets/murrokset1-guide.json`. Tulevaisuuspolku erotetaan havainnoista ja käyrän tulkinnallinen luonne kerrotaan. Uusia mitattuja arvoja tai vaikutuskokoja ei ole lisätty.

Tulkinnan avaaminen pysäyttää opastuksen. Sulje tulkinta, X ja Esc palauttavat päänäkymään. Lue artikkeli -vedin säilyy erillisenä; päänäkymään ei lisätä tulkinnan tekstipaneelia.

### Ohjaamo ja virtausten tarkastelu
Vasemman reunan Ohjaamo-vedin avaa kysymykset ja ajanjakson valinnan. Kysymyksen valinta sulkee ohjaamon, pysäyttää kertomuksen ja muuttaa samaa karttaa. Ajanjakson ulkopuoliset ankkurit himmenevät; virtauksen lähtökohta sijoittuu ensimmäisen rajaukseen kuuluvan todellisen ankkurin kohdalle. Jos rajauksessa ei ole ankkuria, yhteyttä ei piirretä ja puute kerrotaan.
`assets/murrokset1-guide.json` sisältää kunkin luvun `flows.response`, `flows.trace` ja `flows.groups` -selitteet ja rajaukset. `scripts/murrokset1-explorer.txt` sisältää ohjaamon, sijoittelun ja piirron. Katkoviivaiset, tasapaksut virtaukset ovat tutkittavan mekanismin esityksiä. Ne eivät ole mitattuja henkilövirtoja, vaikutuskokoja tai todennettuja syy-yhteyksiä. Pysäytä virtaus pysäyttää liikkeen ja säilyttää ketjun. Vähennetyn liikkeen asetuksella virtaus on staattinen. Laajenna kartan työskentelytilaa kasvattaa saman kartan korkeutta. Palauta ajanjaksojen kartta poistaa korostuksen ja laajennuksen.

### Monitasoinen vaikutusmatriisi
Ohjaamon kysymys avaa samaan työskentelytilaan nelitasoisen matriisin, jossa sarakkeet ovat ankkurijaksoja. `assets/murrokset1-matrix.json` on yhteystietojen ylläpitolähde. Solmun tiedot ovat id, chapter, level, label ja offset. Yhteys sisältää source, target, mechanism, modes, status, transmission, period, delay, evidence, alternative ja sources. Sources viittaa `stories/stories.json`-artikkelin lähteen numeroon (story alkaa nollasta; ref yhdestä). Rakentaja tarkistaa solmuviitteet ja näytön tilan ja sisällyttää JSONin bundleen. Päivitä JSON ja aja `node scripts/build-murrokset1.mjs`.
`scripts/murrokset1-matrix.txt` piirtää yhteydet datasta. Solmun valinta seuraa siitä jatkuvia yhteyksiä; viivan klikkaus tai Enter/Space avaa perustelut oikeaan paneeliin ja pysäyttää virtauksen. Ajanjaksojen väliset kantavat yhteydet ovat avoimia tutkimuskysymyksiä ilman suoraa lähdenäyttöä. Rakenteen säilyminen, kasautuminen ja oppiminen erotetaan; sukupolvien välistä periytymistä ei väitetä osoitetuksi. Mobiilissa matriisia vieritetään vaakasuunnassa, jotta nimet säilyvät luettavina.

### Kukkaklusterit (schema_version 2)
Vaikutusmatriisin piirto on korvattu kolmikerroksisella SVG-verkostolla: neljä ajassa järjestettyä ankkurikeskustaa, kuusi teematerälehteä jokaiselle ankkurille ja terälehtien sisältämät mekanismit. Keskustojen ja terälehtien sijainnit pysyvät vakaina. Terälehden klikkaus tai Enter/Space avaa sen mekanismit ja valitsee siitä jatkuvat reitit. Näytä klusterien kokonaisuus sulkee mekanismit.
Solmuilla on `kind` (anchor/petal/mechanism), `parent`, `theme` ja `order`. `membership`-yhteydet ovat jäsennystä ja näkyvät ohuina varsina; niitä ei tulkita vaikutuksiksi. `influence`-yhteydet kulkevat todellisissa yhteystiedoissa mekanismien välillä. Suljetun terälehden mekanismiyhteydet projisoidaan terälehteen. Samat näkyvät yhteydet kootaan yhteen näytön tilan mukaan muuttamatta leveyttä; perustelupaneelista voi valita kaikki taustalla olevat yhteydet. Avaaminen palauttaa tarkat mekanismipäätepisteet.
Uudet mekanismiyhteydet ovat avoimia kysymyksiä tai tulevaisuusskenaarioita, eivät uusia tutkimustuloksia. Toteutus käyttää nykyisen sovelluksen React- ja SVG-rakennetta ilman uutta verkkoriippuvuutta.

### Ankkurikohtaiset ilmiöt ja vastinparit (schema_version 3)
Kukintoja on 14. Keskustoilla on `case_id`, `year`, `rank` ja `summary`; ne vastaavat olemassa olevan `murrosatlas-data.json`-paketin ankkureita. Sijainti määräytyy aikajärjestyksen rank-arvosta. Neljä kertomusta säilyvät omana lukupolkuna; lisäkukinnoille ei ole keksitty lähteistettyjä artikkeleita.
Terälehdet nimeävät ankkurikohtaisen ilmiön, eivät yhteistä teemaa. `theme` säilyy ylläpidon luokittelutietona. Ilmiön mekanismilla voi olla `question`-kenttä. Terälehden valinta etsii suorat vastinparit sekä saapuvista että lähtevistä vaikutusyhteyksistä, myös sen mekanismien kautta. Muissa kukinnoissa sijaitsevat kiinnekohdat korostuvat ja luetellaan alareunassa. Vastinparin valinta avaa kohteen mekanismit, siirtää näkymän kohdalle ja painottaa parin yhteyksiä. Ankkuriin voi siirtyä suoraan Siirry kukintoon -valinnalla.
Uusilla ankkuripareilla on `question` sekä `provenance` (atlas-tapausten tunnisteet). Ne ovat tutkimuskysymyksiä tai ehdollisia skenaarioita. Provenance kertoo mistä tutkimuskehys on johdettu; se ei ole vaikutusnäyttö. Vastinparin puuttuminen ilmoitetaan aineiston puutteena, ei vaikutuksen puuttumisena. Piirtoalue kasvaa datan kukintomäärän mukaan ja tukee vaaka- ja pystyvieritystä.
