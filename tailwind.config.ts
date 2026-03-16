import type { Config } from 'tailwindcss';

export default {
    darkMode: ['class', '.dark'],
    content: ['./index.html', './renderer/**/*.{ts,tsx}'],
    theme: {
        extend: {},
    },
    plugins: [],
} satisfies Config;
