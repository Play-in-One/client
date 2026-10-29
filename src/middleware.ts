import { NextRequest, NextResponse } from 'next/server';
import { CONSOLES_ENABLED } from '@/lib/features';

export function middleware(request: NextRequest) {
    if (!CONSOLES_ENABLED && request.nextUrl.pathname === '/search' && request.nextUrl.searchParams.get('category') === 'console') {
        const url = request.nextUrl.clone();
        const query = url.searchParams.get('q') || url.searchParams.get('search');
        url.search = '';
        if (query) url.searchParams.set('q', query);
        return NextResponse.redirect(url);
    }
    const currentDeployment = process.env.NEXT_DEPLOYMENT_ID;
    const clientDeployment = request.headers.get('x-deployment-id');

    if (request.headers.has('rsc') && currentDeployment && clientDeployment !== currentDeployment) {
        // Next.js 15 decodifica el RSC antes de comparar los build IDs. Un 409
        // hace que el router cargue el documento nuevo sin ejecutar sus módulos.
        return new NextResponse(null, {
            status: 409,
            headers: { 'Cache-Control': 'no-store' },
        });
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/search', {
        source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
        has: [{ type: 'header', key: 'rsc' }],
    }],
};
