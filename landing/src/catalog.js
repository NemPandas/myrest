import { t } from '../../shared/i18n.js';
import { productUrl, orderUrl } from '../../shared/catalog.js';
export { productUrl, orderUrl, siteUrl, photo, money } from '../../shared/catalog.js';

export const getProducts = () => [
  {
    slug: 'flame-3d', name: 'Flame 3D', model: 'SL-A2801', level: '3D',
    price: 399990, color: t('Grafit'), swatch: '#44474d',
    features: [t('3D masszázs'), t('Hátmelegítés')],
    description: t('Masszázsfotel állítható háttámlával, hátmelegítéssel és beépített Bluetooth-hangszórókkal.'),
    specs: [[t('Magasság'), '120 cm'], [t('Döntött magasság'), '92 cm'], [t('Hely a faltól'), t('Legalább 5,5 cm')]],
    source: 'https://bionwell.hu/flame3d-masszazsfotel',
  },
  {
    slug: 'balance-4d', name: 'Balance DC. 4D+', model: 'SL-A520-32', level: '4D+',
    price: 799990, color: t('Konyak'), swatch: '#986140',
    features: [t('Kettős masszázsmechanika'), t('Derékmelegítés')],
    description: t('Kettős masszázsmechanikával, állítható lábrésszel és görgős talpmasszázzsal felszerelt modell.'),
    specs: [[t('Mechanika'), t('Kettős masszázsrendszer')], [t('Talpmasszázs'), t('Görgős és légpárnás')], [t('Helyigény'), t('Lásd a forrásoldalon')]],
    source: 'https://bionwell.hu/index.php?download_id=107&product_id=160&route=product%2Fproduct%2Fdownload',
  },
  {
    slug: 'ultimate-5d', name: 'Ultimate DC. Premium 5D', model: 'SL-A663', level: '5D',
    price: 1299990, color: t('Krémszín'), swatch: '#e6d9c6',
    features: [t('5D masszázs'), t('DualCore mechanika')],
    description: t('Prémium masszázsfotel két masszázsegységgel. Azoknak érdemes megnézniük, akik többféle beállítást szeretnének kipróbálni.'),
    specs: [[t('Mechanika'), 'DualCore 5D'], [t('Helyigény'), t('Lásd a gyártói adatokat')]],
    source: 'https://bionwell.hu/ultimate-dc-premium-5d-masszazsfotel',
  },
];

export const products = getProducts();

export function getPage(pathname) {
  const path = pathname.replace(/\/+$/, '');
  if (!path) return { kind: 'home' };
  for (const product of getProducts()) {
    if (path === productUrl(product).slice(0, -1)) return { kind: 'product', product };
    if (path === orderUrl(product).slice(0, -1)) return { kind: 'order', product };
  }
  return { kind: 'missing' };
}

export function metadata(page) {
  if (page.kind === 'product') return {
    title: page.product.name + t(' masszázsfotel | MyRest'),
    description: page.product.description,
  };
  if (page.kind === 'order') return {
    title: t('Próbarendelés – ') + page.product.name + ' | MyRest',
    description: t('Banki átutalásos próbarendelés a MyRest bemutatófelületén.'),
  };
  if (page.kind === 'missing') return { title: t('Az oldal nem található | MyRest'), description: '' };
  return {
    title: t('MyRest | Masszázsfotelek az otthoni pihenéshez'),
    description: t('Ismerje meg a masszázsfoteleket, hasonlítsa össze a modelleket, és találja meg az otthonába illő fotelt.'),
  };
}
