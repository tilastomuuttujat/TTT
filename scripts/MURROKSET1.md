# Alkuperäisen käyrän opastus

`murrokset1.html` säilyttää alkuperäisen käyrämäisen etusivun ja ankkuripainikkeet. Seitsemän sekunnin toimettomuus käynnistää opastuksen. Ylläpitolomakkeen tai kirjautumisikkunan ollessa avoinna opastus ei käynnisty. Vähennetyn liikkeen asetus estää automaattisen käynnistyksen.

Jokaisessa ajanjaksossa on kolme vaihetta: katso kuvion asetelmaa, ymmärrä mahdollinen mekanismi ja koettele tulkintaa havainnoilla. Käyrävaihe seuraa kahta ankkuripistettä, 7,5 sekuntia kussakin. Koetteluvaihe kestää 12 sekuntia. Mekanismivaihe etenee kehän neljän kohdan kautta, 6,5 sekuntia kohdassa. Vaiheita tai ajanjaksoja ei valita valikosta; opastaja etenee itse. Lukija voi pysäyttää tai sulkea opastuksen. Viimeisen ajanjakson jälkeen opastus pysähtyy; lukija voi myös sulkea sen heti.

Tekstejä ylläpidetään tiedostossa `assets/murrokset1-guide.json`. Säilytä neljä ajanjaksoa ja kussakin kolme vaihetta. `title` on tutkittava kysymys, `text` sen tulkinta, `loop` käsitteellisen kehän tekstit ja `phases` vaiheiden otsikot sekä selitykset. `loop_notes` sisältää neljä korostuksen mukana vaihtuvaa mekanismin selitystä. JSON luetaan sivun avautuessa. Kooste sisältää viimeksi muodostetun version varalla, jos tiedostohaku epäonnistuu. Päivitä kooste myös tekstimuutosten jälkeen, jotta varaversio vastaa julkaisua.

```sh
node scripts/build-murrokset1.mjs
node --input-type=module --check < assets/murrokset1-guided.js
```

Alkuperäistä `assets/index--gBIk-ew.js`-koostetta ja `murrokset.html`-sivua ei muuteta. Uusi opastuksen komponentti on luettavana tiedostossa `scripts/murrokset1-tour.txt`. Käyrän pisteytys ja profiilit ovat havainnollistavia tulkintoja, eivät historiallisia mittaustuloksia. Opastustekstin vahvistaminen edellyttää lähteiden ja ryhmittäisten havaintojen arviointia.

Opastaja liikkuu kuvion sisällä. Käyrävaiheessa selitys ja osoitin seuraavat korostettujen ankkurien sijaintia. Mekanismivaiheessa selitys seuraa kehän neljää kohtaa ja niiden vaihtuvaa tekstiä. Kohde mitataan DOMista; sijoittelu huomioi ankkuripainikkeet ja päivittyy vierityksessä sekä koon muuttuessa. Selitys ei ota vastaan klikkauksia, joten alla oleva kuvio pysyy käytettävissä. Vain pysäytys ja sulkeminen ovat painikkeita. Liikettä vähentävä asetus estää automaattisen käynnistyksen ja siirtymäanimaatiot.

Tarinankertojan seitsemän pistettä vastaavat kahta käyrän kohtaa, neljää mekanismin kohtaa ja jälkeä käsittelevää päätösvaihetta. Pisteen valinta siirtyy suoraan kohtaan ja pysäyttää automaattisen etenemisen; Jatka käynnistää sen uudelleen. Nuolinäppäimet, Home ja End toimivat pisteissä. Selite piirtyy suoraan kuvion taustalle ilman puhekuplaa. Vanha teksti häipyy uuden ilmestyessä. Vähennetyn liikkeen asetuksella vaihto tapahtuu ilman animaatiota.

Selitteen paikka etsitään koko kuviosta 24 pikselin välein. Painikkeet, erilliset otsikkotekstit, käyrän näytteistetty viiva ja mekanismin kehä varataan suojaetäisyydellä. Vapaista paikoista valitaan kohdetta lähin. Jos vapaata suorakulmiota ei mahdu, kuvion alle varataan lisätilaa. Teksti ei liu’u kuvion yli; sen vaihto tapahtuu häipymällä ja piirtymällä.
