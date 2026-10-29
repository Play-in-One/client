// Local-only HTTP fixture: SSR and browser requests use the same deterministic catalog.
import { createServer } from 'node:http';

const platform = { id: 5, name: 'ps5', slug: 'ps5', display_name: 'PS5', long_name: 'PlayStation 5', family: 'playstation', order: 12 };
const seller = { id: 77, name: 'Tienda Consolas', url: 'https://example.com', logo: '', location: 'national',
    shipping_cost: '3000', has_agreement: false, coupon_code: '', coupon_discount_percent: null, is_international: false };
const configurations = [
    { id: 11, console: 981, edition: 1, edition_name: 'Estándar', storage_gb: 1000, storage_label: '1 TB', games: [] },
    { id: 12, console: 981, edition: 2, edition_name: 'Azul', storage_gb: 2000, storage_label: '2 TB',
        games: [{ title: 'Juego de aventura', format: 'code', game: null }, { title: 'Juego de carreras', format: 'physical', game: null }] },
];
const products = [
    { id: 991, category: 'console', configuration: 11, title: 'PS5 Slim 1 TB', platform, seller, condition: 'new', game: null,
        current_price: '503000.00', base_price: '500000.00', shipping_cost: '3000.00', in_stock: true, image: '',
        url: 'https://example.com/console', affiliate_url: '', rating: null },
    { id: 992, category: 'console', configuration: 12, title: 'PS5 Slim Azul pack 2 TB', platform, seller, condition: 'used', game: null,
        current_price: '453000.00', base_price: '450000.00', shipping_cost: '3000.00', in_stock: true, image: '',
        url: 'https://example.com/pack', affiliate_url: '', rating: null },
    { id: 993, category: 'console', configuration: 11, title: 'Oferta agotada', platform, seller, condition: 'new', game: null,
        current_price: '400000.00', base_price: '397000.00', shipping_cost: '3000.00', in_stock: false, image: '',
        url: 'https://example.com/retired', affiliate_url: '', rating: null },
];
const consoleModel = { id: 981, name: 'PS5 Slim', slug: 'ps5-slim', platform, image: '',
    description: 'Modelo de prueba para comparar capacidades y packs.', min_price: '453000.00', seller_count: 1, in_stock: true };
const empty = { count: 0, next: null, previous: null, results: [] };

createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'OPTIONS') { res.end(); return; }
    const url = new URL(req.url, 'http://localhost');
    const send = (data, status = 200) => { res.statusCode = status; res.end(JSON.stringify(data)); };
    if (url.pathname === '/api/health/') return send({ ok: true });
    if (url.pathname === '/api/consoles/' || url.pathname === '/api/consoles/981/') {
        const q = url.searchParams;
        let offers = products.filter(p => {
            const c = configurations.find(c => c.id === p.configuration);
            return (!q.get('configuration') || c.id === Number(q.get('configuration')))
                && (!q.get('edition') || c.edition === Number(q.get('edition')))
                && (!q.get('storage_gb') || c.storage_gb === Number(q.get('storage_gb')))
                && (!q.get('condition') || p.condition === q.get('condition'))
                && (!q.has('has_game') || Boolean(c.games.length) === (q.get('has_game') === 'true'))
                && (!q.get('seller_locations') || q.get('seller_locations').includes('national'));
        });
        if ((q.get('platform') && q.get('platform') !== 'ps5') || (q.get('search') && !consoleModel.name.toLowerCase().includes(q.get('search').toLowerCase()))) offers = [];
        const prices = offers.filter(p => p.in_stock).map(p => Number(p.current_price));
        const model = { ...consoleModel, min_price: prices.length ? String(Math.min(...prices)) : null,
            seller_count: prices.length ? 1 : 0, in_stock: prices.length > 0 };
        if (url.pathname.endsWith('/981/')) return send({ ...model, configurations, products: offers });
        return send({ ...empty, count: offers.length ? 1 : 0, results: offers.length ? [model] : [] });
    }
    if (url.pathname.startsWith('/api/consoles/')) return send({ detail: 'Not found' }, 404);
    if (url.pathname === '/api/platforms/') return send({ ...empty, count: 1, results: [platform] });
    if (url.pathname === '/api/products/991/') return send(products[0]);
    if (url.pathname === '/api/sellers/77/') return send({ ...seller, description: 'Tienda de prueba', addresses: [] });
    if (url.pathname === '/api/sellers/') return send({ ...empty, count: 1, results: [seller] });
    if (req.method === 'POST') return send({ id: 1 }, 201);
    return send(empty);
}).listen(43210, '127.0.0.1');
