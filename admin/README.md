# MyRest adminfelület

Az admin önálló React alkalmazás a projekt `admin/` könyvtárában, saját függőségekkel, indítással és builddel. Útvonala `/admin/`, a regisztrációé `/admin/regisztracio/`. Az adminoldalak noindex jelölést kapnak. A landing nem tartalmaz adminfelületet.

## Helyi indítás

1. Állítsd be és indítsd a backendet a `backend/README.md` alapján. Az első tulajdonosi fiókhoz használd az ott leírt `owner:create` parancsot.
2. Fejlesztéskor a backend `.env` fájljában legyen `APP_ORIGIN=http://localhost:5174`, mert innen érkeznek a böngészős kérések.
3. Az `admin` könyvtárban: `npm ci`, majd `npm run dev`.
4. Nyisd meg a `http://localhost:5174/admin/` oldalt. A Vite az `/api` kéréseket a `http://localhost:3001` backendnek továbbítja. Más célhoz a `MYREST_API_TARGET` környezeti változó használható.

A belépés a backend HttpOnly munkamenet-cookie-ját használja. A jelszót vagy a munkamenetet a frontend nem tárolja localStorage-ban. A regisztráció a meglévő, e-mailhez kötött tulajdonosi meghívót igényli; a meghívó az API `POST /api/admin/invites` végpontján hozható létre. A regisztrációs linkben a `?token=...` előre kitölti a meghívókódot.

## Regisztráció elrejtése

A `VITE_ADMIN_REGISTRATION=false` buildváltozó elrejti a regisztrációt és a közvetlen regisztrációs útvonalon is a belépést mutatja. A backend meghívós regisztrációs végpontját ez nem kapcsolja ki.

## Termékkezelés és előnézet

- Kereshető, lapozható lista, piszkozat/közzétett állapotszűrővel.
- Új termék és meglévő termék szerkesztése: név, modellkód, URL-azonosító, masszázstípus, bruttó ár, sorrend, összefoglaló, hosszú leírás, funkciók, műszaki adatok, képgaléria, színváltozatok, forrás és SEO.
- Képfeltöltés, külső kép-URL, alternatív szöveg és képsorrend. Az első kép a borító. A feltöltés fájlt hoz létre, de nem menti a terméket.
- A Lista előnézet és Részletes előnézet az űrlap pillanatnyi adatait mutatja mentés és publikálás nélkül, hiányos terméknél is. A vásárlói felülettel közös React komponensek iframe-ben jelennek meg, így a mobilnézet valódi 390 px széles viewportot kap. Az előnézetből rendelést nem lehet indítani.
- Közzététel csak már mentett, változatlan adatokkal kezdeményezhető. A backend ellenőrzi a publikálhatóságot és a szerkesztési verziót. A közzétett termék piszkozatba visszavonható.
- A szerkesztő figyelmeztet a nem mentett adatok elhagyására.

A publikus landing az adminban nyelvenként közzétett termékeket az élő API-ból tölti be. A szállítás, garancia és rendelés blokkjai a jelenlegi vásárlói prototípus tartalmát mutatják.

Élesben az `admin/dist` tartalmát az `/admin/` útvonalon szolgáld ki; az `/admin/*` kliensoldali útvonalak essenek vissza az `/admin/index.html` fájlra. A landing külön buildjét a webhely gyökerében szolgáld ki, az `/api` kéréseket pedig továbbítsd a backendnek. A backend `APP_ORIGIN` egyezzen a közös HTTPS-originnel. Az admin buildje az `admin` könyvtárban: `npm run build`.

A `shared/ProductViews.jsx`, `shared/catalog.js` és `shared/storefront.css` közös megjelenítést biztosít a landing termékoldalainak és az admin előnézeteinek. Mindkét alkalmazás a saját React-példányát használja a Vite deduplikálásával.

## Távoli backend IP-címen

A `.env` és `.env.example` fájlban `MYREST_API_TARGET=http://165.22.115.165` adja meg az API szerverét, `/api` utótag nélkül. Módosítás után indítsd újra az `npm run dev` folyamatot. A böngésző relatív `/api` kéréseit a Vite proxy továbbítja, a preview is ezt használja. A build kiszolgálásakor külön webszerveres `/api` reverse proxy szükséges. A frontend env nem tartalmazhat titkokat.

A backend `.env` fájljában `APP_ORIGINS=http://localhost:5173,http://localhost:5174` engedélyezi a helyi frontendeket. Más címen megnyitott frontend pontos originjét add a listához. A backend maradjon `HOST=127.0.0.1`, `PORT=3001` beállításon; az Nginx a 80-as porton továbbít. Példakonfiguráció: `backend/deploy/myrest-ip.nginx.conf`.

Az Nginx fájl a szerver `/home/deploy/myrest-ip.nginx.conf` útvonalára is fel van másolva. Telepítés a szerveren:

```bash
sudo install -m 644 /home/deploy/myrest-ip.nginx.conf /etc/nginx/sites-available/myrest-ip
sudo ln -sfn /etc/nginx/sites-available/myrest-ip /etc/nginx/sites-enabled/myrest-ip
sudo nginx -t && sudo systemctl reload nginx
curl http://165.22.115.165/api/health
```

Domain és HTTPS nélkül ez ideiglenes HTTP fejlesztői elérés: az admin belépési adatai titkosítatlan hálózaton mennek.

## Feltöltés a szerverre

Git Bashben, a `admin` mappából:

```bash
bash ./uploader-admin
```

PowerShellből ugyanebben a mappában:

```powershell
& "C:\Program Files\Git\bin\bash.exe" ./uploader-admin
```

A script helyben buildel, SSH-kulccsal feltölti a `dist` tartalmát a `/var/www/myrest/admin/releases` új könyvtárába, és siker után átváltja a `current` szimbolikus linket. A korábbi kiadások megmaradnak. Egyedi kulcs a backendhez hasonlóan a `DEPLOY_KEY` változóban adható meg. Nincs szükség PM2-re vagy minden feltöltés után Nginx-újraindításra. A `.env` nem kerül a szerverre; a buildváltozókat feltöltés előtt állítsd be.

Első használat előtt a szerveren egyszer:

```bash
sudo install -d -m 755 -o deploy -g deploy /var/www/myrest/admin /var/www/myrest/landing
```

A `backend/deploy/myrest-ip.nginx.conf` frissített konfigurációja a landing `current` könyvtárát a `/`, az adminét az `/admin/` útvonalon szolgálja ki. A landing feltöltője a gyökérútvonalra buildel, a GitHub Pages beállításától függetlenül. Ha az admint az IP-címen nyitod meg, a backend `.env` fájljában az `APP_ORIGINS` listába a `http://165.22.115.165` origint is vedd fel, majd `pm2 restart myrest-backend --update-env`.

## Magyar és német terméktartalom

Egy terméknek közös az ára, modellkódja, URL-azonosítója, masszázstípusa, sorrendje, forráslinkje, képfájljai, változatkódjai és színkódjai. A Magyar / Német fülek alatt külön szerkeszthető a név, összefoglaló, leírás, funkciólista, műszaki adatok szövege, SEO-cím és SEO-leírás. A képleírás és a szín neve szintén nyelvfüggő. A mentés mindkét nyelv módosításait egy tranzakcióban menti; a fülváltás nem veszít el adatot.

Mindkét előnézet az aktuális nyelvet és a még nem mentett adatokat mutatja. A nyelvi kapcsoló melletti állapot és a közzététel gomb csak a kiválasztott nyelvre vonatkozik. Közzététel előtt menteni kell. A német publikáláshoz név, összefoglaló, leírás, pozitív közös ár, legalább egy kép német képleírásokkal és az összes aktív színváltozat német neve szükséges. Közzétett változatot érvénytelenítő módosítás mentése visszautasításra kerül; ilyenkor előbb vondd vissza az érintett nyelvet. A termék törlése mindkét nyelvet visszavonja; visszaállításkor mindkettő piszkozat marad.

A terméklistában külön HU és DE állapot látszik, az állapotszűrő nyelve kiválasztható, a keresés mindkét nyelv nevét figyeli. A modellneveket és szövegeket az admin nem fordítja automatikusan: a német tartalmat külön kell megadni.

A landing a nyelvhelyes publikus API-ra van kötve: a kiválasztott nyelven publikált termékek jelennek meg, a piszkozatok nem.


## Rendelések

A fejléc **Rendelések** menüpontja a `/admin/rendelesek/` oldalra vezet. A belépett adminok itt láthatják a rendelés idejét (budapesti idő), a vevőt, terméket, változatot, mennyiséget, összeget és állapotot. Keresés, nyelvi és állapotszűrés, valamint lapozás segíti a listázást. A **Megnyitás** a mentett rendelés teljes adatlapját mutatja, beleértve a kapcsolattartási, szállítási és számlázási adatokat. A webszerver ezt az útvonalat is az admin `index.html` fájljára irányítsa (a mellékelt Nginx-konfiguráció ezt már kezeli).

A funkcióhoz a backend `migrations/002-orders.sql` migrációja szükséges. Brevo-beállítás nem kell a mentéshez és a listához.
