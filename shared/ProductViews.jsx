import { useLocale, useTranslation } from './I18nContext.jsx';
import React, { useState } from 'react';
import { money, orderUrl, photo, productUrl, siteUrl } from './catalog.js';

export function ProductCard({ product, preview = false }) {
  const t = useTranslation();
  const language = useLocale();
  return <article className="card">
    <a className="card-photo" href={siteUrl(productUrl(product))} onClick={preview ? e => e.preventDefault() : undefined} aria-label={product.name + t(' részletei')}>
      {photo(product) ? <img src={photo(product)} alt={product.images?.[0]?.alt_text || product.color + t(' masszázsfotel')} width="512" height="512" loading="lazy" /> : <div className="empty-photo">{t("Még nincs termékkép")}</div>}
    </a>
    <div className="card-body"><p className="model">iRest · {product.model}</p><h3>{product.name}</h3>
      <p>{product.summary || product.features.join(' · ')}</p>
      <div className="card-bottom"><div><strong>{product.price ? money(product.price, language) : t('Ár nincs megadva')}</strong><small>{product.isAdminProduct ? t('Bruttó ár') : t('Mintaár')}</small></div>
        <a className="button card-action" href={siteUrl(productUrl(product))} onClick={preview ? e => e.preventDefault() : undefined}>{t("Részletek megtekintése")}</a></div></div>
  </article>;
}

const galleryViews = t => [['front', t('Elölnézet')], ['side', t('Oldalnézet')]];
const detailTabs = t => [['description', t('Leírás')], ['documents', t('Dokumentumok')], ['reviews', t('Vélemények')]];
const detailSections = t => [
  ['funkciok', t('Funkciók és tulajdonságok')],
  ['muszaki-adatok', t('Méretek és műszaki adatok')],
  ['garancia', t('Garancia')],
  ['kiszallitas', t('Kiszállítás és beüzemelés')],
  ['fizetes', t('Fizetés és megrendelés')],
];

function ProductDetails({ product }) {
  const t = useTranslation();
  const [tab, setTab] = useState('description');

  function navigateTabs(event, index) {
    const last = detailTabs(t).length - 1;
    const next = {
      ArrowLeft: (index + last) % detailTabs(t).length,
      ArrowRight: (index + 1) % detailTabs(t).length,
      Home: 0,
      End: last,
    }[event.key];
    if (typeof next !== 'number') return;
    event.preventDefault();
    setTab(detailTabs(t)[next][0]);
    event.currentTarget.parentElement.children[next].focus();
  }

  return <section className="product-details" aria-label={t("Termékrészletek")}>
    <div className="detail-tabs" role="tablist" aria-label={t("Termékinformációk")}>
      {detailTabs(t).map(([id, label], index) => <button type="button" role="tab" key={id} id={'tab-' + id}
        aria-controls={'panel-' + id} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1}
        onClick={() => setTab(id)} onKeyDown={(event) => navigateTabs(event, index)}>{label}</button>)}
    </div>
    <div className="detail-panel" role="tabpanel" id="panel-description" aria-labelledby="tab-description"
      tabIndex={0} hidden={tab !== 'description'}>
      <nav className="detail-index" aria-label={t("A leírás tartalma")}>
        <ul>{detailSections(t).map(([id, title]) => <li key={id}><a href={'#' + id} onClick={event => { event.preventDefault(); event.currentTarget.ownerDocument.getElementById(id)?.scrollIntoView({ block: 'start' }); }}>{title}</a></li>)}</ul>
      </nav>
      <section id="funkciok">
        <h2>{t("Funkciók és tulajdonságok")}</h2>
        <p style={{ whiteSpace: 'pre-line' }}>{product.description}</p>
        <ul className="features">{product.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
      </section>
      <section id="muszaki-adatok">
        <h2>{t("Méretek és műszaki adatok")}</h2>
        <dl>{product.specs.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
      </section>
      <section id="garancia"><h2>{t("Garancia")}</h2><p>{t("A végleges garanciális feltételek az éles induláskor lesznek elérhetők.")}</p></section>
      <section id="kiszallitas"><h2>{t("Kiszállítás és beüzemelés")}</h2><p>{t("A szállítási és beüzemelési feltételek az éles induláskor lesznek elérhetők.")}</p></section>
      <section id="fizetes"><h2>{t("Fizetés és megrendelés")}</h2><p>{t("A próbarendelés a banki átutalásos rendelési folyamatot mutatja be.")}</p></section>
    </div>
    <div className="detail-panel" role="tabpanel" id="panel-documents" aria-labelledby="tab-documents"
      tabIndex={0} hidden={tab !== 'documents'}>
      <h2>{t("Dokumentumok és forrás")}</h2>
      <p>{product.source ? <a className="text-link" href={product.source} target="_blank" rel="noreferrer">{t("Termékforrás")}</a> : t('Nincs megadott termékforrás.')}</p>
    </div>
    <div className="detail-panel" role="tabpanel" id="panel-reviews" aria-labelledby="tab-reviews"
      tabIndex={0} hidden={tab !== 'reviews'}>
      <h2>{t("Vásárlói vélemények")}</h2>
      <p>{t("Ehhez a modellhez még nem érhetők el vásárlói vélemények és fotók a MyRest felületén.")}</p>
    </div>
  </section>;
}

export function Product({ product, preview = false }) {
  const t = useTranslation();
  const language = useLocale();
  const [viewIndex, setViewIndex] = useState(0);
  const views = product.images?.length ? product.images.map((image, index) => [String(index), image.alt_text]) : product.isAdminProduct ? [] : galleryViews(t);
  const [view, viewLabel] = views[viewIndex] || views[0] || ['', ''];
  const [variantIndex, setVariantIndex] = useState(0);
  const variants = product.variants?.filter(item => item.active !== false && !item.disabled_at) || [];
  const selected = variants[variantIndex];
  return <div className="wrap inner">
    <nav aria-label={t("Útvonal")} className="breadcrumb"><a href={siteUrl('/#masszazsfotelek')} onClick={preview ? e => e.preventDefault() : undefined}>{t("Masszázsfotelek")}</a><span> / {product.name}</span></nav>
    <div className="product-grid">
      <section className="product-gallery" aria-label={t("Termékgaléria")}>
        <div className="detail-photo">{photo(product, view) ? <img src={photo(product, view)} width="512" height="512"
          fetchpriority="high" alt={product.color + t(' masszázsfotel · ') + viewLabel.toLowerCase()} /> : <div className="empty-photo">{t("Még nincs termékkép")}</div>}</div>
        <div className="gallery-controls" role="group" aria-label={t("Termékképek")}>{views.map(([key, label], index) =>
          <button type="button" key={key} aria-label={label} title={label}
            aria-pressed={viewIndex === index} onClick={() => setViewIndex(index)}>
            <img src={photo(product, key)} alt="" width="512" height="512" />
          </button>)}</div>
        <p className="gallery-note fine muted">{t("A termékképek illusztrációk.")}</p>
      </section>
      <div className="product-copy">
        <h1>{product.name}{t(' masszázsfotel')}</h1>
        <dl className="product-meta fine">
          <div><dt>{t("Gyártó")}</dt><dd>iRest</dd></div>
          <div><dt>{t("Modellkód")}</dt><dd>{product.model}</dd></div>
          {product.massage_level && <div><dt>{t("Masszázstípus")}</dt><dd>{product.massage_level}</dd></div>}
        </dl>
        <p className="price">{product.price ? money(product.price, language) : t('Ár nincs megadva')} <small>{product.isAdminProduct ? t('Bruttó ár / db') : t('Bruttó mintaár / db')}</small></p>
        <form className="product-options" action={siteUrl(orderUrl(product))} method="get" onSubmit={preview ? e => e.preventDefault() : undefined}>
          <h2>{t("Rendelési lehetőségek")}</h2>
          <div className="product-option">
            <strong>{t("Szín")}</strong>
            {variants.length ? <select aria-label={t("Színváltozat")} value={variantIndex} onChange={e => setVariantIndex(Number(e.target.value))}>{variants.map((item, index) => <option key={item.code} value={index}>{item.color_name}</option>)}</select> : <span className="product-color"><span aria-hidden="true" style={{ backgroundColor: selected?.color_hex || product.swatch }} />{product.color}</span>}
          </div>
          <div className="product-option fine">
            <strong>{t("Garancia és kiegészítők")}</strong>
            <span className="muted">{t("A választható opciók az éles induláskor lesznek elérhetők.")}</span>
          </div>
          <label className="product-option product-quantity">{t("Mennyiség")}<input name="mennyiseg" type="number" min="1" max="99" step="1" defaultValue="1" required />
          </label>
          <button className="button" type="submit">{t("Megrendelem")}</button>
          <p className="fine muted">{t("Próbarendelés · banki átutalás")}</p>
        </form>
      </div>
      <ProductDetails product={product} />
    </div>
  </div>;
}

