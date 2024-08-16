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

        acent: {
          1: 'var(--acent-1)',
          2: 'var(--acent-2)',
        },

        pc: {
          1: 'var(--pc-1)',
          2: 'var(--pc-2)',
        },

        ps4: {
          1: 'var(--ps4-1)',
          2: 'var(--ps4-2)',
        },

        ps5: {
          1: 'var(--ps5-1)',
          2: 'var(--ps5-2)',
        },

        xbox: {
          1: 'var(--xbox-1)',
          2: 'var(--xbox-2)',
        },

        switch: {
          1: 'var(--switch-1)',
          2: 'var(--switch-2)',
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

      borderColor: {
        1: 'var(--border-1)',
        2: 'var(--border-2)',
      },

      borderWidth : {
        1: 'var(--border-width-1)',
      },

      borderRadius: {
        1: 'var(--border-radius-1)',
      },

    },
  },
  plugins: [],
}

