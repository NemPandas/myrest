import { LocaleProvider } from '../../shared/I18nContext.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Product, ProductCard } from '../../shared/ProductViews.jsx';
import { money, siteUrl } from '../../shared/catalog.js';

const normalizeVariantCode = value => value.normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/ß/g, 'ss').trim().replace(/[^A-Za-z0-9_-]+/g, '-')
  .replace(/[-_]{2,}/g, '-').replace(/^[-_]+|[-_]+$/g, '').toUpperCase();
const registrationEnabled = import.meta.env.VITE_ADMIN_REGISTRATION !== 'false';
async function api(path, options = {}) {
  let response;
  try { response = await fetch('/api/admin' + path, { credentials: 'same-origin', ...options,
    headers: options.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' } }); }
  catch { throw new Error('A szerver nem érhető el. Próbáld újra.'); }
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (response.ok && response.status !== 204 && !body) throw new Error('Az API nem adott JSON-választ. Ellenőrizd a backend és a proxy beállítását.');
  if (!response.ok) {
    const fields = body?.error?.fields?.map(item => (item.path[0] === 'variants' && item.path[2] === 'code' ? (Number(item.path[1]) + 1) + '. színváltozat kódja' : item.path.join('.')) + ': ' + item.message).join(' · ');
    const error = new Error(fields || body?.error?.message || 'A kérés sikertelen. Ellenőrizd, hogy fut-e a backend.');
    error.status = response.status; throw error;
  }
  return body;
}
const send = (path, body, method = 'POST') => api(path, { method, body: JSON.stringify(body) });
const translatedFields = ['name', 'summary', 'description', 'features', 'specifications', 'seo_title', 'seo_description'];
const blankTranslation = () => ({ name: '', summary: '', description: '', features: [], specifications: [], seo_title: '', seo_description: '', image_alts: [], variant_names: [], status: 'draft' });
function languageDraft(draft, language) {
  if (language === 'hu') return draft;
  const de = draft.translations.de;
  return { ...draft, ...de,
    images: draft.images.map(image => ({ ...image, alt_text: de.image_alts.find(item => item.url === image.url)?.alt_text || '' })),
    variants: draft.variants.map(variant => ({ ...variant, color_name: de.variant_names.find(item => item.code.toUpperCase() === variant.code.toUpperCase())?.color_name || '' })),
  };
}
const blank = () => ({ translations: { de: blankTranslation() }, name: '', model_code: '', slug: '', massage_level: '', summary: '', description: '', features: [], specifications: [], images: [], variants: [], gross_price_huf: '', sort_order: 0, source_url: '', seo_title: '', seo_description: '' });
const fromRecord = record => ({ ...blank(), ...record, translations: { de: { ...blankTranslation(), ...record.translations?.de } }, features: record.features || [], specifications: record.specifications || [], images: record.images || [], variants: (record.variants || []).map(item => ({ ...item, active: !item.disabled_at })) });
function payload(draft) {
  const result = {};
  for (const key of ['name', 'model_code', 'slug']) result[key] = draft[key].trim();
  for (const key of ['massage_level', 'summary', 'description', 'source_url', 'seo_title', 'seo_description']) result[key] = draft[key]?.trim() || null;
  if (!result.name) result.name = draft.translations.de.name?.trim() || draft.model_code.trim();
  const de = draft.translations.de;
  result.translations = { de: {
    ...Object.fromEntries(['name', 'summary', 'description', 'seo_title', 'seo_description'].map(key => [key, de[key]?.trim() || null])),
    features: de.features.filter(item => item.trim()),
    specifications: de.specifications.map(({ name, value }) => ({ name, value })),
    image_alts: draft.images.map(image => ({ url: image.url, alt_text: de.image_alts.find(item => item.url === image.url)?.alt_text?.trim() || null })),
    variant_names: draft.variants.map(variant => ({ code: variant.code, color_name: de.variant_names.find(item => item.code.toUpperCase() === variant.code.toUpperCase())?.color_name?.trim() || null })),
  } };
  result.gross_price_huf = draft.gross_price_huf === '' || draft.gross_price_huf == null ? null : Number(draft.gross_price_huf);
  result.sort_order = Number(draft.sort_order);
  result.features = draft.features.filter(item => item.trim());
  result.specifications = draft.specifications.map(({ name, value }) => ({ name, value }));
  result.images = draft.images.map(({ url, alt_text }, sort_order) => ({ url, alt_text, sort_order }));
  result.variants = draft.variants.map(({ code, color_name, color_hex, active }, sort_order) => ({ code, color_name, color_hex: color_hex || null, active, sort_order }));
  return result;
}
function previewProduct(draft, language) {
  return { ...draft, isAdminProduct: true, name: draft.name || (language === 'de' ? 'Neues Produkt' : 'Új termék'), slug: draft.slug || 'elonezet', model: draft.model_code,
    price: Number(draft.gross_price_huf), description: draft.description, specs: draft.specifications.map(item => [item.name, item.value]),
    source: draft.source_url, color: draft.variants.find(item => item.active)?.color_name || (language === 'de' ? 'Keine Farbvariante' : 'Nincs színváltozat'), swatch: draft.variants.find(item => item.active)?.color_hex };
}
function Auth({ onLogin, initialError }) {
  const [register, setRegister] = useState(registrationEnabled && location.pathname.includes('regisztracio'));
  const [error, setError] = useState(initialError || ''); const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (register) { await send('/auth/register', { email: values.email, password: values.password, token: values.token }); setRegister(false); setNotice('Sikeres regisztráció. Most jelentkezz be.'); }
      else onLogin(await send('/auth/login', values));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="admin-auth"><a className="brand" href={siteUrl('/')}>MyRest</a><h1>{register ? 'Admin regisztráció' : 'Admin belépés'}</h1>
    <p>{register ? 'Fiók létrehozása tulajdonosi meghívóval.' : 'Jelentkezz be a termékek kezeléséhez.'}</p>
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <form onSubmit={submit}><label>E-mail-cím<input name="email" type="email" autoComplete="username" required maxLength={254} /></label>
      <label>Jelszó<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 15 : 1} maxLength={256} required /></label>
      {register && <><small>Legalább 15 karakter.</small><label>Meghívókód<input name="token" defaultValue={new URLSearchParams(location.search).get('token') || ''} required pattern="[A-Za-z0-9_-]{43}" /></label></>}
      <button className="button" disabled={busy}>{busy ? 'Folyamatban…' : register ? 'Regisztráció' : 'Belépés'}</button></form>
    {registrationEnabled && <button className="admin-link" onClick={() => { setRegister(!register); setError(''); }}>{register ? 'Már van fiókom, belépek' : 'Regisztráció meghívóval'}</button>}
  </main>;
}
function Preview({ draft, language, mode, close }) {
  const [target, setTarget] = useState(null);
  const dialog = useRef(); const [mobile, setMobile] = useState(false);
  useEffect(() => { const previous = document.activeElement; dialog.current.showModal(); return () => previous?.focus(); }, []);
  const product = previewProduct(languageDraft(draft, language), language);
  return createPortal(<dialog ref={dialog} className="admin-preview" onCancel={close} onClose={close}>
    <div className="admin-preview-bar"><strong>{mode === 'list' ? 'Listanézet előnézete' : 'Részletes nézet előnézete'}</strong><span>{language === 'de' ? 'Német' : 'Magyar'} · Nem mentett adatok</span>
      <button type="button" onClick={() => setMobile(!mobile)}>{mobile ? 'Asztali szélesség' : 'Mobil szélesség'}</button><button type="button" onClick={close}>Bezárás</button></div>
    <div className="admin-preview-scroll"><iframe title="Termék előnézet" className={mobile ? 'preview-frame mobile' : 'preview-frame'} srcDoc="<!doctype html><html lang='hu'><head></head><body><div id='preview'></div></body></html>" onLoad={event => {
      const doc = event.currentTarget.contentDocument; doc.documentElement.lang = language;
      document.querySelectorAll('link[rel="stylesheet"], style').forEach(node => doc.head.appendChild(node.cloneNode(true)));
      setTarget(doc.getElementById('preview'));
    }} /></div>{target && createPortal(<LocaleProvider language={language}>{mode === 'list' ? <div className="admin-card-preview"><ProductCard product={product} preview /></div> : <Product product={product} preview />}</LocaleProvider>, target)}</dialog>, document.body);

}
function Field({ label, draft, change, name, multiline, ...props }) {
  const Tag = multiline ? 'textarea' : 'input';
  return <label>{label}<Tag {...props} value={draft[name] ?? ''} onChange={e => change(name, e.target.value)} /></label>;
}
function Editor({ initial, onSaved, onBack }) {
  const [language, setLanguage] = useState('hu');
  const [draft, setDraft] = useState(() => initial ? fromRecord(initial) : blank());
  const [saved, setSaved] = useState(JSON.stringify(draft)); const dirty = saved !== JSON.stringify(draft);
  const [preview, setPreview] = useState(null); const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const view = languageDraft(draft, language);
  const change = (name, value) => setDraft(old => language === 'de' && translatedFields.includes(name)
    ? { ...old, translations: { de: { ...old.translations.de, [name]: value } } }
    : { ...old, [name]: language === 'de' && name === 'images' ? value.map(item => ({ ...item, alt_text: old.images.find(image => image.url === item.url)?.alt_text ?? item.alt_text }))
      : language === 'de' && name === 'variants' ? value.map(item => ({ ...item, color_name: old.variants.find(variant => variant.code.toUpperCase() === item.code.toUpperCase())?.color_name ?? item.color_name })) : value });
  useEffect(() => {
    if (!dirty) return;
    const warn = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const back = () => { if (!dirty || window.confirm('Elveted a nem mentett módosításokat?')) onBack(); };
  function update(name, index, key, value) {
    if (language === 'de' && name === 'images' && key === 'alt_text') {
      const url = draft.images[index].url;
      setDraft(old => ({ ...old, translations: { de: { ...old.translations.de,
        image_alts: [...old.translations.de.image_alts.filter(item => item.url !== url), { url, alt_text: value }] } } }));
    } else if (language === 'de' && name === 'variants' && key === 'color_name') {
      const code = draft.variants[index].code.toUpperCase();
      setDraft(old => ({ ...old, translations: { de: { ...old.translations.de,
        variant_names: [...old.translations.de.variant_names.filter(item => item.code.toUpperCase() !== code), { code, color_name: value }] } } }));
    } else {
      const next = (name === 'images' || name === 'variants' ? draft[name] : view[name]).map((row, i) => i === index ? { ...row, [key]: value } : row);
      change(name, next);
      if ((name === 'images' && key === 'url') || (name === 'variants' && key === 'code')) {
        const list = name === 'images' ? 'image_alts' : 'variant_names';
        const identifier = name === 'images' ? 'url' : 'code';
        const previous = draft[name][index][identifier];
        setDraft(old => ({ ...old, translations: { de: { ...old.translations.de,
          [list]: old.translations.de[list].map(item => (identifier === 'code' ? item[identifier].toUpperCase() === previous.toUpperCase() : item[identifier] === previous) ? { ...item, [identifier]: value } : item) } } }));
      }
    }
  }
  function reorder(name, index, direction) { const items = [...view[name]]; [items[index], items[index + direction]] = [items[index + direction], items[index]]; change(name, items); }
  function controls(name, index) { return <div className="admin-row-actions"><button type="button" aria-label="Mozgatás fel" disabled={!index} onClick={() => reorder(name, index, -1)}>Fel</button><button type="button" aria-label="Mozgatás le" disabled={index === view[name].length - 1} onClick={() => reorder(name, index, 1)}>Le</button><button type="button" onClick={() => change(name, view[name].filter((_, i) => i !== index))}>Eltávolítás</button></div>; }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const body = payload(draft);
      const result = draft.id ? await send('/products/' + draft.id, { ...body, version: draft.version }, 'PATCH') : await send('/products', body);
      const next = fromRecord(result); setDraft(next); setSaved(JSON.stringify(next)); onSaved(); setNotice('A terméket elmentettük.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function lifecycle() {
    setBusy(true); setError(''); setNotice('');
    try { const result = await send('/products/' + draft.id + (view.status === 'published' ? '/unpublish' : '/publish'), { version: draft.version, language }); const next = fromRecord(result); setDraft(next); setSaved(JSON.stringify(next)); onSaved(); setNotice((language === 'de' ? 'Német' : 'Magyar') + ' változat: ' + (languageDraft(next, language).status === 'published' ? 'közzétéve.' : 'piszkozat.')); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function upload(event) {
    const file = event.target.files[0]; if (!file) return; setUploading(true); setError('');
    try { const form = new FormData(); form.append('file', file); const image = await api('/images', { method: 'POST', body: form }); setDraft(old => ({ ...old, images: [...old.images, { url: image.url, alt_text: '' }] })); }
    catch (e) { setError(e.message); } finally { setUploading(false); event.target.value = ''; }
  }
  const field = (name, label, props = {}) => <Field name={name} label={label} draft={view} change={change} {...props} />;
  return <><form onSubmit={save} className="admin-editor">
    <div className="admin-toolbar"><button type="button" onClick={back}>Vissza a termékekhez</button><span>{view.status === 'published' ? 'Közzétéve' : 'Piszkozat'}{dirty ? ' · Nem mentett módosítások' : ''}</span>
      <button type="button" onClick={() => setPreview('list')}>Lista előnézet</button><button type="button" onClick={() => setPreview('detail')}>Részletes előnézet</button>
      <button className="button" disabled={busy || uploading}>{busy ? 'Mentés…' : 'Mentés'}</button></div>
    <h1>{draft.id ? 'Termék szerkesztése' : 'Új termék'}</h1>
    <div className="admin-language-tabs" role="group" aria-label="Terméktartalom nyelve">
      {['hu', 'de'].map(lang => <button type="button" key={lang} aria-pressed={language === lang} onClick={() => setLanguage(lang)}>{lang === 'hu' ? 'Magyar' : 'Német'} · {languageDraft(draft, lang).status === 'published' ? 'Közzétéve' : 'Piszkozat'}</button>)}
    </div>
    <p className="admin-language-note">A szöveges mezők a kiválasztott nyelvhez tartoznak. Az ár, modellkód, URL, képfájlok, színkódok és sorrend közösek.</p>
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    <fieldset disabled={busy}><legend>{language === 'de' ? 'Német tartalom és közös adatok' : 'Magyar tartalom és közös adatok'}</legend><div className="admin-fields">
      {field('name', 'Terméknév', { maxLength: 180 })}{field('model_code', 'Modellkód', { required: true, maxLength: 80 })}
      {field('slug', 'URL-azonosító (pl. flame-3d)', { required: true, pattern: '[a-z0-9]+(-[a-z0-9]+)*', maxLength: 160 })}
      {field('massage_level', 'Masszázstípus (pl. 4D+)', { maxLength: 40 })}{field('gross_price_huf', 'Bruttó ár (Ft)', { type: 'number', min: 1, max: 4294967295, step: 1 })}
      {field('sort_order', 'Megjelenési sorrend', { type: 'number', min: 0, max: 4294967295, required: true })}
    </div>{field('summary', 'Rövid összefoglaló a listához', { multiline: true, maxLength: 500, rows: 3 })}{field('description', 'Részletes termékleírás', { multiline: true, maxLength: 16000, rows: 8 })}
    </fieldset>
    <fieldset disabled={busy}><legend>Funkciók és tulajdonságok</legend><label>Kiemelt jellemzők, soronként egy<textarea rows={5} value={view.features.join('\n')} onChange={e => change('features', e.target.value.split('\n'))} /></label></fieldset>
    <fieldset disabled={busy}><legend>Méretek és műszaki adatok</legend>{view.specifications.map((item, i) => <div className="admin-repeat" key={i}><label>Megnevezés<input required maxLength={120} value={item.name} onChange={e => update('specifications', i, 'name', e.target.value)} /></label><label>Érték<input required maxLength={500} value={item.value} onChange={e => update('specifications', i, 'value', e.target.value)} /></label>{controls('specifications', i)}</div>)}<button type="button" onClick={() => change('specifications', [...view.specifications, { name: '', value: '' }])}>Műszaki adat hozzáadása</button></fieldset>
    <fieldset disabled={busy || uploading}><legend>Képgaléria</legend><p>Az első kép jelenik meg a listában. A képek sorrendjét a Fel / Le gombokkal állíthatod.</p>
      {view.images.map((item, i) => <div className="admin-repeat" key={i}><img className="admin-thumb" src={item.url} alt={item.alt_text} /><label>Kép URL<input required value={item.url} onChange={e => update('images', i, 'url', e.target.value)} maxLength={2048} /></label><label>Kép leírása<input value={item.alt_text} onChange={e => update('images', i, 'alt_text', e.target.value)} maxLength={255} /></label>{controls('images', i)}</div>)}
      <div className="admin-actions"><label className="admin-upload">{uploading ? 'Feltöltés…' : 'Kép feltöltése'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} /></label><button type="button" onClick={() => change('images', [...view.images, { url: '', alt_text: '' }])}>Kép hozzáadása URL-lel</button></div>
    </fieldset>
    <fieldset disabled={busy}><legend>Színváltozatok</legend><p>A változatkód közös azonosító, például GRAFIT vagy FEHER-01. Az ékezeteket elhagyjuk, a szóközöket kötőjelre cseréljük. Minden változat kódja legyen egyedi.</p>{view.variants.map((item, i) => <div className="admin-repeat" key={i}>
      <label>Változatkód<input required maxLength={80} placeholder="pl. GRAFIT vagy FEHER-01" value={item.code} onChange={e => update('variants', i, 'code', e.target.value)} onBlur={e => update('variants', i, 'code', normalizeVariantCode(e.target.value))} /></label>
      <label>Szín neve<input maxLength={100} value={item.color_name} onChange={e => update('variants', i, 'color_name', e.target.value)} /></label>
      <label>Színkód<input type="color" value={item.color_hex || '#444444'} onChange={e => update('variants', i, 'color_hex', e.target.value)} /></label>
      <label className="admin-check"><input type="checkbox" checked={item.active} onChange={e => update('variants', i, 'active', e.target.checked)} />Aktív</label>{controls('variants', i)}</div>)}
      <button type="button" onClick={() => change('variants', [...view.variants, { code: '', color_name: '', color_hex: '#444444', active: true }])}>Színváltozat hozzáadása</button></fieldset>
    <fieldset disabled={busy}><legend>Keresőoptimalizálás és forrás</legend>{field('seo_title', 'SEO cím', { maxLength: 180 })}{field('seo_description', 'SEO leírás', { multiline: true, maxLength: 320, rows: 3 })}{field('source_url', 'Termékforrás URL', { type: 'url', maxLength: 2048 })}</fieldset>
    <fieldset><legend>{language === 'de' ? 'Német' : 'Magyar'} változat közzététele</legend><p>Először mentsd el a terméket. A másik nyelv állapota nem változik. Közzétételhez összefoglaló, részletes leírás, pozitív ár, leírással ellátott kép és aktív színváltozat szükséges.</p><button type="button" disabled={!draft.id || dirty || busy || uploading} onClick={lifecycle}>{view.status === 'published' ? 'Visszavonás piszkozatba' : 'Termék közzététele'}</button></fieldset>
  </form>{preview && <Preview draft={draft} language={language} mode={preview} close={() => setPreview(null)} />}</>;
}
export function Admin() {
  const [admin, setAdmin] = useState(null); const [checking, setChecking] = useState(true); const [error, setError] = useState('');
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(false); const [editor, setEditor] = useState(null);
  const [filterLanguage, setFilterLanguage] = useState('hu');
  const [query, setQuery] = useState(''); const [status, setStatus] = useState(''); const [offset, setOffset] = useState(0); const [refresh, setRefresh] = useState(0);
  useEffect(() => { api('/auth/me').then(setAdmin).catch(e => { if (e.status !== 401) setError(e.message); }).finally(() => setChecking(false)); }, []);
  useEffect(() => {
    if (!admin) return; let active = true; setLoading(true); setError('');
    const params = new URLSearchParams({ limit: '20', offset: String(offset), q: query, language: filterLanguage }); if (status) params.set('status', status);
    api('/products?' + params).then(data => { if (active) setItems(data.items); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [admin, query, status, offset, refresh, filterLanguage]);
  async function open(item) { setError(''); setLoading(true); try { setEditor(await api('/products/' + item.id)); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  async function logout() { try { await send('/auth/logout', {}); setAdmin(null); setEditor(null); } catch (e) { setError(e.message); } }
  if (checking) return <main className="admin-auth" role="status">Munkamenet ellenőrzése…</main>;
  if (!admin) return <Auth onLogin={setAdmin} initialError={error} />;
  return <div className="admin-shell"><header className="admin-header"><a className="brand" href={siteUrl('/')}>MyRest</a><strong>Termékkezelés</strong><span>{admin.email}</span>{!editor && <button onClick={logout}>Kijelentkezés</button>}</header>
    <main className="admin-main">{editor ? <Editor key={editor.id || 'new'} initial={editor.id ? editor : null} onBack={() => setEditor(null)} onSaved={() => setRefresh(value => value + 1)} /> : <>
      <div className="admin-title"><div><h1>Termékek</h1><p>Hozd létre és szerkeszd a kínálatot.</p></div><button className="button" onClick={() => setEditor({})}>Új termék</button></div>
      <div className="admin-filters"><label>Keresés<input type="search" placeholder="Név, modellkód vagy URL" value={query} onChange={e => { setQuery(e.target.value); setOffset(0); }} /></label><label>Állapot nyelve<select value={filterLanguage} onChange={e => { setFilterLanguage(e.target.value); setOffset(0); }}><option value="hu">Magyar</option><option value="de">Német</option></select></label><label>Állapot<select value={status} onChange={e => { setStatus(e.target.value); setOffset(0); }}><option value="">Összes</option><option value="draft">Piszkozat</option><option value="published">Közzétéve</option></select></label></div>
      {error && <p className="admin-error" role="alert">{error} <button onClick={() => setRefresh(value => value + 1)}>Újrapróbálás</button></p>}
      {loading ? <p role="status">Betöltés…</p> : <div className="admin-list">{items.length ? items.map(item => <article key={item.id}><div><h2>{item.name}</h2><p>{item.model_code} · HU: {item.status === 'published' ? 'Közzétéve' : 'Piszkozat'} · DE: {item.german_status === 'published' ? 'Közzétéve' : 'Piszkozat'}</p></div><strong>{item.gross_price_huf ? money(item.gross_price_huf) : 'Nincs ár'}</strong><button onClick={() => open(item)}>Szerkesztés</button></article>) : <p>Nincs megjeleníthető termék.</p>}</div>}
      <div className="admin-actions"><button disabled={!offset || loading} onClick={() => setOffset(offset - 20)}>Előző oldal</button><span>{offset / 20 + 1}. oldal</span><button disabled={items.length < 20 || loading} onClick={() => setOffset(offset + 20)}>Következő oldal</button></div>
    </>}</main></div>;
}
