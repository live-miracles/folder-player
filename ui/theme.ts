// Light / dark theme. Dark is the default; the toggle button on the home header switches
// and the last choice is remembered. The palette itself lives in input.css; this only sets
// data-theme on <html>. A copy of the read logic runs from a <script> in index.html's <head>
// so the first paint already has the right theme; keep the two in step.

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const toggleBtn = document.getElementById('theme-toggle-btn')!;

function getTheme(): Theme {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
    document.documentElement.dataset.theme = theme;
    const next = theme === 'light' ? 'dark' : 'light';
    toggleBtn.title = `Switch to ${next} theme`;
    toggleBtn.setAttribute('aria-label', `Switch to ${next} theme`);
}

toggleBtn.addEventListener('click', () => {
    const next: Theme = getTheme() === 'light' ? 'dark' : 'light';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
});

applyTheme(getTheme());
