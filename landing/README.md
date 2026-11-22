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

A landing katalógusa továbbra is mock adatokat használ; az API proxy elő van készítve.

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
