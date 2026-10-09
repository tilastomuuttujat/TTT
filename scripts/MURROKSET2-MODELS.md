# Muutoksen kaaren hypoteesimallit

`murrokset2.html` käyttää alkuperäisen version ankkurikertomuksia ja muutoksen kaaren visuaalista rakennetta. Iso kuva -näkymässä voi nyt valita yhdeksän suurta teemaa: työnjako, muuttoliike, omistus, asuminen, koulutus, turva, hoiva, päätöksenteko sekä energia ja ympäristö.

Kaikki toimitetut mallit ovat `untested`: niihin ei ole liitetty vaikutusnäyttöä. Kaaren muoto ja korkeus eivät ole mittauksia. Vaakasuunta kuvaa mekanismin vaiheita, ei vuosia. Rajaus 1850–2050 tarkoittaa historiallisten tutkimuskysymysten ja ehdollisten tulevaisuuspolkujen kehystä.

## Ylläpito

Muokkaa `assets/murrokset2-models.json`-tiedostoa. Jokainen malli sisältää:

- `hypothesis`, `alternative`, `assumptions`: hypoteesi, kilpaileva selitys ja oletukset.
- `observe`, `refutation`: tarvittavat havainnot ja mallia heikentävä/kumoava tulos.
- `features`, `steps`, `labels`: näkyvän kaaren pisteet, kolme kerronnan vaihetta ja haarojen tekstit.
- `status`, `evidence`, `revision`: näytön tila, rajatut tutkimusviitteet ja versionumero.

Näytön tilat ovat `untested`, `provisional`, `supported`, `challenged`. Muut kuin `untested` tarvitsevat vähintään yhden näyttöviitteen. Viite sisältää `title`, `url`, `claim`; claim kertoo täsmällisesti, mitä yhteyttä tutkimus käsittelee ja missä oloissa. Tilaa ei muuteta automaattisesti lähteiden lukumäärän perusteella. Tutkimus voi tukea rajattua mekanismia ilman että koko malli validoituu. `geometry: conceptual` säilyy, kunnes piirto erikseen muutetaan mitattuun aineistoon perustuvaksi.

JSON ladataan sivun avautuessa; kelvollinen tiedosto päivittää näkymän ilman JavaScriptin rakentamista. Bundle sisältää varakopion, jotta lukeminen ei edellytä onnistunutta uutta verkkopyyntöä. Päivitä myös varakopio ajamalla:

```
node scripts/build-murrokset2.mjs
node --test tests/murrokset2-models.test.mjs
```

Rakentaja lukee alkuperäisen `assets/index-yRr8yEkP.js`-bundlen, korvaa muutoksen kaaren komponentin ja tekee rajatut muutokset teemavalintaan. Se kirjoittaa `assets/murrokset2-models.js`. Luettava komponentti on `scripts/murrokset2-arc.txt`. Alkuperäisiä bundletiedostoja ei korvata.

## Lukeminen

Teeman vaihtaminen pysäyttää kerronnan ja aloittaa mallin ensimmäisestä vaiheesta. Kaaren piste tai nykyiset edellinen/seuraava-painikkeet siirtävät vaihetta. Koettele hypoteesia avaa tutkimuskehyksen oikeaan paneeliin ja pysäyttää animaation. X ja Esc sulkevat paneelin. Vähennetyn liikkeen asetus poistaa kaaren virtauksen animaation. Historiallisten ankkurien lähdepohja säilyy erillisenä; se ei automaattisesti validoi laajempaa teemamallia.

## Teemakohtainen aika ja reitit

`visualization` määrittää teeman nimettyjen reittien rivit (`lanes`), neljä vuosirajaa (`years`) ja kunkin kolmen vaiheen yhteydet (`stage_routes`, rivinumeroiden pareja 0–2). Vaakakoordinaatti lasketaan kalenterivuodesta; leveys, korkeus ja väri eivät mittaa vaikutuksen määrää. Teemojen jaksotus on toimituksellinen tutkimusehdotus, ei havaittu murrosvuosi. Kolmas vaihe alkaa vuodesta 2026 ja esitetään katkoviivalla ehdollisena tulevaisuutena.

Jokaisen `steps`-vaiheen `period` vastaa samoja vuosirajoja. Päivitä jaksotus ja seliteteksti yhdessä. Reitit voivat muuttua vaiheesta toiseen: esimerkiksi omistus haarautuu, asumisen reitit kohtaavat ja hoivavastuu punoutuu. Tutkimusnäyttöä ei saa päätellä näistä muodoista.

## Teemojen visuaalinen identiteetti

Työnjaossa `WorkChangeArc` palauttaa alkuperäisen kaaren täsmälleen samoilla poluilla, ankkuripainikkeilla ja täyttöväreillä. Kalenteriaika on erillinen asteikko kuvan alla: kaaren geometriaa ei pidä tulkita mitatuksi aikasarjaksi.

`ThemeScene` toteuttaa muille teemoille omat kuvat: kaksi paikkaa (muutto), haarautuva puu (omistus), silta (asuminen), portaat (koulutus), suoja ja toipumispolku (turva), punos (hoiva), palauterengas (valta) ja uusiutumisen kierto (ympäristö). Ne eivät käytä yhteistä kolmen rivin reititystä. `stage_routes` säilyy mallin koneellisesti luettavana mekanismikuvauksena; kohtauksen oma geometria on luettavassa JS-lähteessä.

## Aikajakson korostus isossa kuvassa

Erillinen aikapalkki on poistettu. `Rn` välittää aktiivisen vaiheen `period`-arvon pääkomponentille, joka antaa sen ison kuvan `Nf`-komponentille vain teemojen esityksen aikana. `AtlasPeriodShade` piirtää taustavarjostuksen atlas-SVG:n sisään ennen käyriä. Vuodet skaalautuvat samalla kaavalla kuin ankkurit (1850 = x60, 2050 = x940). Skenaarion rajat ovat katkoviivoja. Esittelyn sulkeminen tai siirtyminen ankkurikertomukseen poistaa korostuksen. Teemojen oma visuaalinen geometria säilyy.

## Kiinnekohdat ja kuvaajan väistö

Vaiheen `context` sisältää `year`, `era`, `title`, `bridge`, `kind` ja historiallisissa viittauksissa `source` (`title`, `url`). `bridge` kertoo, mitä kysymystä kuvio auttaa tutkimaan. Historiallinen lähde varmistaa kiinnekohdan, ei laajempaa syy-yhteyttä: `evidence` pysyy erillisenä ja mallien status arvioimattomana. Tulevaisuusvaiheen context on `scenario`, ei historiallinen viittaus. Lähdelinkin valinta pysäyttää esityksen.

Teemakuvan yläpuolinen tila mitataan ison kuvan alareunasta. `ResizeObserver` ja ikkunan koon muutos päivittävät välin. Laskenta vähentää nykyisen marginaalin ennen uuden välin laskemista, joten välit eivät kasva mittauskierroksittain. Lyhyt näyttö voi vierittää esitystä; kiinnekohdat eivät peitä kuvaa.
