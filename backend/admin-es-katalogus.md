# MyRest admin és termékkatalógus

## Adatbázis indítása

A `schema.sql` az üres, előre létrehozott MyRest adatbázisban futtatandó MySQL 8.0.16 vagy újabb verzión. MySQL CLI-ben válaszd ki az adatbázist, majd futtasd a `SOURCE` parancsot. A név és az útvonal az alábbi példában cserélhető.

```sql
USE myrest;
SOURCE C:/LocalDev/myrest/backend/schema.sql
```

A fájl egyszeri inicializálásra készült. Hét üres táblát hoz létre. Az első tulajdonosi fiókot az üzemeltető egyszeri, szerveroldali parancsa hozza létre az alkalmazás élesítésekor, Argon2id jelszóhash-sel. A futtatáshoz a MySQL-felhasználónak létrehozási és hivatkozási jogosultság kell a kiválasztott adatbázison. Minden alkalmazáskapcsolat UTC időzónában, szigorú SQL módban működjön.

## API-műveletek

| Hozzáférés | Művelet | Végpont |
| --- | --- | --- |
| Nyilvános | Katalóguskártyák listázása | `GET /api/products` |
| Nyilvános | Termékrészletek lekérése slug alapján | `GET /api/products/:slug` |
| Meghívóval | Adminfiók regisztrálása | `POST /api/admin/auth/register` |
| Nyilvános | Adminbelépés | `POST /api/admin/auth/login` |
| Admin | Kijelentkezés, aktív fiók lekérése | `POST /api/admin/auth/logout`, `GET /api/admin/auth/me` |
| Tulajdonos | Meghívók listázása, létrehozása, visszavonása | `GET/POST /api/admin/invites`, `POST /api/admin/invites/:id/revoke` |
| Tulajdonos | Fiókok listázása, szerep és aktív állapot módosítása | `GET /api/admin/users`, `PATCH /api/admin/users/:id` |
| Admin | Adminlista kereséssel, szűréssel, lapozással | `GET /api/admin/products` |
| Admin | Teljes rekord lekérése ID alapján | `GET /api/admin/products/:id` |
| Admin | Piszkozat létrehozása | `POST /api/admin/products` |
| Admin | Termékmezők, képek, változatok és sorrend szerkesztése | `PATCH /api/admin/products/:id` |
| Admin | Közzététel, visszavonás | `POST /api/admin/products/:id/publish`, `POST /api/admin/products/:id/unpublish` |
| Admin | Soft delete, visszaállítás | `DELETE /api/admin/products/:id`, `POST /api/admin/products/:id/restore` |
| Admin | Termék változásnaplója | `GET /api/admin/products/:id/audit` |

## Fiókok és munkamenetek

- Az `owner` fiókokat és meghívókat is kezelhet. Az `editor` minden katalógusműveletet elvégezhet. Mindkét szerepnél minden admin kérés az aktuális fiókállapot és szerep ellenőrzésével kezdődik. Az utolsó aktív tulajdonos lefokozását vagy letiltását tranzakcióban kell megakadályozni, a tulajdonosi műveletek sorosításával.
- A meghívó kanonizált e-mail-címhez és a tulajdonos által kiválasztott szerephez kötött. A backend legalább 32 véletlen bájtból képez tokent, és SHA-256 lenyomatot tárol. A meghívólista csak az azonosításhoz használt hexadecimális lenyomatot, a címet, a szerepet és az állapotot adja vissza tulajdonosnak. A regisztráció az eredeti tokent várja, a hash alapján megkeresi a sort, majd zárolja. Az aktív, fel nem használt és le nem járt meghívó felhasználása és a fiók létrehozása egy tranzakció. Az adatbázis egyediségi kulcsa kezeli a párhuzamos regisztrációt.
- Az e-mailt egy helyen validálja és egységesíti a backend, környező szóközök levágásával és kisbetűsítéssel. Hibás belépéskor egységes választ adjon. A belépési és regisztrációs próbálkozásokra legyen IP és fiók vagy meghívó szerinti korlát. A jelszót Argon2iddel hashelje a backend. [OWASP jelszótárolás](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- A munkamenethez új, kriptográfiailag véletlen token készül, amelynek SHA-256 lenyomata kerül az adatbázisba. A böngésző HTTPS-en, `HttpOnly`, `Secure`, `SameSite=Lax` cookie-ban kapja meg a tokent. Az író admin kérésekhez legyen CSRF-védelem. Kijelentkezéskor vissza kell vonni az adott munkamenetet, tiltáskor és szerepváltozáskor az összeset. A lejárt és visszavont munkamenetek rendszeresen törölhetők. [OWASP munkamenet-kezelés](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

## Termékek és láthatóság

- A létrehozáshoz név, modellkód és slug kell. A slug kisbetűs ASCII, szám és egyszeres kötőjel, például `flame-3d`. A slug és a modellkód egyedi, a soft delete után is foglalt. Az első publikálástól kezdve a slug rögzített, hogy a nyilvános URL megmaradjon. Ezt a backend a közzétételi napló alapján ellenőrzi.
- A kártya a nevet, slugot, modellkódot, rövid leírást, bruttó forintárat, kiemelt jellemzőket és a galéria első képét adja. A részletekben szerepel a teljes leírás, a masszázstípus, a rendezett képanyag, az aktív színváltozatok, a műszaki adatok és a SEO-mezők. Az admin részlet a piszkozatokat, a törlés állapotát, a letiltott változatokat és a szerkesztési verziót is tartalmazza.
- A `features` rendezett szövegtömb. A `specifications` rendezett `{ "name": "Magasság", "value": "120 cm" }` rekordok tömbje. A backend validálja a tömbelemeket, a szövegek hosszát, a kép URL-jét és alternatív szövegét, valamint a színkód `#RRGGBB` formátumát. A galéria első képe `(sort_order, id)` szerint egyben a borítókép. A változatok közös modellárat használnak.
- Közzétételhez ellenőrzött modelladatok, kitöltött összefoglaló és leírás, pozitív egész bruttó HUF-ár, legalább egy kép alternatív szöveggel és legalább egy aktív változat szükséges. Publikált termék módosításakor ugyanezeket a feltételeket a művelet utáni állapotra is ellenőrizni kell. A kép és változat meglétét a backend ellenőrzi, a státusz és az alapmezők összhangját a MySQL is vizsgálja.
- Soft delete esetén `deleted_at` az aktuális UTC idő, a státusz `draft`. A képek, változatok és napló megmaradnak. Törölt rekord a normál adminlistából is kiesik, külön „Töröltek” szűrővel elérhető. Törölt terméken a visszaállítás az engedélyezett módosítás. Visszaállításkor `deleted_at` nullázódik, a termék piszkozat. Új közzétételhez ellenőrzés szükséges. Fizikai terméktörléshez nincs adminművelet.
- Minden módosításnál az admin küldi a szerkesztett `version` értékét. A backend tranzakcióban zárolja a terméksort, egyezteti a verziót, módosítja a terméket és kapcsolt sorait, növeli a verziót és beírja a naplóbejegyzést. Eltérő verzió vagy egyediségi ütközés esetén `409`, hibás mező vagy hiányzó publikálási feltétel esetén `422`. Az új termék és az első naplóbejegyzés szintén egy tranzakció.

## Lekérdezési szabályok

- A nyilvános lista és a slug szerinti részlet feltétele azonos. `status = 'published' AND deleted_at IS NULL`. A részlet `404`-et ad, ha nincs találat. Ugyanez a feltétel érvényes a sitemapre és a kapcsolt adatok nyilvános elérésére. Az összetett részletlekérések egy konzisztens olvasási pillanatképet használjanak.
- A listákban alapértelmezetten 20, legfeljebb 100 tételt adjunk vissza oldalanként. A publikus rendezés `sort_order, id`. A kártyaképek egy kötegelt lekérdezésben kérhetők le az adott oldal termékazonosítóira. Részleteknél a kapcsolt képek és aktív változatok sorrendje szintén `sort_order, id`.
- Az adminlista alapból az élő rekordokat adja, beleértve a piszkozatokat. Státusz és törlés szerint szűrhető, név, slug és modellkód szerint kereshető. A keresőértékek paraméterként kerülnek az SQL-be. A rendezési mezőket engedélyezett listából válassza a backend, stabil ID szerinti másodlagos rendezéssel.

```sql
-- Nyilvános katalógus, a ? helyén a backend által kötött paraméterekkel.
SELECT id, slug, model_code, name, summary, gross_price_huf, features
FROM products
WHERE status = 'published' AND deleted_at IS NULL
ORDER BY sort_order, id
LIMIT ? OFFSET ?;

-- Nyilvános termékrészlet alapsora. A galéria és változatok az id alapján jönnek.
SELECT id, slug, model_code, name, massage_level, summary, description,
       features, specifications, source_url, seo_title, seo_description, gross_price_huf
FROM products
WHERE slug = ? AND status = 'published' AND deleted_at IS NULL;
```

Az API és az egyszeri tulajdonosi fióklétrehozás indítását a [backend útmutató](README.md) írja le. A rendelés, készlet, fizetés és vevői fiókok adatmodellje külön fejlesztési fázis.
