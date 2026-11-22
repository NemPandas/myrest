import React, { useEffect, useState } from 'react';

const statusName = value => value === 'paid' ? 'Fizetve' : 'Átutalásra vár';
const date = value => new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Budapest' }).format(new Date(value));
const amount = order => new Intl.NumberFormat('hu-HU', { style: 'currency', currency: order.currency }).format(order.total);

function OrderDetails({ record }) {
 const order = record.snapshot;
 const fields = [
  ['Rendelési azonosító', record.id], ['Rendelés időpontja', date(record.created_at)],
  ['Állapot', statusName(record.status)], ['Rendelés nyelve', order.language === 'de' ? 'Német' : 'Magyar'],
  ['Vásárló neve', order.name], ['Email', order.email], ['Telefonszám', order.phone],
  ['Termék', order.product], ['Modellkód', order.model], ['Szín / változat', order.variant || '–'],
  ['Változatkód', order.variantCode || '–'], ['Mennyiség', order.quantity + ' db'],
  ['Termékösszeg', amount({ ...order, total: order.subtotal })],
  ['Szállítási díj', amount({ ...order, total: order.shipping })], ['Végösszeg', amount(order)],
  ['Szállítási cím', order.shippingAddress], ['Számlázási cím', order.billingAddress],
 ];
 return <><div className="admin-title"><div><h1>Rendelés részletei</h1><p>A rendelés leadásakor elmentett adatok.</p></div><a className="button" href="/admin/rendelesek/">Vissza a rendelésekhez</a></div>
  <section className="admin-order-details" aria-label="Rendelési adatok"><dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
  <section className="admin-order-details"><h2>Emailértesítések</h2>{record.emails.length ? <ul>{record.emails.map(email => <li key={email.kind}>{email.kind === 'customer' ? 'Vásárlói visszaigazolás' : 'Üzemeltetői értesítés'}: {email.sent_at ? 'Elküldve: ' + date(email.sent_at) : 'Küldésre vár'} · Próbálkozások: {email.attempts}</li>)}</ul> : <p>Ehhez a rendeléshez nem indult emailküldés.</p>}</section>
 </>;
}

export function Orders({ api }) {
 const id = new URLSearchParams(window.location.search).get('id');
 const [data, setData] = useState(null);
 const [query, setQuery] = useState(''); const [search, setSearch] = useState('');
 const [language, setLanguage] = useState(''); const [status, setStatus] = useState('');
 const [offset, setOffset] = useState(0); const [refresh, setRefresh] = useState(0);
 const [loading, setLoading] = useState(true); const [error, setError] = useState('');
 useEffect(() => {
  let active = true; setLoading(true); setError(''); setData(null);
  const params = new URLSearchParams({ limit: '20', offset: String(offset), q: search });
  if (language) params.set('language', language); if (status) params.set('status', status);
  api(id ? '/orders/' + encodeURIComponent(id) : '/orders?' + params)
   .then(result => { if (active) setData(result); })
   .catch(error => { if (active) setError(error.message); })
   .finally(() => { if (active) setLoading(false); });
  return () => { active = false; };
 }, [api, id, search, language, status, offset, refresh]);
 return <>
  {!id && <><div className="admin-title"><div><h1>Rendelések</h1><p>Ki, mikor és mit rendelt – a legújabb rendelés van legfelül.</p></div><button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Lista frissítése</button></div>
  <form className="admin-filters" onSubmit={event => { event.preventDefault(); setSearch(query.trim()); setOffset(0); }}>
   <label>Keresés<input type="search" placeholder="Vásárló, email, termék vagy rendelési azonosító" value={query} onChange={e => setQuery(e.target.value)} maxLength={200} /></label><button type="submit">Keresés</button>
   <label>Nyelv<select value={language} onChange={e => { setLanguage(e.target.value); setOffset(0); }}><option value="">Összes</option><option value="hu">Magyar</option><option value="de">Német</option></select></label>
   <label>Állapot<select value={status} onChange={e => { setStatus(e.target.value); setOffset(0); }}><option value="">Összes</option><option value="awaiting_transfer">Átutalásra vár</option><option value="paid">Fizetve</option></select></label>
  </form></>}
  {loading && <p role="status">Rendelések betöltése…</p>}
  {error && <p className="admin-error" role="alert">{error} <button type="button" onClick={() => setRefresh(value => value + 1)}>Újrapróbálás</button>{id && <> <a href="/admin/rendelesek/">Vissza a listához</a></>}</p>}
  {!loading && !error && data && (id ? <OrderDetails record={data} /> : <>
   {data.items.length ? <div className="admin-orders-table"><table><caption className="admin-sr-only">Mentett rendelések</caption><thead><tr><th scope="col">Időpont</th><th scope="col">Vásárló</th><th scope="col">Rendelt termék</th><th scope="col">Összeg</th><th scope="col">Állapot</th><th scope="col">Részletek</th></tr></thead><tbody>{data.items.map(record => <tr key={record.id}>
    <td><time dateTime={record.created_at}>{date(record.created_at)}</time><small>{record.snapshot.language === 'de' ? 'Német' : 'Magyar'}</small></td>
    <td><strong>{record.snapshot.name}</strong><small>{record.snapshot.email}</small></td>
    <td>{record.snapshot.product}<small>{record.snapshot.variant || '–'} · {record.snapshot.quantity} db</small></td>
    <td className="admin-order-amount">{amount(record.snapshot)}</td><td>{statusName(record.status)}</td>
    <td><a href={'/admin/rendelesek/?id=' + encodeURIComponent(record.id)} aria-label={'Rendelés megnyitása: ' + record.id}>Megnyitás</a><small>{record.id}</small></td>
   </tr>)}</tbody></table></div> : <p className="admin-notice">{search || language || status ? 'Nincs a szűrésnek megfelelő rendelés.' : 'Még nem érkezett rendelés.'}</p>}
   <div className="admin-actions"><button disabled={!offset} onClick={() => setOffset(value => value - 20)}>Előző oldal</button><span>{offset / 20 + 1}. oldal</span><button disabled={!data.hasMore} onClick={() => setOffset(value => value + 20)}>Következő oldal</button></div>
  </>)}
 </>;
}
