# MyRest landing

Önálló publikus React alkalmazás. Indítás: `npm run dev`, build: `npm run build`.

Az admin külön alkalmazás: lásd az [admin dokumentációját](../admin/README.md). A terméknézetek és azok stílusai a `shared/` könyvtárból érkeznek.

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

A landing katalógusa a publikus API közzétett termékeit használja, nyelvenként külön.

## Feltöltés a szerverre

Git Bashben, a `landing` mappából:

```bash
bash ./uploader-landing
```

PowerShellből ugyanebben a mappában:

```powershell
& "C:\Program Files\Git\bin\bash.exe" ./uploader-landing
```

A script helyben buildel, SSH-kulccsal feltölti a `dist` tartalmát a `/var/www/myrest/landing/releases` új könyvtárába, és siker után átváltja a `current` szimbolikus linket. A korábbi kiadások megmaradnak. Egyedi kulcs a backendhez hasonlóan a `DEPLOY_KEY` változóban adható meg. Nincs szükség PM2-re vagy minden feltöltés után Nginx-újraindításra. A `.env` nem kerül a szerverre; a buildváltozókat feltöltés előtt állítsd be.

Első használat előtt a szerveren egyszer:

```bash
sudo install -d -m 755 -o deploy -g deploy /var/www/myrest/admin /var/www/myrest/landing
```

A `backend/deploy/myrest-ip.nginx.conf` frissített konfigurációja a landing `current` könyvtárát a `/`, az adminét az `/admin/` útvonalon szolgálja ki. A landing feltöltője a gyökérútvonalra buildel, a GitHub Pages beállításától függetlenül. Ha az admint az IP-címen nyitod meg, a backend `.env` fájljában az `APP_ORIGINS` listába a `http://165.22.115.165` origint is vedd fel, majd `pm2 restart myrest-backend --update-env`.

## Magyar és német nyelv

A `/hu/` és `/de/` útvonalakon előre renderelt főoldal, termékoldalak és próbarendelés található, fordított metaadatokkal, képleírásokkal és hreflang linkekkel. A magyar forrásszövegekhez tartozó német szótár: `shared/locales/de.json`. A közös termékkomponensek az admin magyar előnézetét is megőrzik. A német nézet is HUF-ot használ, nincs árfolyamváltás.

Nyelvi előtag nélküli URL első megnyitásakor a mentett kézi választás élvez elsőbbséget. Ennek hiányában az `/api/locale` az IP országkódja alapján választ: HU → magyar, minden más ország → német. A keresés a backend helyi GeoIP adatbázisával működik, nem küldi el a látogató IP-jét külső szolgáltatónak. Az IP-adatbázis becslés, VPN esetén a kilépési ország számít. Ismeretlen IP → német; API-hiba/időtúllépés esetén a böngésző magyar nyelve → magyar, egyébként német. Közvetlen `/hu/` vagy `/de/` linket nem ír felül az automatikus választás. A HU/DE kapcsoló a választást localStorage-ban tárolja.

A backend szerver `.env` fájljában a mellékelt Nginx mögött `TRUST_PROXY_HOPS=1` szükséges. Az Nginx felülírja az X-Forwarded-For fejlécet a valódi klienscímmel. A 3001-es port maradjon loopbacken. Más proxylánc esetén ehhez igazítsd a bizalmi beállítást. A GeoIP adatokat a rögzített `geoip-country` csomag tartalmazza; frissítésükhöz rendszeresen frissítsd ezt a függőséget és telepítsd újra a backendet. A csomag és az adatbázis licencfeltételei a csomag LICENSE/EULA fájljaiban szerepelnek.

## Szűrhető fotelkatalógus

A fejléc „Fotelek felfedezése” gombja és a Masszázsfotelek navigációs pont a `/hu/masszazsfotelek/`, illetve `/de/masszazsfotelek/` oldalra vezet. Ezek a főoldalhoz és termékoldalakhoz hasonlóan előre renderelt oldalakat és fordított metaadatokat kapnak. A HU / DE kapcsoló a fejléc jobb oldalán, a gomb előtt található.

A katalógus az adminban közzétett, élő termékadatokat használja. Kereshető név és modellkód szerint, szűrhető minimum/maximum ár, masszázstípus és szín alapján; rendezhető ajánlott sorrendben, ár szerint és név szerint. Az egy csoporton belüli választások VAGY, a különböző csoportok ÉS kapcsolatban működnek. Mobilon a szűrőpanel külön megnyitható. Nincs találat esetén visszaállítási lehetőség látható.

A szűrés az URL-ben tárolódik: `q`, `min`, `max`, ismételhető `type` és `color`, valamint `sort` paraméterek. Újratöltés és nyelvváltás megőrzi ezeket. A termékadatok továbbra sem az admin élő API-jából érkeznek.

## Élő termékkatalógus

A landing most a publikus `/api/products?lang=hu|de` API-t használja a kezdőlapon, katalógusban és részletes oldalakon. A mock termékeket eltávolítottuk az adatforrásból. A színek és masszázstípusok szűrői a közzétett termékek aktív változataiból épülnek. A termékoldal az adminban megadott SEO-címet és leírást használja; a rendelési folyamat továbbra is próbarendelés.

Buildkor a `MYREST_API_TARGET` szerverről beolvasott, közzétett termékek kerülnek az előre renderelt HTML-be. Ehhez az API-nak elérhetőnek kell lennie; hiba esetén a build leáll. A HTML-be ágyazott kezdeti adatokat minden megnyitáskor friss API-lekérés váltja fel. API-hibánál újrapróbálható hibaállapot látszik, nincs mock visszaesés. A hiányzó vagy visszavont, illetve az adott nyelven nem publikált termék nem jelenik meg a friss katalógusban.

A `backend/deploy/myrest-ip.nginx.conf` nyelvi katalógus-útvonalai a még nem generált új termék-URL-eket a nyelvi `product-shell.html` betöltőoldalra irányítják. Így az adminban később publikált termék új landingfeltöltés nélkül is megnyitható. A később felvett oldalak első HTML-je általános betöltőoldal, a konkrét tartalmat és metaadatokat a kliens tölti le; a következő landingbuild ismét termékspecifikus HTML-t készít. Az előre renderelt pillanatkép keresőkben történő frissítéséhez építsd és töltsd fel újra a landinget.
