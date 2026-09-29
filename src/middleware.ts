import { NextRequest, NextResponse } from 'next/server';

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

    return NextResponse.next();
}

export const config = {
    matcher: [{
        source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
        has: [{ type: 'header', key: 'rsc' }],
    }],
};
