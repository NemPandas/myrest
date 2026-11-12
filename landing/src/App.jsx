import React, { useEffect, useRef, useState } from 'react';
import { money, orderUrl, photo, products, productUrl, siteUrl } from './catalog.js';

function Brand() {
  return <a className="brand" href={siteUrl('/')} aria-label="MyRest kezdőlap">
    MyRest
  </a>;
}

function NavLinks() {
  return <><a href={siteUrl('/#masszazsfotelek')}>Masszázsfotelek</a><a href={siteUrl('/#utmutato')}>Választási útmutató</a>
    <a href={siteUrl('/#gyik')}>GYIK</a><a href={siteUrl('/#kapcsolat')}>Kapcsolat</a></>;
}

function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <>
    <a className="skip" href="#tartalom">Ugrás a tartalomra</a>
    <header className="header">
      <div className="wrap header-row">
        <Brand />
        <nav className="desktop-nav" aria-label="Fő navigáció"><NavLinks /></nav>
        <a className="header-action" href={siteUrl('/#masszazsfotelek')}>Fotelek felfedezése</a>
        <button className="menu-toggle" aria-expanded={menuOpen} aria-controls="mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>Menü</button>
      </div>
      <div className="mobile-menu" data-open={menuOpen} inert={menuOpen ? undefined : ''}>
        <div className="mobile-menu-content">
          <nav className="mobile-nav wrap" id="mobile-nav" aria-label="Mobil navigáció" onClick={() => setMenuOpen(false)}><NavLinks /></nav>
        </div>
      </div>
    </header>
    <main id="tartalom">{children}</main>
    <footer className="footer"><div className="wrap footer-row"><Brand />
      <p>Masszázsfotelek az otthoni pihenéshez</p><span>MyRest · Bemutatóoldal</span></div></footer>
  </>;
}

const guide = [
  ['Mérje le a helyet', 'Ellenőrizze az ajtók szélességét, és számoljon a fotel mögötti és előtti szabad hellyel döntött állapotban is.'],
  ['Gondolja át az intenzitást', 'Nézze meg, hogyan állítható a görgők nyomása és sebessége, és milyen testrészekre fókuszálhat a masszázs.'],
  ['Nézze meg a mindennapi funkciókat', 'Érdemes összevetni az automatikus programokat, a melegítést és a lábrész beállításait.'],
];
const faqs = [
  ['Mekkora helyet hagyjak a fotel körül?', 'A szükséges távolság modellenként eltér. Nézze meg a fotel műszaki adatait, és mérje le a helyet a háttámla és a lábtartó teljes mozgástartományában.'],
  ['Mit jelöl a 3D, 4D vagy 5D megnevezés?', 'A jelölés a masszázsmechanika és a vezérlés képességeire utal. A pontos jelentés modellenként eltér, ezért érdemes a konkrét funkciókat összehasonlítani.'],
  ['Hogyan történik a fizetés?', 'A tervezett fizetési mód banki átutalás. A rendelés összesítője és az utalási adatok e-mailben érkeznek. A próbarendelés a folyamatot egy mintaüzenettel mutatja be.'],
  ['Hol találok információt a szállításról és a garanciáról?', 'A végleges szállítási, beüzemelési és garanciális feltételek az éles induláskor a termékoldalon és a rendelési összesítőben lesznek elérhetők.'],
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

        <h1>Masszázsfotelek az <em>otthoni pihenéshez.</em></h1>
        <p>Hasonlítsa össze a modelleket, és találja meg a masszázsfotelt, amely illik az otthonába és a mindennapjaiba.</p>
        <a className="button" href="#masszazsfotelek">Megnézem a foteleket</a>
        <a className="text-link" href="#utmutato">Segítség a választáshoz</a>
      </div>
      <figure className="hero-photo">
        <img src={siteUrl('/media/hero.webp')} width="1440" height="960" fetchpriority="high" alt="Bézs masszázsfotel egy napfényes, világos nappaliban" />

      </figure>
    </section>
    <section className="wrap section" id="masszazsfotelek">
      <div className="section-head" data-reveal=""><div><h2>Kiemelt masszázsfotelek</h2></div>
        <p>Három modell, különböző masszázsmechanikával. Nézze meg, melyik felel meg az igényeinek.</p></div>
      <div className="catalog">{products.map((product) => <article className="card" data-reveal="" key={product.slug}>
        <a className="card-photo" href={siteUrl(productUrl(product))} aria-label={product.name + ' részletei'}>
          <img src={photo(product)} alt={product.color + ' masszázsfotel, illusztráció'} width="512" height="512" loading="lazy" />

        </a>
        <div className="card-body"><p className="model">iRest · {product.model}</p><h3>{product.name}</h3>
          <p>{product.features.join(' · ')}</p>
          <div className="card-bottom"><div><strong>{money(product.price)}</strong><small>Mintaár</small></div>
            <a className="button card-action" href={siteUrl(productUrl(product))} aria-label={product.name + ' részleteinek megtekintése'}>Részletek megtekintése</a></div></div>
      </article>)}</div>
    </section>
    <section className="guide" id="utmutato"><div className="wrap guide-grid" data-reveal="">
      <div><h2>Mire figyeljen a választásnál?</h2>
        <p>Három szempont, amely segít leszűkíteni a kínálatot.</p></div>
      <ol>{guide.map(([title, body]) => <li key={title}>
        <div><h3>{title}</h3><p>{body}</p></div></li>)}</ol>
    </div></section>
    <section className="wrap section faq-grid" id="gyik" data-reveal="">
      <div><h2>Gyakori kérdések</h2></div>
      <div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
    </section>
    <section className="wrap contact" id="kapcsolat" data-reveal="">
      <h2>Kérdése van egy modellről?</h2>
      <p>A modellek részletes adatainál megtalálja a Bionwell termékforrását. A MyRest ügyfélszolgálati elérhetősége az éles induláskor kerül ide.</p>
      <a className="button" href="#masszazsfotelek">Vissza a fotelekhez</a>
    </section>
  </div>;
}

const galleryViews = [['front', 'Elölnézet'], ['side', 'Oldalnézet']];
const detailTabs = [['description', 'Leírás'], ['documents', 'Dokumentumok'], ['reviews', 'Vélemények']];
const detailSections = [
  ['funkciok', 'Funkciók és tulajdonságok'],
  ['muszaki-adatok', 'Méretek és műszaki adatok'],
  ['garancia', 'Garancia'],
  ['kiszallitas', 'Kiszállítás és beüzemelés'],
  ['fizetes', 'Fizetés és megrendelés'],
];

function ProductDetails({ product }) {
  const [tab, setTab] = useState('description');

  function navigateTabs(event, index) {
    const last = detailTabs.length - 1;
    const next = {
      ArrowLeft: (index + last) % detailTabs.length,
      ArrowRight: (index + 1) % detailTabs.length,
      Home: 0,
      End: last,
    }[event.key];
    if (typeof next !== 'number') return;
    event.preventDefault();
    setTab(detailTabs[next][0]);
    event.currentTarget.parentElement.children[next].focus();
  }

  return <section className="product-details" aria-label="Termékrészletek">
    <div className="detail-tabs" role="tablist" aria-label="Termékinformációk">
      {detailTabs.map(([id, label], index) => <button type="button" role="tab" key={id} id={'tab-' + id}
        aria-controls={'panel-' + id} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1}
        onClick={() => setTab(id)} onKeyDown={(event) => navigateTabs(event, index)}>{label}</button>)}
    </div>
    <div className="detail-panel" role="tabpanel" id="panel-description" aria-labelledby="tab-description"
      tabIndex={0} hidden={tab !== 'description'}>
      <nav className="detail-index" aria-label="A leírás tartalma">
        <ul>{detailSections.map(([id, title]) => <li key={id}><a href={'#' + id}>{title}</a></li>)}</ul>
      </nav>
      <section id="funkciok">
        <h2>Funkciók és tulajdonságok</h2>
        <p>{product.description}</p>
        <ul className="features">{product.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
      </section>
      <section id="muszaki-adatok">
        <h2>Méretek és műszaki adatok</h2>
        <dl>{product.specs.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
      </section>
      <section id="garancia"><h2>Garancia</h2><p>A végleges garanciális feltételek az éles induláskor lesznek elérhetők.</p></section>
      <section id="kiszallitas"><h2>Kiszállítás és beüzemelés</h2><p>A szállítási és beüzemelési feltételek az éles induláskor lesznek elérhetők.</p></section>
      <section id="fizetes"><h2>Fizetés és megrendelés</h2><p>A próbarendelés a banki átutalásos rendelési folyamatot mutatja be.</p></section>
    </div>
    <div className="detail-panel" role="tabpanel" id="panel-documents" aria-labelledby="tab-documents"
      tabIndex={0} hidden={tab !== 'documents'}>
      <h2>Dokumentumok és forrás</h2>
      <p><a className="text-link" href={product.source}>Bionwell termékforrás</a></p>
    </div>
    <div className="detail-panel" role="tabpanel" id="panel-reviews" aria-labelledby="tab-reviews"
      tabIndex={0} hidden={tab !== 'reviews'}>
      <h2>Vásárlói vélemények</h2>
      <p>Ehhez a modellhez még nem érhetők el vásárlói vélemények és fotók a MyRest felületén.</p>
    </div>
  </section>;
}

function Product({ product }) {
  const [viewIndex, setViewIndex] = useState(0);
  const [view, viewLabel] = galleryViews[viewIndex];
  return <div className="wrap inner">
    <nav aria-label="Útvonal" className="breadcrumb"><a href={siteUrl('/#masszazsfotelek')}>Masszázsfotelek</a><span> / {product.name}</span></nav>
    <div className="product-grid">
      <section className="product-gallery" aria-label="Termékgaléria">
        <div className="detail-photo"><img src={photo(product, view)} width="512" height="512"
          fetchpriority="high" alt={product.color + ' masszázsfotel · ' + viewLabel.toLowerCase()} /></div>
        <div className="gallery-controls" role="group" aria-label="Termékképek">{galleryViews.map(([key, label], index) =>
          <button type="button" key={key} aria-label={label} title={label}
            aria-pressed={viewIndex === index} onClick={() => setViewIndex(index)}>
            <img src={photo(product, key)} alt="" width="512" height="512" />
          </button>)}</div>
        <p className="gallery-note fine muted">A termékképek illusztrációk.</p>
      </section>
      <div className="product-copy">
        <h1>{product.name} masszázsfotel</h1>
        <dl className="product-meta fine">
          <div><dt>Gyártó</dt><dd>iRest</dd></div>
          <div><dt>Modellkód</dt><dd>{product.model}</dd></div>
        </dl>
        <p className="price">{money(product.price)} <small>Bruttó mintaár / db</small></p>
        <form className="product-options" action={siteUrl(orderUrl(product))} method="get">
          <h2>Rendelési lehetőségek</h2>
          <div className="product-option">
            <strong>Szín</strong>
            <span className="product-color"><span aria-hidden="true" style={{ backgroundColor: product.swatch }} />{product.color}</span>
          </div>
          <div className="product-option fine">
            <strong>Garancia és kiegészítők</strong>
            <span className="muted">A választható opciók az éles induláskor lesznek elérhetők.</span>
          </div>
          <label className="product-option product-quantity">Mennyiség
            <input name="mennyiseg" type="number" min="1" max="99" step="1" defaultValue="1" required />
          </label>
          <button className="button" type="submit">Megrendelem</button>
          <p className="fine muted">Próbarendelés · banki átutalás</p>
        </form>
      </div>
      <ProductDetails product={product} />
    </div>
  </div>;
}

const fields = [
  ['zip', 'Irányítószám', 'postal-code'],
  ['city', 'Település', 'address-level2'],
  ['address', 'Utca, házszám', 'street-address'],
];

function Address({ prefix, label }) {
  return <fieldset><legend>{label}</legend><div className="fields">
    {fields.map(([name, title, auto]) => <label key={name}>{title}
      <input name={prefix + '-' + name} autoComplete={'section-' + prefix + ' ' + auto} required
        inputMode={name === 'zip' ? 'numeric' : undefined} pattern={name === 'zip' ? '[0-9]{4}' : undefined} />
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
    const id = 'MR-DEMO-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    setOrder({ id, email });
  }

  return <div className="wrap inner">
    <nav aria-label="Útvonal" className="breadcrumb"><a href={siteUrl(productUrl(product))}>Vissza a termékhez</a></nav>

    <h1>{order ? 'Próbarendelés kész' : 'Próbarendelés'}</h1>
    {order ? <section className="receipt" aria-live="polite">
      <p className="tag">Átutalásra vár · demó</p>
      <h2>{order.id}</h2>
      <p>Alább látható a rendelési e-mail előnézete. Az előnézet helyben készül, küldés és valódi átutalás nélkül.</p>
      <dl><div><dt>Címzett</dt><dd>{order.email}</dd></div>
        <div><dt>Tárgy</dt><dd>Rendelés visszaigazolása · {order.id}</dd></div>
        <div><dt>Modell</dt><dd>{product.name} · {product.color} · {quantity} db</dd></div>
        <div><dt>Végösszeg</dt><dd>{money(total)}</dd></div>
        <div><dt>Kedvezményezett</dt><dd>MyRest (minta)</dd></div>
        <div><dt>Bankszámlaszám</dt><dd>Éles konfigurációból kerül ide</dd></div>
        <div><dt>Közlemény</dt><dd>{order.id}</dd></div></dl>
      <a className="button" href={siteUrl('/#masszazsfotelek')}>Vissza a fotelekhez</a>
    </section> : <>
      <p className="demo-note">Bemutatófelület. Kérjük, használjon mintaadatokat. Az űrlap helyben működik.</p>
      <form className="checkout" method="post" onSubmit={submit}>
        <div className="form-panel">
          <fieldset><legend>Kapcsolattartás</legend><div className="fields">
            <label>Teljes név<input name="name" autoComplete="name" required /></label>
            <label>E-mail-cím<input type="email" name="email" autoComplete="email" required /></label>
            <label>Telefonszám<input type="tel" name="phone" autoComplete="tel" required /></label>
          </div></fieldset>
          <Address prefix="shipping" label="Szállítási cím" />
          <label className="checkbox"><input type="checkbox" checked={same} onChange={(event) => setSame(event.target.checked)} /> A számlázási cím megegyezik a szállítási címmel</label>
          {!same && <Address prefix="billing" label="Számlázási cím" />}
        </div>
        <aside className="summary">
          <h2>Rendelés összesítője</h2>
          <p><strong>{product.name}</strong><br />{product.color} · {quantity} db</p>
          <dl><div><dt>Bruttó termékösszeg</dt><dd>{money(subtotal)}</dd></div>
            <div><dt>Szállítás (minta)</dt><dd>{money(shipping)}</dd></div>
            <div><dt>Végösszeg</dt><dd><strong>{money(total)}</strong></dd></div></dl>
          <p><strong>Banki átutalás</strong><br /><span className="fine">Az éles folyamatban az utalási adatok e-mailben érkeznek.</span></p>
          <button className="button" type="submit">Próbarendelés beküldése</button>
        </aside>
      </form>
    </>}
  </div>;
}

export function App({ page }) {
  return <Layout>
    {page.kind === 'home' && <Home />}
    {page.kind === 'product' && <Product product={page.product} />}
    {page.kind === 'order' && <Order product={page.product} />}
    {page.kind === 'missing' && <div className="wrap inner"><h1>Ez az oldal nem található.</h1><a className="button" href={siteUrl('/')}>Vissza a kezdőlapra</a></div>}
  </Layout>;
}
