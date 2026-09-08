import { FlatCompat } from '@eslint/eslintrc';

/**
 * Configuración de ESLint (flat config, la de ESLint 9).
 *
 * El proyecto nunca tuvo una: `npm run lint` ejecutaba `next lint`, que sin
 * configuración **abre un prompt interactivo** preguntando qué preset instalar.
 * Es decir, el comando no validaba nada —ni en local ni en CI— y se quedaba
 * colgado esperando una respuesta. Además `next lint` está deprecado y
 * desaparece en Next 16.
 *
 * `eslint-config-next` todavía publica su configuración en el formato antiguo,
 * así que se adapta con `FlatCompat` en vez de reescribir sus reglas a mano.
 */
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
    {
        ignores: [
            // Todo esto es salida de build o dependencias: lintar `.next_prebuild`
            // aportaba 1.800 avisos y 120 errores sobre bundles minificados, que
            // es exactamente el ruido que hace que nadie mire el lint.
            '.next/**',
            '.next_prebuild/**',
            'node_modules/**',
            'playwright-report/**',
            'test-results/**',
            'next-env.d.ts',
        ],
    },
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
        rules: {
            /* Arranca en `warn` a propósito. El objetivo de esta configuración
               es que el comando CORRA; convertir en error lo que ya está escrito
               dejaría el lint en rojo desde el primer día y volvería a no usarlo
               nadie. Se van subiendo a `error` a medida que se limpian. */
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
];
