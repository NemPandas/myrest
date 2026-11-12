# Projektútmutató

## Hatókör és technológia

- Jelenleg a landinggel foglalkozunk. A landing és az admin React alkalmazás, a backend Node.js és TypeScript.
- A landing első változata helyi mock termékadatokkal készül. Az adatforrás legyen elkülönítve a komponensektől, hogy később cserélhető legyen.
- A landinghez ebben a fázisban nem készülnek automatizált tesztek.
- A célközönség a 30–60 éves magyar vásárlók. A SEO és a könnyű olvashatóság minden landingdöntésnél elsődleges szempont.

## Landingterv

### Cél és referenciák

A kezdőoldal az otthoni pihenésre és a masszázsfotel kiválasztására épül. A látogató gyorsan lássa, milyen modellek közül választhat, és miben térnek el egymástól. Az elsődleges útvonal a termékkínálathoz vezet, a másodlagos a választási útmutatóhoz.

- Termékforrás a [Bionwell](https://bionwell.hu/). A kezdőoldal javasolt fókusza a masszázsfotel. A Bionwell további termékkategóriái később külön felületet kaphatnak.
- Márka- és frontendreferencia a [New Comfort kollekcióoldala](https://newcomfort.nl/en/collections/zero-gravity-ultimate-relaxation-massage-chair-massage-chairs-chair). A prémium, termékközpontú bemutatást, az egységes fotózásra épülő rácsot és a vásárlást segítő blokkokat saját, magyar nyelvű arculatra fordítjuk. A végleges márkanév, logó és felhasználható képanyag nyitott döntés.

### Vizuális irány

- A márkakék a New Comfort témájából származó #336680. A háttér meleg törtfehér (#FAF8F4), a kiegészítő felületek világos pasztellkékek (#E6EFF4 és #EDF4F7), a szöveg sötétkék (#22424F). Az elsődleges gomb fehér feliratot kap.
- Nagy, világos enteriőrfotó a nyitóblokkban. A termékkártyák képei azonos arányban és hasonló nézetből készüljenek, semleges háttérrel.
- Levegős térközök, enyhén lekerekített kártyák, finom elválasztók. Magyar ékezeteket támogató betűkészlet, 20 px alapméret, nagy és jól olvasható címsorok, szöveges gombok és rövid, közérthető bekezdések.
- Mobilon egymás alá kerül a nyitóblokk szövege és képe. A termékrács mobilon egy, tableten két, asztali nézetben három oszlopos. A vezérlők legyenek jól érinthetők, látható fókusszal és megfelelő kontraszttal.

### A kezdőoldal sorrendje

| Szakasz | Tartalom és feladat |
| --- | --- |
| 1. Fejléc | Logóhely, valamint a Masszázsfotelek, Választási útmutató, GYIK és Kapcsolat szakaszlinkjei. Mobilon egyszerű menü. |
| 2. Nyitóblokk | Javasolt H1: „Masszázsfotelek az otthoni pihenéshez”. Egy rövid bevezető és egy világos enteriőrkép. Elsődleges gomb: „Masszázsfotelek megtekintése”. Másodlagos link: „Segítség a választáshoz”. |
| 3. Bizalmi sáv | Legfeljebb három rövid, igazolt információ a kipróbálásról, szállításról vagy szervizről. Amíg nincs jóváhagyott adat, a blokk elhagyható. |
| 4. Kiemelt masszázsfotelek | Három Bionwell-alapú mintamodell egy jól áttekinthető rácsban. Kártyánként kép, név, legfeljebb két ellenőrzött jellemző és modellrészletek. Nagyobb kínálatnál jöhet szűrés és rendezés. |
| 5. Választási útmutató | Segítség a fotel helyigényének, a masszázs intenzitásának és a programoknak az értelmezéséhez. A Zero Gravity közérthető magyarázata, ha van ilyen funkciójú modell a kínálatban. |
| 6. Kipróbálás vagy kapcsolat | Rövid blokk a következő lépéshez. A bemutatóterem vagy időpontfoglalás akkor jelenjen meg, ha elérhető és jóváhagyott. Addig a kapcsolatfelvétel a tervezett útvonal. |
| 7. Gyakori kérdések | Helyigény, kiválasztás, szállítás, beüzemelés és szerviz. A válaszok csak igazolt adatokra épüljenek. |
| 8. Lábléc | Jóváhagyott kapcsolati és cégadatok, navigáció és az induláskor szükséges tájékoztatók. |

### Mock adatok és működés

- A nyitó termékrács lehetséges mintamodelljei a Bionwell kínálatából a Flame 3D (SL-A2801), a Balance DC. 4D+ (SL-A520-32) és az Ultimate DC. Premium 5D (SL-A663). A végleges sorrend és modellválaszték később dől el.
- A mock rekord mezői: azonosító, modellnév, modellkód, rövid magyar leírás, ellenőrzött jellemzők, kép és alternatív szöveg, forráslink. Ár csak jóváhagyás után kerüljön nyilvános felületre, forintban.
- A termékkártya a modell saját részletes oldalára vezet. Az élő készletkezelés későbbi döntés.
- A New Comfort szolgáltatási ígéretei nem kerülnek át a magyar landingre. Képet, vásárlói értékelést és kereskedelmi feltételt csak ellenőrzött forrásból, jóváhagyással jelenítünk meg.

### Termékoldal

- Minden modellnek saját, megosztható URL-je legyen, például /masszazsfotelek/flame-3d. Kapjon saját címet, meta leírást és egyetlen H1-et.
- A felső blokkban legyen képgaléria, modellnév és modellkód, rövid összefoglaló, jóváhagyott bruttó ár forintban és jól látható „Megrendelem” gomb.
- A részletek között szerepeljenek az adott modell igazolt funkciói, műszaki adatai, méretei, helyigénye és az elérhető változatok. A jóváhagyott szállítási, beüzemelési és garanciális információk a rendelés indítása előtt legyenek elérhetők.
- A „Megrendelem” gomb a kiválasztott modellel és változattal nyitja meg a rendelési űrlapot. Az első változatban közvetlen, egytermékes rendelési folyamatot tervezünk.

### Rendelés banki átutalással

1. A vevő megadja a nevét, e-mail-címét, telefonszámát, valamint a szállítási és számlázási adatokat. Beküldés előtt áttekinti a kiválasztott modellt, a szállítási díjat, a végösszeget és az egyetlen fizetési módot, a banki átutalást.
2. A sikeresen rögzített rendelés egyedi azonosítót és „Átutalásra vár” állapotot kap. A visszaigazoló képernyő megmutatja az azonosítót, és jelzi, hogy az utaláshoz szükséges adatok e-mailben érkeznek.
3. A rendelési e-mail tartalmazza az azonosítót, a terméket és a választott változatot, a végösszeget forintban, a kedvezményezett nevét, a bankszámlaszámot és a közleménybe írandó rendelési azonosítót. Ha van jóváhagyott fizetési határidő, az is szerepeljen benne. A bankszámlaadatok forrása a backend konfigurációja.
4. A beérkező utalást az üzemeltető a rendelési azonosító és az összeg alapján egyezteti. Az egyeztetés után a rendelés „Fizetve” állapotba kerül, és erről a vevő e-mailt kap. Ezután indulhat a teljesítés.

- A fizetési mód kizárólag banki átutalás. Külső fizetési szolgáltató integrációja nem része a tervnek.
- A backend a rögzítéskor ellenőrzi az árat és eltárolja a rendeléskori tételeket és összegeket. Ismételt beküldés esetén ugyanahhoz a próbálkozáshoz egy rendelés tartozzon. Az e-mail küldése a rögzítés után történjen, és sikertelenség esetén külön újrapróbálható legyen.
- A landing prototípusa mock adatokkal mutatja be a termékoldalt és a rendelési folyamatot. Az éles rendelésrögzítés és e-mail-küldés a backend megvalósításához tartozik.

### SEO és megvalósítási sorrend

- A főcím, a szakaszcímek és a termékszövegek kerüljenek bele a keresők által olvasható kezdeti HTML-be. A React landing renderelési módját ennek megfelelően válasszuk meg.
- Legyen magyar nyelvi beállítás, egy H1 és logikus H2/H3-hierarchia. Az éles oldalhoz egyedi title és meta description, canonical URL, megosztási kép és sitemap tartozzon.
- A nyitókép legyen optimalizált és azonnal betöltődő. A lentebbi képek kapjanak méretattribútumokat és késleltetett betöltést. A képek leírása legyen természetes magyar szöveg.
- Első lépés a mobil és asztali vázlat, utána a szín- és tipográfiai alapok, majd a landing, a termékoldal és a rendelési folyamat felépítése mock adatokkal. Zárásként kézi ellenőrzés mobilon és asztali nézetben, külön figyelve a navigációra, olvashatóságra és az indexelhető tartalomra.
