/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        object: {
          1: 'var(--object-1)',
          2: 'var(--object-2)',
        },
        border: {
          1: 'var(--border-1)',
          2: 'var(--border-2)',
        },
      },

      textColor: {
        1: 'var(--text-1)',
        2: 'var(--text-2)',
        3: 'var(--text-3)',
      },

      backgroundColor: {
        1: 'var(--bg-1)',
        2: 'var(--bg-2)',
        3: 'var(--bg-3)',
        4: 'var(--bg-4)',
      },

    },
  },
  plugins: [],
}

