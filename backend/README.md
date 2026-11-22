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
- Létrehozáskor a `name`, `model_code` és `slug` kötelező. A `PATCH` a megadott mezőket módosítja. A galéria megadása cseréli a galéria adatait. A változatok kód alapján frissülnek, a kihagyott kódok letiltásra kerülnek. A `variants[].active` alapértéke `true`. Az adatbázis az URL-t és a kép leírását tárolja; a saját képfájlok feltöltését és kiszolgálását az alábbi API végzi. Külső kép-URL továbbra is megadható.
- Módosításkor, publikáláskor, visszavonáskor, törléskor és visszaállításkor küldd a legutóbb kapott `version` értékét a JSON törzsben. A sikeres válasz az új termékrekordot és verziót adja vissza. `409` esetén az admin újra lekérheti a rekordot.
- A login, register, invite és a termékírási végpontok JSON-bemenetet fogadnak. A belépés beállítja a munkamenet-cookie-t. A böngésző az azonos originen automatikusan küldi. A `GET /api/admin/auth/me` adja vissza az aktuális fiókot.
- A hibák `{ error: { code, message, fields? } }` alakban jönnek. Munkamenethiba esetén `401`, jogosultság vagy hibás origin esetén `403`, hiányzó rekordnál `404`, ütközésnél `409`, validációs hibánál `422`, próbálkozási korlátnál `429` a válasz.

## Integrációs teszt

Hozz létre egy külön, üres, `_test` végződésű adatbázist, és töltsd be a sémát. Add meg az elérését a környezeti változókban vagy az `.env.test` fájlban `NODE_ENV=test` beállítással. Az `npm run test:integration` valódi MySQL-en fut, próbarekordokat hoz létre, és üres admin táblát igényel. Ismétléshez használj friss tesztadatbázist.

## Képfeltöltés és törlés

- `POST /api/admin/images`: bejelentkezett tulajdonos vagy szerkesztő tölthet fel egy képet `multipart/form-data` törzsben, a `file` mezőben. Ne állítsd kézzel a `Content-Type` fejlécet FormData használatakor. A munkamenet-cookie és a helyes `Origin` itt is szükséges.
- JPEG, PNG és WebP fogadható, legfeljebb 10 MiB fájlmérettel és 40 megapixel felbontással. Animált képek nem fogadhatók. A fájl tényleges tartalmát ellenőrizzük, a kimenet legfeljebb 2560 × 2560 pixelbe illesztett WebP, az eredeti képarány megtartásával, metaadatok nélkül. A fájlnév szerveroldali UUID. Az IP-nkénti feltöltési korlát 30 kérés / 15 perc, API-folyamatonként.
- Sikeres válasz: `201`, például `{ "filename": "<uuid>.webp", "url": "/api/media/images/<uuid>.webp", "width": 1200, "height": 800, "size": 45678, "mime_type": "image/webp" }`. A `Location` fejléc is tartalmazza az URL-t. A `GET /api/media/images/:filename` nyilvánosan kiszolgálja a képet.
- A visszakapott `url` értéket add meg a termék `images` tömbjében `alt_text` leírással, a meglévő létrehozási vagy módosítási végponton. A feltöltés önmagában nem módosít terméket. Saját feltöltött képnél a visszakapott relatív URL-t vagy az `APP_ORIGIN` eléírásával képzett teljes URL-t használd, query és hash nélkül.
- `DELETE /api/admin/images/:filename`: fizikailag törli a feltöltött fájlt, siker esetén `204`. Ha bármely termék galériájában még szerepel (törölt terméknél is), `409` a válasz. Előbb mentsd a termék galériáját a kép nélkül, az aktuális `version` értékkel, majd töröld a fájlt. A galéria cseréje vagy a termék logikai törlése önmagában nem töröl fájlt. Külső képfájlt ez a végpont nem töröl.
- Hiányzó fájl: `404`; hibás kép vagy multipart: `422`; túl nagy fájl: `413`. A törlés és a galériamentés közös MySQL-zárat használ, így párhuzamos kérés sem kapcsolhat már törölt fájlt termékhez.

```js
const form = new FormData();
form.append('file', fileInput.files[0]);
const response = await fetch('/api/admin/images', { method: 'POST', body: form });
const image = await response.json(); // Siker esetén image.url menthető a galériába.
```

A fájlok az `UPLOAD_DIR` könyvtárba kerülnek (alapérték: `uploads`, a backend munkakönyvtárához képest). Élesben állíts be állandó, írható könyvtárat, például `UPLOAD_DIR=/home/deploy/apps/myrest/uploads`, és készíts róla biztonsági mentést az adatbázissal együtt. Több API-példány közös fájltárolót igényel. A meglévő deploy script nem törli a feltöltéseket; adatbázis-migráció nem szükséges.

A reverse proxy az `/api/media/images` útvonalat is továbbítsa a backendnek. Nginxnél például `client_max_body_size 12m;` szükséges a multipart többletével együtt; a backend ettől függetlenül 10 MiB-re korlátozza a képfájlt.

Az `npm run test:images` MySQL nélkül, helyettesített adatbázis-válaszokkal ellenőrzi a HTTP-végpontokat, a tényleges képfeldolgozást és az ideiglenes fájltárolást. A valódi adatbázisos ellenőrzéshez az integrációs teszt szükséges.

## Kétnyelvű termékek és migráció

Új telepítésnél a `schema.sql` már tartalmazza a `product_translations` táblát. Meglévő adatbázison a `migrations/001-product-translations.sql` futtatandó CREATE-jogú felhasználóval **a friss backend telepítése előtt**. A migráció ismételhető, és nem írja át a termékeket. A korábbi mezők őrzik a magyar tartalmat és állapotot; a kapcsolt tábla a német tartalmat és külön közzétételi állapotot tárolja. A normál alkalmazás adatbázis-felhasználójának nem kell CREATE-jogot adni.

Az admin termékmentés opcionális `translations.de` objektumot fogad: `name`, `summary`, `description`, `features`, `specifications`, `seo_title`, `seo_description`, `image_alts: [{url, alt_text}]`, `variant_names: [{code, color_name}]`. A hiányzó német fordítás draftnak számít. A `status` nem írható mentéskor. A képleírások kép-URL, a színnevek normalizált változatkód alapján kapcsolódnak, így a sorrend módosítása megőrzi a hozzárendelést. A közös képek URL-jének vagy változatkódjának adminbeli átírása a fordítás kulcsát is frissíti.

A `POST /api/admin/products/:id/publish` és `/unpublish` bemenete `{version, language: "hu" | "de"}`; elhagyott nyelvnél a HU kompatibilis működés marad. A közös verzió és terméksorszintű zárolás minden nyelvi és közös módosításra érvényes. A két nyelv életciklusműveletei is a meglévő auditnaplóban kapnak termékverziót.

Publikus API: `GET /api/products?lang=hu` vagy `?lang=de`, illetve `GET /api/products/:slug?lang=de`. Alapértelmezés HU. Csak a kért nyelven közzétett, nem törölt termék jelenik meg; nincs magyar tartalomra visszaesés a német válaszban. A nyelvi szűrés a lapozás előtt történik. A képek és színváltozatok azonosítói és közös adatai mindkét nyelven azonosak.
