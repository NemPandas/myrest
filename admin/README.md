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

A publikus landing továbbra is a projektútmutatóban előírt mock katalógust használja. Az admin mentései a valódi backendhez mennek; a publikus katalógus API-ra átállítása külön lépés. A szállítás, garancia és rendelés blokkjai a jelenlegi vásárlói prototípus tartalmát mutatják.

Élesben az `admin/dist` tartalmát az `/admin/` útvonalon szolgáld ki; az `/admin/*` kliensoldali útvonalak essenek vissza az `/admin/index.html` fájlra. A landing külön buildjét a webhely gyökerében szolgáld ki, az `/api` kéréseket pedig továbbítsd a backendnek. A backend `APP_ORIGIN` egyezzen a közös HTTPS-originnel. Az admin buildje az `admin` könyvtárban: `npm run build`.

A `shared/ProductViews.jsx`, `shared/catalog.js` és `shared/storefront.css` közös megjelenítést biztosít a landing termékoldalainak és az admin előnézeteinek. Mindkét alkalmazás a saját React-példányát használja a Vite deduplikálásával.
