import fs from 'node:fs';

const file = 'kirjoitukset.json';
const root = JSON.parse(fs.readFileSync(file, 'utf8'));
const article = {
  id: 'talouspolitiikkaa-siteet-silmilla',
  slug: 'talouspolitiikkaa-siteet-silmilla',
  title: 'Talouspolitiikkaa siteet silmillä?',
  titleParts: ['Talouspolitiikkaa', 'siteet silmillä?'],
  subtitle: 'Näemmekö vain sen, mitä on helppo mitata?',
  tags: ['Talouspolitiikka', 'Indikaattorit', 'Hyvinvointivaltio'],
  readingTime: '22 MIN',
  image: 'talouspolitiikkaa-siteet-silmilla.png',
  imageAlt: 'Pystysuuntainen infografiikka talouspolitiikan taskulampusta ja laajemman mittaamisen tarpeesta',
  imageCaption: 'Talouspolitiikan taskulamppu valaisee tarkasti helposti mitattavia suureita. Ongelma syntyy, jos varjoon jäävät toimintakyky, osaaminen, luottamus, ennaltaehkäisy ja päätösten pitkät vaikutusketjut.',
  ogImage: 'talouspolitiikkaa-siteet-silmilla-og.png',
  intro: [
    'Talouspolitiikkaa ei tehdä ilman tietoa. Päinvastoin: julkinen talous kuuluu yhteiskunnan tarkimmin mitattuihin alueisiin. Bruttokansantuotetta, työllisyyttä, inflaatiota, korkoja, alijäämää ja velkasuhdetta seurataan jatkuvasti, ennusteita päivitetään ja päätösten vaikutuksia lasketaan. Silti on mahdollista, että juuri mittaamisen tarkkuus synnyttää harhaanjohtavan turvallisuuden tunteen.',
    'Ongelma ei ole siinä, että nämä mittarit olisivat vääriä. Ne kertovat olennaisia asioita talouden tilasta. Ongelma syntyy, jos hyvin valaistu osa todellisuudesta alkaa näyttää koko todellisuudelta. Se, mikä voidaan muuttaa nopeasti euroiksi, prosenteiksi ja vuosittaisiksi tunnusluvuiksi, saa päätöksenteossa helposti suuremman painon kuin vaikutus, joka syntyy hitaasti, kulkee usean järjestelmän läpi tai näkyy vasta ihmisten toimintakyvyssä.',
    'Talouspolitiikan tilannetta voi siksi kuvata taskulampulla pimeässä. Valokeilassa näkyvät BKT, velka, alijäämä, inflaatio, korot ja työllisyys. Valokeilan ulkopuolelle voivat jäädä osaaminen, luottamus, osallisuus, terveys, ennaltaehkäisy, ympäristön kantokyky ja se, kuinka tämän päivän päätökset muuttavat huomisen kykyä toimia.',
    'Teesi ei siis ole, että talouspolitiikkaa toteutettaisiin tietämättömästi. Kysymys on vaikeampi: toteutammeko sitä osittain siteet silmillä, koska näemme erittäin tarkasti vain sen osan yhteiskunnasta, jonka nykyinen mittaristo osaa valaista?'
  ],
  sections: [
    {
      id: 'taskulamppu-pimeassa',
      title: 'Taskulamppu pimeässä',
      paragraphs: [
        'Taskulamppu on hyödyllinen juuri siksi, että se rajaa huomion. Pimeässä kaikkea ei voi nähdä yhtä aikaa, joten valokeila suunnataan siihen, mikä on tärkeää. Talouspolitiikan mittarit toimivat samalla tavalla: ne tekevät monimutkaisesta yhteiskunnasta päätöksenteolle hallittavan.',
        'Rajaus muuttuu ongelmaksi vasta silloin, kun unohdamme sen olevan rajaus. BKT kertoo tuotannon arvosta, velkasuhde julkisen velan suhteesta talouden kokoon ja työllisyysaste työssä olevien osuudesta. Mikään niistä ei yksin kerro, millainen toimintakyky yhteiskunnalla on viiden, kymmenen tai kahdenkymmenen vuoden kuluttua.',
        'Hyvä mittari voi siten olla huono kompassi, jos sitä käytetään kysymykseen, johon sitä ei ole rakennettu vastaamaan. Talouspolitiikan ongelma ei välttämättä ole tiedon puute vaan näkyvän tiedon ylivalta.'
      ],
      quote: 'Se, mikä näkyy tarkimmin, alkaa helposti näyttää tärkeimmältä.'
    },
    {
      id: 'mita-mittaamme-hyvin',
      title: 'Mitä mittaamme hyvin?',
      paragraphs: [
        'Julkisen talouden ohjauksessa on perusteltua seurata menoja, tuloja, velkaa ja alijäämää. Rahavirrat muodostavat reunaehdon, jota mikään hyvinvointivaltio ei voi pysyvästi sivuuttaa. Samoin inflaatio, korkotaso, työllisyys ja tuotannon kehitys vaikuttavat suoraan kotitalouksiin, yrityksiin ja julkisen sektorin rahoitusasemaan.',
        'Näiden suureiden vahvuus on niiden vertailtavuus. Niitä voidaan seurata ajassa, suhteuttaa muihin maihin ja käyttää ennusteissa. Päätöksentekijä saa nopeasti vastauksen siihen, kuinka paljon jokin ratkaisu maksaa ensi vuonna tai kuinka paljon alijäämä muuttuu arvioidulla ajanjaksolla.',
        'Juuri tässä on samalla niiden institutionaalinen etu. Se, mikä voidaan sijoittaa budjettikehykseen, saa helposti täsmällisemmän aseman kuin se, jonka vaikutus on epävarmempi, hajautunut tai pitkäaikainen.'
      ]
    },
    {
      id: 'mita-ja-varjoon',
      title: 'Mitä jää varjoon?',
      paragraphs: [
        'Yhteiskunnan toimintakyky rakentuu tekijöistä, jotka eivät noudata budjettivuoden rytmiä. Lapsen oppimisvaikeuden varhainen tuki voi näkyä vasta vuosien päästä koulutuspolulla. Mielenterveyspalvelun saatavuus voi vaikuttaa myöhemmin työkykyyn. Luottamuksen heikkeneminen voi vähitellen kasvattaa valvonnan, konfliktien ja hallinnon kustannuksia.',
        'Samoin osaaminen, sosiaalinen pääoma, yhteisöjen toimintakyky ja ympäristön tila ovat sekä hyvinvoinnin tuloksia että tulevan taloudellisen toiminnan edellytyksiä. Jos niitä tarkastellaan vain menoina, niiden tuotannollinen ja yhteiskunnallinen merkitys jää vajaaksi.',
        'Varjoon jääminen ei tarkoita, ettei näistä asioista olisi tutkimusta tai tilastoja. Tietoa on paljon. Ongelma on, ettei tieto aina muodosta yhtä vahvaa ja päätöksentekoa sitovaa kokonaisuutta kuin julkisen talouden välittömät rahamittarit.'
      ]
    },
    {
      id: 'seurausmittarit-ja-syymittarit',
      title: 'Seurausmittarit eivät vielä kerro syytä',
      paragraphs: [
        'Monet keskeiset talousmittarit kuvaavat järjestelmän lopputulosta. Työllisyysaste kertoo työssä olevien määrästä, mutta ei yksin siitä, miksi joku pystyy osallistumaan työelämään ja toinen ei. Velkasuhde kertoo rahoitusaseman kehityksestä, mutta ei siitä, mitkä rakenteelliset tekijät synnyttävät menoja tai vahvistavat veropohjaa.',
        'Jos päätöksenteko reagoi ensisijaisesti lopputulokseen, se voi korjata mittaria vaikuttamatta sen taustalla olevaan mekanismiin. Menon leikkaaminen parantaa välitöntä budjettiasemaa. Jos sama ratkaisu heikentää toimintakykyä ja kasvattaa myöhempää palvelutarvetta, osa säästöstä voi siirtyä ajassa tai hallinnonalalta toiselle.',
        'Siksi tarvitaan seurausmittareiden rinnalle indikaattoreita, jotka kertovat järjestelmän kyvykkyyksien muutoksesta: mitä tapahtuu terveydelle, osaamiselle, palvelujen saavutettavuudelle, työkyvylle, luottamukselle ja mahdollisuudelle osallistua.'
      ]
    },
    {
      id: 'ajan-epasymmetria',
      title: 'Ajan epäsymmetria vääristää päätöksiä',
      paragraphs: [
        'Talouspolitiikan vaikeimpia ongelmia on ajan epäsymmetria. Päätöksen kustannus voi syntyä heti ja hyöty vasta vuosien kuluttua. Toisessa tapauksessa säästö näkyy heti ja haitta myöhemmin. Budjettivuosi kohtelee näitä tilanteita eri tavalla, vaikka yhteiskunnan pitkän aikavälin kannalta niiden järjestys olisi ratkaiseva.',
        'Ennaltaehkäisy on tästä selvä esimerkki. Sen kustannus kirjautuu nykyhetkeen, mutta onnistuminen näkyy usein siinä, että jotakin kallista ei tulevaisuudessa tapahdu. Toteutumatta jäänyt ongelma on vaikeampi havaita kuin toteutunut meno.',
        'Lyhyt tarkasteluhorisontti voi näin suosia päätöksiä, jotka näyttävät tehokkailta juuri siksi, että osa niiden kustannuksista siirtyy mittausjakson ulkopuolelle.'
      ],
      quote: 'Säästö tänään ja kustannus huomenna voivat näyttää hyvältä politiikalta, jos mittari pysähtyy tähän päivään.'
    },
    {
      id: 'siilojen-mittausongelma',
      title: 'Kun säästö ja kustannus ovat eri siiloissa',
      paragraphs: [
        'Ajallinen ongelma yhdistyy hallinnolliseen ongelmaan. Yhden organisaation säästö voi näkyä toisen organisaation menona. Jos koulutuksen, sosiaaliturvan, terveydenhuollon, työllisyyspalvelujen ja kuntatalouden vaikutuksia seurataan erillisinä, kokonaisuuden takaisinkytkentä jää heikoksi.',
        'Tällöin jokainen osa voi toimia oman mittarinsa näkökulmasta rationaalisesti ja kokonaisuus silti heikentyä. Tämä on erityisen hankalaa hyvinvointivaltiossa, jossa ihmisen elämäntilanne ylittää lähes aina hallinnolliset rajat.',
        'Talouspolitiikan mittariston pitäisi siksi kyetä seuraamaan myös kustannusten ja hyötyjen siirtymistä järjestelmän sisällä. Muuten paikallinen tehokkuus voi peittää kokonaisuuden tehottomuuden.'
      ]
    },
    {
      id: 'indikaattorit-valokeilan-laajentajina',
      title: 'Indikaattorit laajentavat valokeilaa',
      paragraphs: [
        'Ratkaisu ei ole yhden uuden hyvinvointimittarin nostaminen BKT:n tai velkasuhteen tilalle. Yksi koontiluku synnyttäisi helposti saman ongelman uudessa muodossa. Tarvitaan hierarkia, jossa politiikkatoimet, havaittavat indikaattorit, vaikutusketjut ja yhteiskunnalliset tavoitteet erotetaan toisistaan.',
        'Indikaattori toimii tällöin välittävänä havaintona. Se kertoo, liikkuuko jokin mekanismin kannalta olennainen tekijä oikeaan suuntaan ennen kuin lopullinen vaikutus näkyy. Hoitoon pääsy, työkyky, oppimistulokset, pienituloisuus, luottamus tai investoinnit voivat toimia tällaisina varhaisempina signaaleina.',
        'Indikaattoreiden arvo ei ole niiden määrässä. Liian suuri mittaristo tekee päätöksenteosta yhtä sokeaa kuin liian pieni, jos olennaista ei enää eroteta. Tärkeää on osoittaa, miksi juuri tietty indikaattori kuuluu vaikutusketjuun.'
      ]
    },
    {
      id: 'politiikkatoimesta-vaikutusketjuun',
      title: 'Politiikkatoimesta vaikutusketjuun',
      paragraphs: [
        'Laajempi mittaaminen muuttaa myös kysymyksen, jonka talouspolitiikalle esitämme. Sen sijaan että kysymme vain paljonko päätös maksaa, kysymme mitä päätös muuttaa, kuinka nopeasti muutos tapahtuu, missä se näkyy ja mitä palautekytkentöjä siitä syntyy.',
        'Esimerkiksi ennaltaehkäisevän toiminnan lisäys voi kasvattaa menoja välittömästi. Jos se myöhemmin vähentää raskaiden palvelujen tarvetta, vahvistaa toimintakykyä ja parantaa työllisyyttä, vaikutus palaa julkiseen talouteen pienempinä menoina ja vahvempana veropohjana. Kaikki lenkit ovat epävarmoja, mutta juuri siksi ne pitäisi tehdä näkyviksi.',
        'Vaikutusketju ei poista epävarmuutta. Se tekee epävarmuuden paikannettavaksi. Päätöksentekijä ja kansalainen voivat nähdä, missä kohdassa oletus on vahva, missä heikko ja millä indikaattorilla oletusta voidaan myöhemmin testata.'
      ]
    },
    {
      id: 'viisi-tavoiteulottuvuutta',
      title: 'Tasapaino vaatii useamman tavoiteulottuvuuden',
      paragraphs: [
        'Hyvinvointivaltion onnistumista ei ole mielekästä puristaa yhteen tavoitteeseen. Julkisen talouden kestävyys on välttämätön ehto, mutta se ei yksin kerro järjestelmän onnistumisesta. Samoin eriarvoisuuden vähentäminen, toimintakyky tai talouden dynamiikka eivät yksin riitä.',
        'Yksi mahdollinen tarkastelurunko muodostuu viidestä ulottuvuudesta: julkisesta taloudesta, eriarvoisuudesta, toimintakyvystä, sukupolvitasapainosta ja talouden dynamiikasta. Niiden tehtävä ei ole tuottaa yhtä kiistatonta totuutta vaan tehdä näkyväksi päätösten vaihtosuhteet.',
        'Jos jokin ratkaisu parantaa yhtä ulottuvuutta mutta heikentää voimakkaasti kolmea muuta, tätä ei pitäisi peittää yhdellä keskiarvolla. Tasapaino tarkoittaa juuri sitä, että myös tavoitteiden välinen hajonta otetaan vakavasti.'
      ],
      bullets: ['Julkinen talous', 'Eriarvoisuus', 'Toimintakyky', 'Sukupolvitasapaino', 'Talouden dynamiikka']
    },
    {
      id: 'mittaaminen-ei-ole-neutraalia',
      title: 'Mittaaminen ei ole neutraalia',
      paragraphs: [
        'Mittarit eivät vain kuvaa päätöksentekoa. Ne myös ohjaavat sitä. Kun organisaation onnistuminen sidotaan tiettyyn tunnuslukuun, toiminta alkaa väistämättä mukautua tunnuslukuun. Siksi mittarin valinta on samalla vallankäyttöä: se määrittää, mikä tulee näkyväksi ja mikä jää taustalle.',
        'Laajempi mittaristo ei myöskään ole automaattisesti objektiivisempi. Indikaattorien valinta, painotus ja tavoitetaso sisältävät arvovalintoja. Ne pitäisi siksi tehdä avoimesti eikä piilottaa teknisen laskennan sisälle.',
        'Hyvä järjestelmä erottaa toisistaan havainnon, mallioletuksen ja poliittisen tavoitteen. Tilasto kertoo mitä on havaittu. Vaikutusmalli kertoo, miten asioiden oletetaan liittyvän toisiinsa. Demokratia ratkaisee, mitä tavoitteita ja vaihtosuhteita pidetään hyväksyttävinä.'
      ]
    },
    {
      id: 'simulaattori-paatoksenteon-peilina',
      title: 'Simulaattori päätöksenteon peilinä',
      paragraphs: [
        'Tällaisessa ajattelussa simulaattorin tehtävä ei ole ennustaa tulevaisuutta yhdellä oikealla luvulla. Sen tehtävä on toimia päätöksenteon peilinä: näyttää oletukset, vaikutusketjut, viiveet ja tavoitteiden väliset jännitteet.',
        'Käyttäjä voisi muuttaa esimerkiksi verotusta, palvelutasoa, tulonsiirtoja, ennaltaehkäisyä, työmarkkinapolitiikkaa, julkista omistusta tai velkarahoitusta. Malli näyttäisi ensin, mitä indikaattoreita muutos liikuttaa, sitten miten vaikutus etenee ajassa ja lopuksi miten eri tavoiteulottuvuuksien tasapaino muuttuu.',
        'Tärkeintä olisi välttää näennäistä tarkkuutta. Jos kertoimia ei ole empiirisesti estimoitu, ne on merkittävä havainnollistaviksi. Epävarmuus ei heikennä mallia, jos se näytetään. Päinvastoin: näkyvä epävarmuus voi olla rehellisempää päätöksenteon tukea kuin yksittäinen tarkka ennusteluku.'
      ]
    },
    {
      id: 'siteet-pois',
      title: 'Kuinka siteet otetaan pois?',
      paragraphs: [
        'Siteiden poistaminen ei tarkoita talouskurin hylkäämistä eikä sitä, että jokainen hyväksi koettu asia pitäisi rahoittaa. Se tarkoittaa, että taloudellisten reunaehtojen rinnalle rakennetaan järjestelmällinen kuva siitä, mitä päätökset tekevät yhteiskunnan tulevalle toimintakyvylle.',
        'Ensimmäinen askel on yhdistää politiikkatoimet niitä kuvaaviin indikaattoreihin. Toinen on kuvata vaikutusketjut ja niiden viiveet. Kolmas on arvioida seurauksia usean tavoiteulottuvuuden kautta. Neljäs on palauttaa toteutunut tieto malliin ja korjata oletuksia sen perusteella.',
        'Tällöin talouspolitiikka ei lakkaa olemasta talouspolitiikkaa. Se muuttuu paremmin näkeväksi talouspolitiikaksi.'
      ]
    },
    {
      id: 'lopuksi',
      title: 'Parempi mittaaminen ei ratkaise politiikkaa – mutta se parantaa sen näkökykyä',
      paragraphs: [
        'Yhteiskunta ei voi tehdä päätöksiä täydellisen tiedon varassa. Tulevaisuus on epävarma, vaikutusketjut ovat monimutkaisia ja tavoitteet osittain ristiriitaisia. Siksi päätöksenteko tarvitsee aina harkintaa, arvoja ja poliittisia valintoja.',
        'Juuri tästä syystä mittariston pitäisi tehdä epävarmuus ja vaihtosuhteet näkyviksi sen sijaan, että se kaventaisi todellisuuden muutamaan helposti laskettavaan suureeseen. Velka, alijäämä, BKT ja työllisyys kuuluvat edelleen valokeilaan. Niiden rinnalle tarvitaan kuitenkin tietoa siitä, millaista toimintakykyä päätökset rakentavat tai kuluttavat.',
        'Talouspolitiikan taskulamppua ei tarvitse sammuttaa. Valokeilaa pitää laajentaa.'
      ],
      quote: 'Parempi mittaaminen ei poista poliittisia valintoja. Se auttaa näkemään, mitä todella olemme valitsemassa.'
    }
  ],
  closing: 'Hyvinvointivaltion ongelma ei välttämättä ole se, että päätämme väärin – vaan se, että mittaamme liian kapeasti sitä, mitä pidämme onnistumisena.'
};

if (!Array.isArray(root.kirjoitukset)) throw new Error('kirjoitukset array missing');
const i = root.kirjoitukset.findIndex(a => a.id === article.id || a.slug === article.slug);
if (i >= 0) root.kirjoitukset[i] = article;
else root.kirjoitukset.push(article);
fs.writeFileSync(file, JSON.stringify(root, null, 2) + '\n');
console.log(i >= 0 ? 'Updated article' : 'Added article', article.slug);
