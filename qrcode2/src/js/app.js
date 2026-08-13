import { state } from './state.js';
import { ui } from './ui.js';

window.addEventListener('DOMContentLoaded', () => {
    state.init();
    ui.init();
});
