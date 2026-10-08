# Alkuperäisen käyrän opastus

`murrokset1.html` säilyttää alkuperäisen käyrämäisen etusivun ja ankkuripainikkeet. Seitsemän sekunnin toimettomuus käynnistää opastuksen. Ylläpitolomakkeen tai kirjautumisikkunan ollessa avoinna opastus ei käynnisty. Vähennetyn liikkeen asetus estää automaattisen käynnistyksen.

Jokaisessa ajanjaksossa on kolme vaihetta: katso kuvion asetelmaa, ymmärrä mahdollinen mekanismi ja koettele tulkintaa havainnoilla. Käyrän ja koettelun selitysvaihe kestää 12 sekuntia. Mekanismivaihe etenee kehän neljän kohdan kautta, 6,5 sekuntia kohdassa. Vaiheita tai ajanjaksoja ei valita valikosta; opastaja etenee itse. Lukija voi pysäyttää tai sulkea opastuksen. Viimeisen ajanjakson jälkeen opastus pysähtyy; lukija voi myös sulkea sen heti.

Tekstejä ylläpidetään tiedostossa `assets/murrokset1-guide.json`. Säilytä neljä ajanjaksoa ja kussakin kolme vaihetta. `title` on tutkittava kysymys, `text` sen tulkinta, `loop` käsitteellisen kehän tekstit ja `phases` vaiheiden otsikot sekä selitykset. `loop_notes` sisältää neljä korostuksen mukana vaihtuvaa mekanismin selitystä. JSON luetaan sivun avautuessa. Kooste sisältää viimeksi muodostetun version varalla, jos tiedostohaku epäonnistuu. Päivitä kooste myös tekstimuutosten jälkeen, jotta varaversio vastaa julkaisua.

```sh
node scripts/build-murrokset1.mjs
node --input-type=module --check < assets/murrokset1-guided.js
```

Alkuperäistä `assets/index--gBIk-ew.js`-koostetta ja `murrokset.html`-sivua ei muuteta. Uusi opastuksen komponentti on luettavana tiedostossa `scripts/murrokset1-tour.txt`. Käyrän pisteytys ja profiilit ovat havainnollistavia tulkintoja, eivät historiallisia mittaustuloksia. Opastustekstin vahvistaminen edellyttää lähteiden ja ryhmittäisten havaintojen arviointia.

Opastaja käyttää käyrän vieressä omaa tilaa, eikä ole kuvaajan päällä oleva ikkuna. Kapealla näytöllä se sijoittuu käyrän alle. Mekanismin animaatio ja sen vaihtuva selitys ovat samassa lohkossa.
