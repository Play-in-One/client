import { NextRequest, NextResponse } from 'next/server';
import { RSC_REQUEST_HEADER } from '@/lib/rscRequest';

export function middleware(request: NextRequest) {
    const currentDeployment = process.env.NEXT_DEPLOYMENT_ID;
    const clientDeployment = request.headers.get('x-deployment-id');

    if (currentDeployment && clientDeployment !== currentDeployment) {
        // Next.js 15 decodifica el RSC antes de comparar los build IDs. Un 409
        // hace que el router cargue el documento nuevo sin ejecutar sus módulos.
        return new NextResponse(null, {
            status: 409,
            headers: { 'Cache-Control': 'no-store' },
        });
    }

    // Solo llegan aquí peticiones RSC (ver el matcher), pero el render no lo
    // sabe: `headers()` no ve `rsc`. Ver `lib/rscRequest.ts`. Next vuelve a
    // poner sus cabeceras de vuelo después de este override.
    const headers = new Headers(request.headers);
    headers.set(RSC_REQUEST_HEADER, '1');
    return NextResponse.next({ request: { headers } });
}

// Next strips RSC headers before invoking middleware; detect them in the matcher.
export const config = {
    matcher: [{
        source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
        has: [{ type: 'header', key: 'rsc' }],
    }],
};
