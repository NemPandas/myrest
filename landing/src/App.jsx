import { getLocale, t } from '../../shared/i18n.js';
import { Product, ProductCard } from '../../shared/ProductViews.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { Catalog } from './Catalog.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { money, orderUrl, photo, getProducts, productUrl, siteUrl } from './catalog.js';

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
  [t('Hogyan történik a fizetés?'), t('A tervezett fizetési mód banki átutalás. A rendelés összesítője és az utalási adatok e-mailben érkeznek. A próbarendelés a folyamatot egy mintaüzenettel mutatja be.')],
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

  const shipping = 0;
  const subtotal = product.price * quantity;
  const total = subtotal + shipping;

  function submit(event) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get('email');
    const id = 'MR-DEMO-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    setOrder({ id, email });
  }

  return <div className="wrap inner">
    <nav aria-label={t("Útvonal")} className="breadcrumb"><a href={siteUrl(productUrl(product))}>{t("Vissza a termékhez")}</a></nav>

    <h1>{order ? t('Próbarendelés kész') : t('Próbarendelés')}</h1>
    {order ? <section className="receipt" aria-live="polite">
      <p className="tag">{t("Átutalásra vár · demó")}</p>
      <h2>{order.id}</h2>
      <p>{t("Alább látható a rendelési e-mail előnézete. Az előnézet helyben készül, küldés és valódi átutalás nélkül.")}</p>
      <dl><div><dt>{t("Címzett")}</dt><dd>{order.email}</dd></div>
        <div><dt>{t("Tárgy")}</dt><dd>{t('Rendelés visszaigazolása ·')} {order.id}</dd></div>
        <div><dt>{t("Modell")}</dt><dd>{product.name} · {product.color} · {quantity} {t('db')}</dd></div>
        <div><dt>{t("Végösszeg")}</dt><dd>{money(total)}</dd></div>
        <div><dt>{t("Kedvezményezett")}</dt><dd>{t("MyRest (minta)")}</dd></div>
        <div><dt>{t("Bankszámlaszám")}</dt><dd>{t("Éles konfigurációból kerül ide")}</dd></div>
        <div><dt>{t("Közlemény")}</dt><dd>{order.id}</dd></div></dl>
      <a className="button" href={siteUrl('/masszazsfotelek/')}>{t("Vissza a fotelekhez")}</a>
    </section> : <>
      <p className="demo-note">{t("Bemutatófelület. Kérjük, használjon mintaadatokat. Az űrlap helyben működik.")}</p>
      <form className="checkout" method="post" onSubmit={submit}>
        <div className="form-panel">
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
          <p><strong>{product.name}</strong><br />{product.color} · {quantity} {t('db')}</p>
          <dl><div><dt>{t("Bruttó termékösszeg")}</dt><dd>{money(subtotal)}</dd></div>
            <div><dt>{t("Szállítás (minta)")}</dt><dd>{money(shipping)}</dd></div>
            <div><dt>{t("Végösszeg")}</dt><dd><strong>{money(total)}</strong></dd></div></dl>
          <p><strong>{t("Banki átutalás")}</strong><br /><span className="fine">{t("Az éles folyamatban az utalási adatok e-mailben érkeznek.")}</span></p>
          <button className="button" type="submit">{t("Próbarendelés beküldése")}</button>
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
