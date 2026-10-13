'use client';

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { login as apiLogin, logout as apiLogout, setAdminToken, setOnAuthError } from '@/lib/api';

// localStorage (no sessionStorage): se comparte entre todas las pestañas/ventanas
// del mismo origen, de modo que abrir un juego en otra pestaña (ctrl+click)
// conserva la sesión de admin. sessionStorage es por-pestaña y no se hereda de
// forma fiable a nuevas ventanas, por lo que perdía los controles de edición.
const TOKEN_KEY = 'pio_admin_token';
const USER_KEY = 'pio_admin_user';
const PRODUCT_IMAGES_KEY = 'pio_staff_product_images';

interface AdminState {
    token: string | null;
    username: string | null;
    isAdmin: boolean;
    showProductImages: boolean;
    setShowProductImages: (enabled: boolean) => void;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
}

const AdminContext = createContext<AdminState | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [productImages, setProductImages] = useState(false);
    const setShowProductImages = (enabled: boolean) => {
        setProductImages(enabled);
        try { window.localStorage.setItem(PRODUCT_IMAGES_KEY, String(enabled)); } catch { /* no persistence */ }
    };

    // Rehidratar tras montar (evita desajuste SSR/cliente en la hidratación).
    useEffect(() => {
        try {
            const t = window.localStorage.getItem(TOKEN_KEY);
            const u = window.localStorage.getItem(USER_KEY);
            setProductImages(window.localStorage.getItem(PRODUCT_IMAGES_KEY) === 'true');
            if (t) {
                setToken(t);
                setUsername(u);
                setAdminToken(t); // sincroniza el punto único de inyección en api.ts
            }
        } catch {
            // localStorage no disponible — se queda anónimo
        }
    }, []);

    // Sincroniza login/logout entre pestañas: el evento 'storage' se dispara en
    // las OTRAS pestañas del mismo origen cuando cambia localStorage.
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === PRODUCT_IMAGES_KEY || e.key === null) {
                setProductImages(e.key === null ? false : e.newValue === 'true');
                if (e.key !== null) return;
            }
            if (e.key !== TOKEN_KEY && e.key !== null) return;
            const t = e.newValue;
            setToken(t);
            try { setUsername(t ? window.localStorage.getItem(USER_KEY) : null); } catch { setUsername(null); }
            setAdminToken(t);
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    // Limpia el estado local (sin llamar al backend). Reutilizado por logout() y
    // por el handler de sesión inválida.
    const clearSession = () => {
        setToken(null);
        setUsername(null);
        setAdminToken(null);
        try {
            window.localStorage.removeItem(TOKEN_KEY);
            window.localStorage.removeItem(USER_KEY);
        } catch {
            // ignore
        }
    };

    // Si api.ts detecta que una petición autenticada fue denegada (token
    // expirado/revocado), desloguea de forma transparente.
    useEffect(() => {
        setOnAuthError(clearSession);
        return () => setOnAuthError(null);
    }, []);

    const login = async (user: string, password: string) => {
        const res = await apiLogin(user, password);
        setToken(res.token);
        setUsername(res.username);
        setAdminToken(res.token);
        try {
            window.localStorage.setItem(TOKEN_KEY, res.token);
            window.localStorage.setItem(USER_KEY, res.username);
        } catch {
            // sin persistencia: la sesión sigue válida en memoria para esta pestaña
        }
    };

    const logout = () => {
        // Invalida el token en el backend (best-effort) antes de olvidarlo.
        apiLogout().catch(() => {});
        clearSession();
    };

    return (
        <AdminContext.Provider
            value={{ token, username, isAdmin: !!token, showProductImages: !!token && productImages, setShowProductImages, login, logout }}
        >
            {children}
        </AdminContext.Provider>
    );
}

const noopSubscribe = () => () => {};

export function useAdmin() {
    const ctx = useContext(AdminContext);
    if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
    // El provider lee el token en un efecto, pero un boundary <Suspense> (la
    // ficha de juego, por useSearchParams) puede hidratarse DESPUÉS de ese
    // efecto: leería `isAdmin: true` mientras el HTML del servidor se pintó
    // anónimo, y React descarta el árbol ("Hydration failed"). `hydrated` vale
    // false durante la hidratación de ESTE componente y true después, así que
    // el primer render siempre coincide con el servidor.
    const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
    if (hydrated) return ctx;
    return { ...ctx, token: null, username: null, isAdmin: false, showProductImages: false };
}
