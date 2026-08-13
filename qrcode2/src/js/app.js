import { state } from './state.js';
import { ui } from './ui.js';

window.addEventListener('DOMContentLoaded', () => {
    state.init();
    ui.init();
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
}
