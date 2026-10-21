# Toistettavat evidenssipäivitykset

`replay-atlas-evidence.py` tarkistaa jäädytetyn päivityserän ja muodostaa siitä atomisen PostgreSQL-transaktion. Python 3.12:n standardikirjasto riittää tarkistukseen ja SQL-generointiin. Suora tietokanta-ajo tarvitsee lisäksi `psql`-asiakkaan.

Julkaisu sisältää koodin, käyttöohjeen, testit ja GitHub-työnkulun. **Tietokannasta vietyä aineistopakettia ei ole julkaistu.** Testit käyttävät kokonaan keksittyjä havaintoja osoitteessa `example.invalid`. Paikallisesti säilytettävän aineistopaketin polku annetaan `--batch-dir`-valinnalla.

## Tarkistus ja koeajo

```bash
python scripts/replay-atlas-evidence.py validate --batch-dir /path/to/private-batch
python scripts/replay-atlas-evidence.py sql --batch-dir /path/to/private-batch > /tmp/evidence-dry-run.sql
```

`sql` ja `apply` päättävät transaktion oletuksena **ROLLBACK**-komentoon. `--commit` ottaa tallennuksen käyttöön. Koko generoitu SQL ajetaan yhdessä yhteydessä. `psql`-ajossa käytetään `ON_ERROR_STOP=1`: virhe katkaisee ajon ja avoin transaktio peruuntuu yhteyden sulkeutuessa.

```bash
# ATLAS_DATABASE_URL asetetaan turvallisesti ympäristöön ennen ajamista.
python scripts/replay-atlas-evidence.py apply --batch-dir /path/to/private-batch --project-id PROJECT_ID
python scripts/replay-atlas-evidence.py apply --batch-dir /path/to/private-batch --project-id PROJECT_ID --commit
```

`ATLAS_DATABASE_URL` on PostgreSQL-yhteysosoite, ei service-role API-avain. URL:n projektin on vastattava manifestia: joko `db.PROJECT_ID.supabase.co` tai Supabasen pooleri käyttäjällä `postgres.PROJECT_ID`. TLS-asetuksen tulee olla `sslmode=require`, `verify-ca` tai `verify-full`. Tunnuksia ei anneta komentorivillä tai tallenneta repositorioon.

## Turvallinen uusinta-ajo

- Paketin tavutarkiste ja odotetut tietuemäärät tarkistetaan manifestista. SHA-256-tarkiste havaitsee muutoksen; se ei ole digitaalinen allekirjoitus.
- Lähdehavainnon avainta, arvoa, luokitusta, julkaisutilaa, jaksoa ja lähdeversiota verrataan tietokantaan.
- Puuttuva tämän erän kenttä tai rivi lisätään. Sama sisältö ohitetaan. Eri sisältö keskeyttää koko transaktion. Uudempaa aineistoa ei korvata; `force`-ohitusta ei ole.
- Korttien muita kenttiä ei korvata. Perusskeeman, korttien ja vertailun lähderivien pitää olla valmiiksi olemassa.
- Neljän kohdetaulun kirjoitukset lukitaan lyhyeksi transaktioksi; lukijat voivat jatkaa. Lukon odotusraja on 10 sekuntia ja lauseen aikaraja 120 sekuntia.
- Onnistunut ajo tallentaa yhden deterministisen `dataset_meta`-merkinnän avaimella `replay:BATCH_ID`. Uusinta-ajo ei lisää toista merkintää eikä muuta samansisältöisiä rivejä.

Päivitys ei muuta skeemaa, RLS-sääntöjä tai käyttöoikeuksia. Koeajokin tarvitsee kirjoitus- ja lukitusoikeudet, koska se kokeilee muutokset ennen peruutusta.

## Erän muoto ja rajaus

Hakemistossa on `bundle.json` ja `manifest.json`. Bundle sisältää seuraavat kentät:

| Kenttä | Sisältö |
|---|---|
| `schema_version`, `batch_id`, `as_of`, `project_id` | Version, erän ja kohdeprojektin tunnukset |
| `case_fields` | Korttien UUID-tunnukset ja erän omistamat JSON-kentät |
| `dataset_meta` | Erän raportit ja kanoniset toteutustietueet |
| `indicator_series`, `indicator_values` | Tämän erän lisäämät jaksosarjat ja havainnot |
| `source_observations` | Vertailujen jäädytetyt lähderivit |

Manifestin `bundle_sha256` on `bundle.json`-tiedoston tavujen SHA-256; `expected_counts` on `validate(bundle)`-funktion palauttama määräsanakirja. Manifestin `batch_id` ja `project_id` vastaavat bundlea. Keksityn esimerkkipaketin generaattori on `tests/evidence_fixture.py`; sitä ei käytetä tuotantoaineiston luomiseen.

Ajuri tukee kolmen 21.10.2026 murroskohtaerän rakennetta: `deepened_evidence_20261021` ja `decision_implementation_20261021` -korttikenttiä sekä `decision_implementation_20261021`-raportin kanonisia tietueita. Se ei ole yleinen koko tietokannan palautus- tai verkkohakutyökalu. Uusi erärakenne vaatii kenttälistojen, lähtötilojen ja testien katselmoinnin. Vanhan erän eri sisältöä ei hyväksytä muuttamalla vain tarkistetta.

Tarkistus laskee jaksojen havaintomäärät, puuttuvat vuodet, sallitut keskiarvot, OLS-kulmakertoimet ja päätepistevertailut. Se varmistaa lähdearvot, määritelmäkatkosten käsittelyn, toteutustietueiden lähteet ja säädöskytkennät sekä ennakkoarvioiden erottamisen toteumista. Tasopalautumisen luokitus säilytetään alkuperäisenä eikä sitä lasketa uudelleen tässä ajurissa. Verkkolähteitä ei haeta uudelleen eikä lähdevarmennuksen tasoa koroteta.

## Testit ja GitHub Actions

```bash
python tests/evidence_fixture.py --output-dir /tmp/evidence-fixture
python scripts/replay-atlas-evidence.py validate --batch-dir /tmp/evidence-fixture
python -m unittest discover -s tests -p test_evidence_replay.py -v
```

Tietokantatestit tarvitsevat `TEST_DATABASE_URL`-muuttujan tyhjään, tilapäiseen localhost-PostgreSQL-kantaan. Ne luovat testitaulut, kokeilevat tuonnin ja poistavat omat testitaulunsa. Ne kieltäytyvät etäpalvelimista ja olemassa olevista samannimisistä tauluista. **Älä osoita niitä oikeaan Atlas-tietokantaan.**

GitHub-työnkulku ajaa PR:ssä ja päähaaran koodimuutoksissa testit fiktiivistä PostgreSQL 17 -testikantaa vasten. Se tarkistaa koeajon peruuntumisen, uusinta-ajon muuttumattomuuden, muiden kenttien säilymisen sekä muuttuneen lähteen, puuttuvan kortin ja myöhäisen raporttiristiriidan aiheuttaman täydellisen peruutuksen.

Käsikäynnistyksen `validate` tarkistaa keksityn esimerkin. `dry-run` ja `apply` toimivat vain päähaarasta hyväksyttyjen testien jälkeen ja tarvitsevat erikseen katselmoidun, päähaarassa olevan aineistohakemiston, projektitunnuksen sekä `ATLAS_DATABASE_URL`-repositoriosalaisuuden. Tämä koodijulkaisu ei lisää tuotantoaineistoa tai salaisuutta. Työnkululla ei ole ajastusta eikä se kirjoita tietokantaan PR-ajossa.
