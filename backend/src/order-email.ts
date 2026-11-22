import { config } from './config.js';
export type OrderSnapshot = {
 id: string; emailQueued?: boolean; language: 'hu' | 'de'; name: string; email: string; phone: string;
 productId?: string; variantCode?: string; product: string; model: string; variant: string; quantity: number;
 subtotal: number; shipping: number; total: number; currency: 'HUF' | 'EUR';
 shippingAddress: string; billingAddress: string;
 bank: { beneficiary: string; account: string; bic?: string };
};
const escape = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function renderOrderEmail(order: OrderSnapshot, owner = false) {
 const de = order.language === 'de' && !owner;
 const l = (hu: string, german: string) => de ? german : hu;
 const money = (value: number) => new Intl.NumberFormat(de ? 'de-DE' : 'hu-HU', { style: 'currency', currency: order.currency }).format(value);
 const subject = (owner ? 'Új rendelés · ' : l('Rendelés visszaigazolása · ', 'Bestellbestätigung · ')) + order.id;
 const details = [
 [l('Rendelési azonosító', 'Bestellnummer'), order.id],
 [l('Termék', 'Produkt'), order.product + ' · ' + order.model],
 [l('Változat', 'Variante'), order.variant],
 [l('Mennyiség', 'Menge'), order.quantity],
 [l('Bruttó termékösszeg', 'Produktsumme inkl. MwSt.'), money(order.subtotal)],
 [l('Szállítás', 'Versand'), money(order.shipping)],
 [l('Végösszeg', 'Gesamtbetrag'), money(order.total)],
 [l('Név', 'Name'), order.name], ['Email', order.email],
 [l('Telefonszám', 'Telefon'), order.phone],
 [l('Szállítási cím', 'Lieferadresse'), order.shippingAddress],
 [l('Számlázási cím', 'Rechnungsadresse'), order.billingAddress],
 [l('Kedvezményezett', 'Kontoinhaber'), order.bank.beneficiary],
 [l('Bankszámla / IBAN', 'Bankkonto / IBAN'), order.bank.account],
 ...(order.bank.bic ? [['BIC / SWIFT', order.bank.bic]] : []),
 [l('Közlemény', 'Verwendungszweck'), order.id],
 ];
 const intro = owner ? 'Új rendelés érkezett. Állapot: átutalásra vár.' : l('Köszönjük rendelését! Rendelését rögzítettük, a banki átutalásra várunk. Kérjük, az alábbi összeget a rendelési azonosító feltüntetésével utalja el. Ez az üzenet a rendelés beérkezését igazolja, nem fizetési visszaigazolás.', 'Vielen Dank für Ihre Bestellung! Ihre Bestellung wurde erfasst und wartet auf die Banküberweisung. Bitte überweisen Sie den angegebenen Betrag unter Angabe der Bestellnummer. Diese Nachricht bestätigt den Eingang Ihrer Bestellung, nicht den Zahlungseingang.');
 return { subject, textContent: ['MyRest', subject, intro, ...details.map(([key, value]) => key + ': ' + value)].join('\n'),
 htmlContent: `<!doctype html><html lang="${de ? 'de' : 'hu'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#FAF8F4;color:#22424F;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" style="max-width:620px;background:#fff;border:1px solid #d4dfe4;border-radius:18px" cellpadding="24"><tr><td style="background:#E6EFF4;font-size:32px;font-weight:bold;color:#336680">MyRest</td></tr><tr><td><h1 style="font-size:25px">${escape(subject)}</h1><p style="font-size:17px;line-height:1.7">${escape(intro)}</p><table width="100%" cellpadding="10" cellspacing="0">${details.map(([key, value]) => `<tr><th align="left" style="font-size:14px;border-bottom:1px solid #edf4f7;vertical-align:top">${escape(key)}</th><td style="font-size:15px;border-bottom:1px solid #edf4f7;overflow-wrap:anywhere">${escape(value)}</td></tr>`).join('')}</table><p style="line-height:1.6">${escape(l('Kérdés esetén válaszoljon erre az emailre.', 'Bei Fragen antworten Sie bitte auf diese E-Mail.'))}</p></td></tr></table></td></tr></table></body></html>` };
}
export async function sendOrderEmail(order: OrderSnapshot, owner: boolean) {
 const { apiKey, from, name, notify } = config.email;
 if (!apiKey || !from || !notify) throw new Error('Email configuration missing');
 const response = await fetch('https://api.brevo.com/v3/smtp/email', {
 method: 'POST', signal: AbortSignal.timeout(15000),
 headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
 body: JSON.stringify({ sender: { email: from, name }, replyTo: { email: notify, name },
 to: [{ email: owner ? notify : order.email, name: owner ? name : order.name }],
 ...renderOrderEmail(order, owner), headers: { IdempotencyKey: order.id + (owner ? '-owner' : '-customer') } }),
 });
 if (!response.ok) throw new Error('Brevo HTTP ' + response.status);
}
