import { createHmac, randomUUID } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';

import {
    CONSENT_COOKIE,
    CONSENT_MAX_AGE_SECONDS,
    POLICY_VERSION,
    VISITOR_COOKIE,
    buildConsent,
    type ConsentChoice,
} from '@/lib/consent';

/* Punto único donde se decide si alguien es medible.
 *
 * Vive en Next y no en Django por dos razones. Es same-origin, así que la
 * cookie `pio_vid` se emite como cookie propia del sitio —las que los
 * navegadores conservan— en vez de una cookie de otro dominio, que Safari
 * y Firefox bloquean de fábrica. Y el secreto de firma se queda en el
 * servidor: si el identificador lo generase el navegador, cualquiera podría
 * fabricarse los que quisiera e inflar el conteo de visitantes.
 *
 * POST   /api/consent   { choice: 'accept' | 'essential' | 'reject-all', method? }
 * DELETE /api/consent   → ejerce el derecho de supresión y borra las cookies
 */

const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api';

/** Réplica exacta de `analytics/identity.py`: HMAC(HMAC(secreto, "pio:vid"), uuid). */
function signVisitorId(visitorId: string, secret: string): string {
    const key = createHmac('sha256', secret).update('pio:vid').digest();
    const signature = createHmac('sha256', key).update(visitorId).digest('hex').slice(0, 32);
    return `${visitorId}.${signature}`;
}

function secret(): string | null {
    return process.env.VISITOR_ID_SECRET || process.env.SECRET_KEY || null;
}

/* La IP y el navegador del VISITANTE, no los del servidor de Next. Django los
 * usa para el hash diario y para la huella del consentimiento; sin reenviarlos,
 * todo el tráfico parecería venir de una sola máquina. */
function forwardedHeaders(request: NextRequest): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const forwardedFor = request.headers.get('x-forwarded-for');
    const userAgent = request.headers.get('user-agent');
    const country = request.headers.get('cf-ipcountry');
    if (forwardedFor) headers['X-Forwarded-For'] = forwardedFor;
    if (userAgent) headers['User-Agent'] = userAgent;
    if (country) headers['CF-IPCountry'] = country;
    return headers;
}

/** El registro en Django es la prueba del consentimiento, pero no puede
 *  bloquear la respuesta: si la API está caída, la preferencia del visitante
 *  se respeta igual — es su decisión, no la nuestra. */
async function recordServerSide(
    request: NextRequest,
    body: Record<string, unknown>,
): Promise<void> {
    try {
        await fetch(`${API_BASE}/consent/`, {
            method: 'POST',
            headers: forwardedHeaders(request),
            body: JSON.stringify(body),
            cache: 'no-store',
        });
    } catch {
        /* nunca romper la UI por el registro de auditoría */
    }
}

export async function POST(request: NextRequest) {
    let choice: ConsentChoice = 'essential';
    let method = 'banner';
    try {
        const body = await request.json();
        if (body?.choice === 'accept' || body?.choice === 'reject-all') choice = body.choice;
        if (body?.method === 'settings') method = 'settings';
    } catch {
        /* sin cuerpo válido se asume la opción mínima, nunca la que más mide */
    }

    const state = buildConsent(choice);
    const signingSecret = secret();
    const existingToken = request.cookies.get(VISITOR_COOKIE)?.value ?? '';

    // Se reutiliza el token que ya tuviera: quien acepta, rechaza y vuelve a
    // aceptar sigue siendo el mismo visitante y no un tercer visitante nuevo.
    let visitorToken = '';
    if (state.analytics && signingSecret) {
        visitorToken = existingToken || signVisitorId(randomUUID(), signingSecret);
    }

    await recordServerSide(request, {
        policy_version: POLICY_VERSION,
        analytics: state.analytics,
        method,
        visitor_id: visitorToken || existingToken,
    });

    const response = NextResponse.json({ consent: state, visitorId: visitorToken || null });
    const cookieOptions = {
        maxAge: CONSENT_MAX_AGE_SECONDS,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        // Legibles por JS a propósito. La preferencia la lee el banner antes
        // de que React hidrate, para no parpadear en cada carga; el token lo
        // adjunta el beacon al cuerpo, porque en desarrollo el frontend y la
        // API están en sitios distintos y ninguna cookie viajaría sola. Lo que
        // protege al token es la firma, no el flag HttpOnly.
        httpOnly: false,
    };

    response.cookies.set(CONSENT_COOKIE, JSON.stringify(state), cookieOptions);
    if (visitorToken) {
        response.cookies.set(VISITOR_COOKIE, visitorToken, cookieOptions);
    } else {
        response.cookies.delete(VISITOR_COOKIE);
    }
    return response;
}

export async function DELETE(request: NextRequest) {
    const visitorToken = request.cookies.get(VISITOR_COOKIE)?.value ?? '';
    let deleted = false;

    if (visitorToken) {
        try {
            const upstream = await fetch(`${API_BASE}/me/data/`, {
                method: 'DELETE',
                headers: { ...forwardedHeaders(request), 'X-PIO-Visitor': visitorToken },
                cache: 'no-store',
            });
            deleted = upstream.ok;
        } catch {
            deleted = false;
        }
    }

    // Las cookies se borran pase lo que pase: aunque el backend no responda,
    // el navegador deja de identificarse a partir de ahora.
    const response = NextResponse.json({ deleted });
    response.cookies.delete(VISITOR_COOKIE);
    response.cookies.delete(CONSENT_COOKIE);
    return response;
}
