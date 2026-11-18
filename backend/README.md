# MyRest backend

Node.js 22.18+ és MySQL 8.0.16+ szükséges. A backend az adminfiókokat, munkameneteket és a termékkatalógust szolgálja ki. A végpontok és üzleti szabályok az [admin- és katalógustervben](admin-es-katalogus.md) találhatók.

## Indítás

1. Hozd létre az adatbázist MySQL-ben, válaszd ki, és futtasd a [schema.sql](schema.sql) fájlt egyszer. Hozz létre az alkalmazásnak egy MySQL-felhasználót `SELECT`, `INSERT`, `UPDATE` és `DELETE` jogosultsággal ezen az adatbázison.
2. A `backend` mappában másold az `.env.example` fájlt `.env` néven, és töltsd ki az adatbázis beállításait. A távoli, tanúsítvánnyal védett MySQL eléréshez a szerver CA-fájlját a `DB_TLS_CA_FILE` adja meg. A MySQL szerveren legyen bekapcsolva a szigorú SQL mód.
3. Futtasd az `npm ci` és az `npm run build` parancsot.
4. Hozd létre az első tulajdonost az `npm run owner:create -- owner@example.com` paranccsal. A legalább 15 karakteres jelszót az üzemeltetői titoktárolóból add a parancs standard bemenetére.
5. Indítsd az API-t az `npm start` paranccsal, majd kérd le a `GET /api/health` végpontot. Fejlesztéshez az `npm run dev` figyeli a TypeScript fájlokat.

Éles környezetben állítsd be a `NODE_ENV=production` értéket. A böngészőből az adminfelület és az `/api` ugyanazon a HTTPS originen legyen elérhető, amelyet az `APP_ORIGIN` ad meg. A webkiszolgáló az `/api` útvonalat továbbítsa a Node alkalmazásnak. Fejlesztésben ugyanezt egy dev proxy is megoldja. Az író admin kérésekhez ennek az originnek kell szerepelnie az `Origin` fejlécben. Közvetlen API-elérésnél a `TRUST_PROXY_HOPS` maradjon 0. Reverse proxy mögött a valós, közvetlenül megbízható továbbítási útvonal hosszát add meg, hogy a belépési próbálkozások IP-korlátja a kliensre vonatkozzon.

A meghívó 24 óráig, a munkamenet 8 óráig érvényes. A létrehozáskor visszaadott meghívótoken átadásáról a tulajdonos gondoskodik. Az `npm run sessions:prune` törli a lejárt vagy visszavont munkameneteket. A belépési és regisztrációs próbálkozáskorlát folyamatonkénti, ezért több API-példány esetén a közös IP-korlátot a reverse proxyn vagy megosztott tárolóval kell érvényesíteni.

## API használata

- A publikus és adminlisták `{ items, limit, offset }` alakúak. Az admin terméklista szűrői `status=draft|published`, `deleted=exclude|only|all`, `q` és `order=position|name|updated`.
- A termékmezők neve megegyezik a séma oszlopnevével. A publikus lista borítója a `cover`, a részlet galériája az `images`. A részlet a `variants` tömbben adja vissza a színeket. A numerikus adatbázis-azonosítók JSON-szövegek.
- Létrehozáskor a `name`, `model_code` és `slug` kötelező. A `PATCH` a megadott mezőket módosítja. A galéria megadása cseréli a galéria adatait. A változatok kód alapján frissülnek, a kihagyott kódok letiltásra kerülnek. A `variants[].active` alapértéke `true`. Az adatbázis az URL-t és a kép leírását tárolja, a képfájlt a webkiszolgáló vagy a képtároló szolgálja ki.
- Módosításkor, publikáláskor, visszavonáskor, törléskor és visszaállításkor küldd a legutóbb kapott `version` értékét a JSON törzsben. A sikeres válasz az új termékrekordot és verziót adja vissza. `409` esetén az admin újra lekérheti a rekordot.
- A login, register, invite és a termékírási végpontok JSON-bemenetet fogadnak. A belépés beállítja a munkamenet-cookie-t. A böngésző az azonos originen automatikusan küldi. A `GET /api/admin/auth/me` adja vissza az aktuális fiókot.
- A hibák `{ error: { code, message, fields? } }` alakban jönnek. Munkamenethiba esetén `401`, jogosultság vagy hibás origin esetén `403`, hiányzó rekordnál `404`, ütközésnél `409`, validációs hibánál `422`, próbálkozási korlátnál `429` a válasz.

## Integrációs teszt

Hozz létre egy külön, üres, `_test` végződésű adatbázist, és töltsd be a sémát. Add meg az elérését a környezeti változókban vagy az `.env.test` fájlban `NODE_ENV=test` beállítással. Az `npm run test:integration` valódi MySQL-en fut, próbarekordokat hoz létre, és üres admin táblát igényel. Ismétléshez használj friss tesztadatbázist.
