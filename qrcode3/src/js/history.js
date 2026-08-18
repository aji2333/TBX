import { store } from './store.js';

export const history = {
    MAX_STACK: 100,

    _tabId: '',
    _past: [],
    _future: [],
    _present: null,
    _pending: null,
    _flushTimer: null,

    init(tabId, initialSnapshot) {
        this._tabId = tabId || '';
        this._past = [];
        this._future = [];
        this._present = null;
        this._pending = null;
        this._flushTimer = null;
        this._load();
        this._present = initialSnapshot || this._present;
        this._save();
    },

    storageKey() {
        return 'bt_' + this._tabId + '_history';
    },

    push(snapshot) {
        this._pending = snapshot;
        if (!this._flushTimer) {
            this._flushTimer = setTimeout(() => this._flush(), 0);
        }
    },

    _commit(snapshot) {
        if (!snapshot) return;
        if (this._present && this._same(snapshot, this._present)) return;
        if (this._present) {
            this._past.push(this._present);
            if (this._past.length > this.MAX_STACK) this._past.shift();
        }
        this._future = [];
        this._present = snapshot;
        this._save();
    },

    _same(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    },

    _flush() {
        if (this._flushTimer) {
            clearTimeout(this._flushTimer);
            this._flushTimer = null;
            this._commit(this._pending);
            this._pending = null;
        }
    },

    flush() {
        this._flush();
    },

    undo() {
        this._flush();
        if (this._past.length === 0) return null;
        this._future.unshift(this._present);
        this._present = this._past.pop();
        this._save();
        return this._present;
    },

    redo() {
        this._flush();
        if (this._future.length === 0) return null;
        this._past.push(this._present);
        this._present = this._future.shift();
        this._save();
        return this._present;
    },

    canUndo() {
        this._flush();
        return this._past.length > 0;
    },

    canRedo() {
        this._flush();
        return this._future.length > 0;
    },

    reset() {
        this._flush();
        this._past = [];
        this._future = [];
        this._present = null;
        this._save();
    },

    _save() {
        store.setSessionItem(this.storageKey(), JSON.stringify({
            past: this._past,
            future: this._future,
            present: this._present
        }));
    },

    _load() {
        try {
            const raw = store.getSessionItem(this.storageKey());
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data && Array.isArray(data.past) && Array.isArray(data.future)) {
                this._past = data.past;
                this._future = data.future;
                this._present = data.present || null;
            }
        } catch (e) { }
    }
};
