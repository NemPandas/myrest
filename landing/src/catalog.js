export const products = [
  {
    slug: 'flame-3d', name: 'Flame 3D', model: 'SL-A2801', level: '3D',
    price: 399990, color: 'Grafit', swatch: '#44474d',
    features: ['3D masszázs', 'Hátmelegítés'],
    description: 'Masszázsfotel állítható háttámlával, hátmelegítéssel és beépített Bluetooth-hangszórókkal.',
    specs: [['Magasság', '120 cm'], ['Döntött magasság', '92 cm'], ['Hely a faltól', 'Legalább 5,5 cm']],
    source: 'https://bionwell.hu/flame3d-masszazsfotel',
  },
  {
    slug: 'balance-4d', name: 'Balance DC. 4D+', model: 'SL-A520-32', level: '4D+',
    price: 799990, color: 'Konyak', swatch: '#986140',
    features: ['Kettős masszázsmechanika', 'Derékmelegítés'],
    description: 'Kettős masszázsmechanikával, állítható lábrésszel és görgős talpmasszázzsal felszerelt modell.',
    specs: [['Mechanika', 'Kettős masszázsrendszer'], ['Talpmasszázs', 'Görgős és légpárnás'], ['Helyigény', 'Lásd a forrásoldalon']],
    source: 'https://bionwell.hu/index.php?download_id=107&product_id=160&route=product%2Fproduct%2Fdownload',
  },
  {
    slug: 'ultimate-5d', name: 'Ultimate DC. Premium 5D', model: 'SL-A663', level: '5D',
    price: 1299990, color: 'Krémszín', swatch: '#e6d9c6',
    features: ['5D masszázs', 'DualCore mechanika'],
    description: 'Prémium masszázsfotel két masszázsegységgel. Azoknak érdemes megnézniük, akik többféle beállítást szeretnének kipróbálni.',
    specs: [['Mechanika', 'DualCore 5D'], ['Helyigény', 'Lásd a gyártói adatokat']],
    source: 'https://bionwell.hu/ultimate-dc-premium-5d-masszazsfotel',
  },
];

export const productUrl = (product) => '/masszazsfotelek/' + product.slug + '/';
export const orderUrl = (product) => productUrl(product) + 'rendeles/';
export const siteUrl = (path) => import.meta.env.BASE_URL + path.slice(1);
export const photo = (product, view = 'front') => siteUrl('/media/' + product.slug + '-' + view + '.webp');
export const money = (value) => new Intl.NumberFormat('hu-HU', {
  style: 'currency', currency: 'HUF', maximumFractionDigits: 0,
}).format(value);

export function getPage(pathname) {
  const path = pathname.replace(/\/+$/, '');
  if (!path) return { kind: 'home' };
  for (const product of products) {
    if (path === productUrl(product).slice(0, -1)) return { kind: 'product', product };
    if (path === orderUrl(product).slice(0, -1)) return { kind: 'order', product };
  }
  return { kind: 'missing' };
}

export function metadata(page) {
  if (page.kind === 'product') return {
    title: page.product.name + ' masszázsfotel | MyRest',
    description: page.product.description,
  };
  if (page.kind === 'order') return {
    title: 'Próbarendelés – ' + page.product.name + ' | MyRest',
    description: 'Banki átutalásos próbarendelés a MyRest bemutatófelületén.',
  };
  if (page.kind === 'missing') return { title: 'Az oldal nem található | MyRest', description: '' };
  return {
    title: 'MyRest | Masszázsfotelek az otthoni pihenéshez',
    description: 'Ismerje meg a masszázsfoteleket, hasonlítsa össze a modelleket, és találja meg az otthonába illő fotelt.',
  };
}
