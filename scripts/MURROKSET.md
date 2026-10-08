# Murrosatlas: lukija ja ylläpito

`murrokset.html` lataa lukijalle `murrosatlas-data.json`-julkaisupaketin. Supabase-haku käynnistyy ylläpitoon kirjautuneelle pääkäyttäjälle. Tietokannan käyttöoikeudet määritellään edelleen Supabasen RLS-säännöissä.

Ylläpidon **Vie luonnos** lataa uuden JSON-tiedoston. Korvaa sillä repositorion `murrosatlas-data.json` ja julkaise muutos GitHubissa. Pelkkä lataaminen ei päivitä lukijan palvelimella olevaa tiedostoa.

Ankkurien suhteet ovat paketin `relations`-taulukossa: `id`, `from`, `to`, `type`, `label` ja `rationale`. `from` ja `to` ovat julkaistujen ankkurien tunnuksia; `type` on `theme`, `hypothesis` tai `scenario`. Nykyinen vienti säilyttää julkaistut, kelvolliset suhteet. Suhteiden muokkaus tehdään tässä versiossa JSONissa; lomake ylläpitää ankkureita.

Näytön taso määritetään ankkurin `data.evidence_level`-kentässä: `measured`, `sourced`, `logic` tai `hypothesis`. Liitetty tilastosarja ei yksin todista syy-yhteyttä. Puuttuva taso tulkitaan hypoteesiksi.

Luettavat muutoslähteet ovat `assets/murrokset-core.mjs`, `scripts/murrokset-components.txt` ja `scripts/patch-murrokset.mjs`. Alkuperäinen kooste säilyy tiedostossa `assets/index--gBIk-ew.js`; sen korvaaminen edellyttää päivitysskriptin tarkistamista. Skripti pysähtyy, jos odotettua muutoskohtaa ei löydy.

Suorita repositorion juuresta:

```sh
node scripts/patch-murrokset.mjs
node --check assets/murrokset-reader.js
node --test tests/murrokset.test.mjs
```

Julkaise myös muodostettu `assets/murrokset-reader.js`. Kuvaajan viiva katkeaa puuttuviin vuosiin, saman vuoden useisiin arvoihin ja havainto/arvio-statuksen vaihtumiseen. Näin viiva ei väitä aineistoa yhtenäiseksi.
