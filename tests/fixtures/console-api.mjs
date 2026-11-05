// Local-only HTTP fixture: SSR and browser requests use the same deterministic catalog.
// Mirrors the backend's draft rule: unless CONSOLE_FIXTURE_PUBLISHED=1 the model
// is a draft, visible only to requests that carry the staff token.
import { createServer } from 'node:http';

const STAFF_TOKEN = 'Token staff-test-token';
const published = process.env.CONSOLE_FIXTURE_PUBLISHED === '1';

const platform = { id: 5, name: 'ps5', slug: 'ps5', display_name: 'PS5', long_name: 'PlayStation 5', family: 'playstation', order: 12 };
const seller = { id: 77, name: 'Tienda Consolas', url: 'https://example.com', logo: '', location: 'national',
    shipping_cost: '3000', has_agreement: false, coupon_code: '', coupon_discount_percent: null, is_international: false };
const configurations = [
    { id: 11, console: 981, edition: 1, edition_name: 'Estándar', storage_gb: 1000, storage_label: '1 TB', games: [] },
    { id: 12, console: 981, edition: 2, edition_name: 'Azul', storage_gb: 2000, storage_label: '2 TB',
        games: [{ title: 'Juego de aventura', format: 'code', game: null }, { title: 'Juego de carreras', format: 'physical', game: null }] },
    { id: 13, console: 981, edition: 1, edition_name: 'Estándar', storage_gb: 1000, storage_label: '1 TB',
        games: [{ title: 'Juego de deportes', format: 'code', game: null }] },
    { id: 14, console: 981, edition: 2, edition_name: 'Azul', storage_gb: 1000, storage_label: '1 TB',
        games: [{ title: 'Juego de plataformas', format: 'unknown', game: null }] },
    { id: 15, console: 981, edition: 1, edition_name: 'Estándar', storage_gb: 2000, storage_label: '2 TB',
        games: [{ title: 'Juego de peleas', format: 'physical', game: null }] },
];
const offer = (id, configuration, title, condition, price, inStock = true) => ({
    id, category: 'console', configuration, title, platform, seller, condition, game: null,
    current_price: `${price}.00`, base_price: `${price - 3000}.00`, shipping_cost: '3000.00', in_stock: inStock, image: '',
    url: `https://example.com/${id}`, affiliate_url: '', rating: null,
});
const products = [
    offer(991, 11, 'PS5 Slim 1 TB', 'new', 503000),
    offer(992, 12, 'PS5 Slim Azul pack 2 TB', 'used', 453000),
    offer(993, 11, 'Oferta agotada', 'new', 400000, false),
    offer(994, 13, 'PS5 Slim + Juego de deportes', 'new', 523000),
];
const consoleModel = { id: 981, name: 'PS5 Slim', slug: 'ps5-slim', platform, image: '', is_published: published,
    description: 'Modelo de prueba para comparar capacidades y packs.' };
const empty = { count: 0, next: null, previous: null, results: [] };

const live = list => list.filter(p => p.in_stock && Number(p.current_price) > 0);
const minimum = list => live(list).length ? String(Math.min(...live(list).map(p => Number(p.current_price)))) : null;

createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'OPTIONS') { res.end(); return; }
    const url = new URL(req.url, 'http://localhost');
    const send = (data, status = 200) => { res.statusCode = status; res.end(JSON.stringify(data)); };
    const staff = req.headers.authorization === STAFF_TOKEN;
    if (req.headers.authorization && !staff) return send({ detail: 'Token inválido.' }, 401);
    if (url.pathname === '/api/health/') return send({ ok: true });
    if (url.pathname === '/api/consoles/' || url.pathname === '/api/consoles/981/') {
        const visible = published || staff;
        const q = url.searchParams;
        const condition = p => !q.get('condition') || p.condition === q.get('condition');
        const location = () => !q.get('seller_locations') || q.get('seller_locations').includes('national');
        let offers = products.filter(p => {
            const c = configurations.find(c => c.id === p.configuration);
            return (!q.get('configuration') || c.id === Number(q.get('configuration')))
                && (!q.get('edition') || c.edition === Number(q.get('edition')))
                && (!q.get('storage_gb') || c.storage_gb === Number(q.get('storage_gb')))
                && condition(p)
                && (!q.has('has_game') || Boolean(c.games.length) === (q.get('has_game') === 'true'))
                && location();
        });
        if ((q.get('platform') && q.get('platform') !== 'ps5') || (q.get('search') && !consoleModel.name.toLowerCase().includes(q.get('search').toLowerCase()))) offers = [];
        const min = minimum(offers);
        const model = { ...consoleModel, min_price: min, seller_count: min ? 1 : 0, in_stock: min !== null,
            pack_count: new Set(live(offers).map(p => p.configuration)).size,
            image: products.find(p => p.image)?.image ?? '' };
        if (url.pathname.endsWith('/981/')) {
            if (!visible) return send({ detail: 'No encontrado.' }, 404);
            // Pack summaries follow condition and location only, like the backend.
            const packs = configurations.map(c => {
                const own = products.filter(p => p.configuration === c.id && condition(p) && location());
                const price = minimum(own);
                return { ...c, min_price: price, seller_count: price ? 1 : 0, offer_count: live(own).length, in_stock: price !== null };
            });
            return send({ ...model, configurations: packs, products: offers });
        }
        const listed = visible && offers.length > 0;
        return send({ ...empty, count: listed ? 1 : 0, results: listed ? [model] : [] });
    }
    if (url.pathname.startsWith('/api/consoles/')) return send({ detail: 'Not found' }, 404);
    if (url.pathname === '/api/platforms/') return send({ ...empty, count: 1, results: [platform] });
    // The PS5 landing's first page: the console detail shows its total as the games counter.
    if (url.pathname === '/api/games/' && url.searchParams.get('platforms') === '5') return send({ ...empty, count: 1234 });
    if (url.pathname === '/api/products/991/') return send(products[0]);
    if (url.pathname === '/api/sellers/77/') return send({ ...seller, description: 'Tienda de prueba', addresses: [] });
    if (url.pathname === '/api/sellers/') return send({ ...empty, count: 1, results: [seller] });
    if (req.method === 'POST') return send({ id: 1 }, 201);
    return send(empty);
}).listen(43210, '127.0.0.1');
