import { VariantPicker } from '../../shared/VariantPicker.jsx';
import { getLocale, t } from '../../shared/i18n.js';
import { Product, ProductCard } from '../../shared/ProductViews.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { Catalog } from './Catalog.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { money, orderUrl, photo, getProducts, productUrl, siteUrl } from './catalog.js';

function newOrderRequestKey() {
  // The IP-based HTTP deployment does not expose crypto.randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

function Brand() {
  return <a className="brand" href={siteUrl('/')} aria-label={t("MyRest kezdőlap")}>
    MyRest
  </a>;
}

function NavLinks() {
  return <><a href={siteUrl('/masszazsfotelek/')}>{t("Masszázsfotelek")}</a><a href={siteUrl('/#utmutato')}>{t("Választási útmutató")}</a>
    <a href={siteUrl('/#gyik')}>{t("GYIK")}</a><a href={siteUrl('/#kapcsolat')}>{t("Kapcsolat")}</a></>;
}

function Layout({ children, path }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <>
    <a className="skip" href="#tartalom">{t("Ugrás a tartalomra")}</a>
    <header className="header">
      <div className="wrap header-row">
        <Brand />
        <nav className="desktop-nav" aria-label={t("Fő navigáció")}><NavLinks /></nav>
        <div className="header-actions">
          <LanguageSwitcher path={path} />
          <a className="header-action" href={siteUrl('/masszazsfotelek/')}>{t("Fotelek felfedezése")}</a>
        </div>
        <button className="menu-toggle" aria-expanded={menuOpen} aria-controls="mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>{t("Menü")}</button>
      </div>
      <div className="mobile-menu" data-open={menuOpen} inert={menuOpen ? undefined : ''}>
        <div className="mobile-menu-content">
          <nav className="mobile-nav wrap" id="mobile-nav" aria-label={t("Mobil navigáció")} onClick={() => setMenuOpen(false)}><NavLinks /></nav>
        </div>
      </div>
    </header>
    <main id="tartalom">{children}</main>
    <footer className="footer"><div className="wrap footer-row"><Brand />
      <p>{t("Masszázsfotelek az otthoni pihenéshez")}</p><span>{t("MyRest · Bemutatóoldal")}</span></div></footer>
  </>;
}

const guide = () => [
  [t('Mérje le a helyet'), t('Ellenőrizze az ajtók szélességét, és számoljon a fotel mögötti és előtti szabad hellyel döntött állapotban is.')],
  [t('Gondolja át az intenzitást'), t('Nézze meg, hogyan állítható a görgők nyomása és sebessége, és milyen testrészekre fókuszálhat a masszázs.')],
  [t('Nézze meg a mindennapi funkciókat'), t('Érdemes összevetni az automatikus programokat, a melegítést és a lábrész beállításait.')],
];
const faqs = () => [
  [t('Mekkora helyet hagyjak a fotel körül?'), t('A szükséges távolság modellenként eltér. Nézze meg a fotel műszaki adatait, és mérje le a helyet a háttámla és a lábtartó teljes mozgástartományában.')],
  [t('Mit jelöl a 3D, 4D vagy 5D megnevezés?'), t('A jelölés a masszázsmechanika és a vezérlés képességeire utal. A pontos jelentés modellenként eltér, ezért érdemes a konkrét funkciókat összehasonlítani.')],
  [t('Hogyan történik a fizetés?'), t('A fizetési mód banki átutalás. A rendelés rögzítése után a megadott elérhetőségeken egyeztetjük a fizetés részleteit.')],
  [t('Hol találok információt a szállításról és a garanciáról?'), t('A végleges szállítási, beüzemelési és garanciális feltételek az éles induláskor a termékoldalon és a rendelési összesítőben lesznek elérhetők.')],
];

function Home() {
  const home = useRef(null);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || !('IntersectionObserver' in window)) return;

    const items = home.current.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.remove('reveal-pending');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -24px 0px' });

    for (const item of items) {
      if (item.getBoundingClientRect().top < window.innerHeight) continue;
      item.classList.add('reveal-pending');
      observer.observe(item);
    }

    return () => {
      observer.disconnect();
      for (const item of items) item.classList.remove('reveal-pending');
    };
  }, []);

  return <div ref={home}>
    <section className="wrap hero">
      <div className="hero-copy">

        <h1>{t("Masszázsfotelek az ")}<em>{t("otthoni pihenéshez.")}</em></h1>
        <p>{t("Hasonlítsa össze a modelleket, és találja meg a masszázsfotelt, amely illik az otthonába és a mindennapjaiba.")}</p>
        <a className="button" href="#masszazsfotelek">{t("Megnézem a foteleket")}</a>
        <a className="text-link" href="#utmutato">{t("Segítség a választáshoz")}</a>
      </div>
      <figure className="hero-photo">
        <img src={siteUrl('/media/hero.webp')} width="1440" height="960" fetchpriority="high" alt={t("Bézs masszázsfotel egy napfényes, világos nappaliban")} />

      </figure>
    </section>
    <section className="wrap section" id="masszazsfotelek">
      <div className="section-head" data-reveal=""><div><h2>{t("Kiemelt masszázsfotelek")}</h2></div>
        <p>{t("Válasszon a közzétett modellek közül, és nézze meg, melyik felel meg az igényeinek.")}</p></div>
      <div className="catalog">{getProducts().slice(0, 3).map(product => <ProductCard product={product} key={product.slug} />)}</div>{!getProducts().length && <p role="status">{t('Ezen a nyelven még nincs közzétett termék.')}</p>}
    </section>
    <section className="guide" id="utmutato"><div className="wrap guide-grid" data-reveal="">
      <div><h2>{t("Mire figyeljen a választásnál?")}</h2>
        <p>{t("Három szempont, amely segít leszűkíteni a kínálatot.")}</p></div>
      <ol>{guide().map(([title, body]) => <li key={title}>
        <div><h3>{title}</h3><p>{body}</p></div></li>)}</ol>
    </div></section>
    <section className="wrap section faq-grid" id="gyik" data-reveal="">
      <div><h2>{t("Gyakori kérdések")}</h2></div>
      <div>{faqs().map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
    </section>
    <section className="wrap contact" id="kapcsolat" data-reveal="">
      <h2>{t("Kérdése van egy modellről?")}</h2>
      <p>{t("A modellek részletes adatainál megtalálja a Bionwell termékforrását. A MyRest ügyfélszolgálati elérhetősége az éles induláskor kerül ide.")}</p>
      <a className="button" href="#masszazsfotelek">{t("Vissza a fotelekhez")}</a>
    </section>
  </div>;
}

const fields = () => [
  ['zip', t('Irányítószám'), 'postal-code'],
  ['city', t('Település'), 'address-level2'],
  ['address', t('Utca, házszám'), 'street-address'],
];

function Address({ prefix, label }) {
  return <fieldset><legend>{label}</legend><div className="fields">
    {fields().map(([name, title, auto]) => <label key={name}>{title}
      <input name={prefix + '-' + name} autoComplete={'section-' + prefix + ' ' + auto} required
        inputMode={name === 'zip' ? 'numeric' : undefined} pattern={name === 'zip' ? (getLocale() === 'hu' ? '[0-9]{4}' : '[0-9]{4,5}') : undefined} />
    </label>)}
  </div></fieldset>;
}

function Order({ product }) {
  const [same, setSame] = useState(true);
  const [order, setOrder] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const value = Number(new URLSearchParams(window.location.search).get('mennyiseg'));
    if (Number.isInteger(value) && value >= 1 && value <= 99) setQuantity(value);
  }, []);

  const [settings, setSettings] = useState(null);
  const shipping = settings?.shipping?.[getLocale()] ?? 0;
  const subtotal = product.price * quantity;
  const total = Math.round((subtotal + shipping) * 100) / 100;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [variantCode, setVariantCode] = useState(product.variants?.[0]?.code || '');
  const requestKey = useRef(null);
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('variant');
    if (product.variants?.some(item => item.code === code)) setVariantCode(code);
    fetch('/api/orders/config').then(r => r.ok ? r.json() : Promise.reject()).then(setSettings).catch(() => setSettings({ enabled: false }));
  }, [product]);
  async function submit(event) {
    event.preventDefault();
    if (busy || !settings?.enabled) return;
    const data = new FormData(event.currentTarget);
    const address = prefix => Object.fromEntries(['zip', 'city', 'address'].map(key => [key, data.get(prefix + '-' + key)]));
    requestKey.current ||= newOrderRequestKey();
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestKey: requestKey.current, language: getLocale(), slug: product.slug, variantCode, quantity,
          name: data.get('name'), email: data.get('email'), phone: data.get('phone'),
          shippingAddress: address('shipping'), billingAddress: address(same ? 'shipping' : 'billing'), expectedTotal: total }) });
      if (!response.ok) throw new Error();
      setOrder(await response.json());
    } catch { setError(t('A rendelést nem sikerült visszaigazolni. Próbálja újra ugyanazokkal az adatokkal.')); }
    finally { setBusy(false); }
  }

  return <div className="wrap inner">
    <nav aria-label={t("Útvonal")} className="breadcrumb"><a href={siteUrl(productUrl(product))}>{t("Vissza a termékhez")}</a></nav>

    <h1>{order ? t('Rendelés rögzítve') : t('Rendelés')}</h1>
    {order ? <section className="receipt" aria-live="polite">
      <p className="tag">{t("Átutalásra vár")}</p>
      <h2>{order.id}</h2>
      <p>{t(order.emailQueued ? "Rendelését rögzítettük. A visszaigazolást és az utalási adatokat emailben küldjük." : "Rendelését rögzítettük. A további részletekkel hamarosan jelentkezünk a megadott elérhetőségeken.")}</p>
      <dl><div><dt>{t("Címzett")}</dt><dd>{order.email}</dd></div>
        {order.emailQueued && <div><dt>{t("Tárgy")}</dt><dd>{t('Rendelés visszaigazolása ·')} {order.id}</dd></div>}
        <div><dt>{t("Modell")}</dt><dd>{product.name} · {product.variants?.find(item => item.code === variantCode)?.color_name || product.color} · {quantity} {t('db')}</dd></div>
        <div><dt>{t("Végösszeg")}</dt><dd>{money(order.total)}</dd></div>
        {order.bank.beneficiary && <div><dt>{t("Kedvezményezett")}</dt><dd>{order.bank.beneficiary}</dd></div>}
        {order.bank.account && <div><dt>{t("Bankszámlaszám")}</dt><dd>{order.bank.account}</dd></div>}
        <div><dt>{t("Közlemény")}</dt><dd>{order.id}</dd></div></dl>
      <a className="button" href={siteUrl('/masszazsfotelek/')}>{t("Vissza a fotelekhez")}</a>
    </section> : <>
      {!settings?.enabled && <p className="demo-note">{t("Az online rendelés jelenleg nem elérhető.")}</p>}{error && <p role="alert">{error}</p>}
      <form className="checkout" method="post" onSubmit={submit}>
        <div className="form-panel">
          <VariantPicker variants={product.variants || []} value={variantCode} onChange={setVariantCode} disabled={busy} />
          <fieldset><legend>{t("Kapcsolattartás")}</legend><div className="fields">
            <label>{t("Teljes név")}<input name="name" autoComplete="name" required /></label>
            <label>{t("E-mail-cím")}<input type="email" name="email" autoComplete="email" required /></label>
            <label>{t("Telefonszám")}<input type="tel" name="phone" autoComplete="tel" required /></label>
          </div></fieldset>
          <Address prefix="shipping" label={t("Szállítási cím")} />
          <label className="checkbox"><input type="checkbox" checked={same} onChange={(event) => setSame(event.target.checked)} />{t(" A számlázási cím megegyezik a szállítási címmel")}</label>
          {!same && <Address prefix="billing" label={t("Számlázási cím")} />}
        </div>
        <aside className="summary">
          <h2>{t("Rendelés összesítője")}</h2>
          <p><strong>{product.name}</strong><br />{product.variants?.find(item => item.code === variantCode)?.color_name || product.color} · {quantity} {t('db')}</p>
          <dl><div><dt>{t("Bruttó termékösszeg")}</dt><dd>{money(subtotal)}</dd></div>
            <div><dt>{t("Szállítás")}</dt><dd>{money(shipping)}</dd></div>
            <div><dt>{t("Végösszeg")}</dt><dd><strong>{money(total)}</strong></dd></div></dl>
          <p><strong>{t("Banki átutalás")}</strong><br /><span className="fine">{t(settings?.emailEnabled ? "Az utalási adatok emailben érkeznek." : "A rendelés rögzítése után a fizetés részleteit külön egyeztetjük.")}</span></p>
          <button className="button" type="submit" disabled={busy || !settings?.enabled}>{t(busy ? "Küldés folyamatban…" : "Rendelés beküldése")}</button>
        </aside>
      </form>
    </>}
  </div>;
}

export function App({ page, path = "/" }) {
  return <Layout path={path}>
    {page.kind === 'home' && <Home />}
    {page.kind === 'loading' && <div className="wrap inner" role="status">{t('Termékek betöltése…')}</div>}
    {page.kind === 'error' && <div className="wrap inner" role="alert"><h1>{t('A termékek most nem tölthetők be.')}</h1><p>{t('Kérjük, próbálja újra.')}</p><button className="button" onClick={page.retry}>{t('Újrapróbálás')}</button></div>}
    {page.kind === 'catalog' && <Catalog />}
    {page.kind === 'product' && <Product product={page.product} />}
    {page.kind === 'order' && <Order product={page.product} />}
    {page.kind === 'missing' && <div className="wrap inner"><h1>{t("Ez az oldal nem található.")}</h1><a className="button" href={siteUrl('/')}>{t("Vissza a kezdőlapra")}</a></div>}
  </Layout>;
}
