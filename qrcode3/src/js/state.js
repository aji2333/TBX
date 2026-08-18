import { store } from './store.js';
import { history } from './history.js';

export const state = {
    DEFAULT_FIELD_DEFS: [],
    DEFAULT_QR_FORMAT: '',
    
    fieldDefs: [],
    batchRows: [],
    printLog: [],
    
    tabId: '',
    
    bartenderServiceUrl: 'http://localhost:8000',
    mappingCache: null,
    mappingTemplate: null,
    lookupCache: null,

    _restoring: false,

    init() {
        this.initSessionAndTab();
        store.init(this.tabId);
        store.updateTabRegistry();
        this.loadFieldDefs();
        this.loadBatchRows();
        this.loadPrintLog();
        this.loadLookupCache();
        this.loadServiceUrl();
        history.init(this.tabId, this.snapshot());
    },

    snapshot() {
        return {
            fieldDefs: JSON.parse(JSON.stringify(this.fieldDefs || [])),
            batchRows: JSON.parse(JSON.stringify(this.batchRows || []))
        };
    },

    recordHistory() {
        if (this._restoring) return;
        history.push(this.snapshot());
    },

    flushHistory() {
        history.flush();
    },

    restoreSnapshot(snap) {
        if (!snap) return;
        this._restoring = true;
        try {
            this.fieldDefs = Array.isArray(snap.fieldDefs) ? JSON.parse(JSON.stringify(snap.fieldDefs)) : [];
            this.batchRows = Array.isArray(snap.batchRows) ? JSON.parse(JSON.stringify(snap.batchRows)) : [];
            this.saveFieldDefs();
            this.saveBatchRows();
        } finally {
            this._restoring = false;
        }
    },

    undo() {
        const snap = history.undo();
        if (!snap) return null;
        this.restoreSnapshot(snap);
        return snap;
    },

    redo() {
        const snap = history.redo();
        if (!snap) return null;
        this.restoreSnapshot(snap);
        return snap;
    },

    canUndo() {
        return history.canUndo();
    },

    canRedo() {
        return history.canRedo();
    },
    
    initSessionAndTab() {
        var tabId = '';
        try {
            tabId = new URLSearchParams(window.location.search).get('tab') || '';
        } catch (e) { }
        if (!tabId) {
            tabId = Math.random().toString(36).slice(2, 8);
        }
        this.tabId = tabId;
        window.name = tabId;
        try {
            if (!new URLSearchParams(window.location.search).get('tab')) {
                var url = new URL(window.location.href);
                url.searchParams.set('tab', tabId);
                window.history.replaceState(null, '', url.toString());
            }
        } catch (e) { }
    },
    
    storageKey(base) {
        return 'bt_' + this.tabId + '_' + base;
    },
    
    loadFieldDefs() {
        var saved = store.getItem(this.storageKey('customFieldDefs'));
        if (saved) {
            try {
                this.fieldDefs = JSON.parse(saved);
                if (Array.isArray(this.fieldDefs) && this.fieldDefs.length > 0) return;
            } catch (e) { }
        }
        this.fieldDefs = [];
    },
    
    saveFieldDefs() {
        store.setItem(this.storageKey('customFieldDefs'), JSON.stringify(this.fieldDefs));
        this.recordHistory();
    },
    
    loadBatchRows() {
        const saved = store.getItem(this.storageKey('batchTableData'));
        if (saved) {
            try { this.batchRows = JSON.parse(saved); } catch (e) { this.batchRows = []; }
        } else {
            this.batchRows = [];
        }
    },
    
    saveBatchRows() {
        store.setItem(this.storageKey('batchTableData'), JSON.stringify(this.batchRows));
        this.recordHistory();
    },
    
    loadPrintLog() {
        var saved = store.getItem(this.storageKey('printLog'));
        if (saved) {
            try { this.printLog = JSON.parse(saved); } catch (e) { this.printLog = []; }
        } else {
            this.printLog = [];
        }
    },
    
    savePrintLog() {
        if (this.printLog.length > 100) this.printLog = this.printLog.slice(-100);
        store.setItem(this.storageKey('printLog'), JSON.stringify(this.printLog));
    },
    
    loadLookupCache() {
        try {
            var v = store.getItem(this.storageKey('lookupConfig'));
            this.lookupCache = v ? JSON.parse(v) : null;
        } catch (e) { this.lookupCache = null; }
    },
    
    saveLookupCache(data) {
        this.lookupCache = data;
        if (data) {
            store.setItem(this.storageKey('lookupConfig'), JSON.stringify(data));
        } else {
            store.removeItem(this.storageKey('lookupConfig'));
        }
    },
    
    loadServiceUrl() {
        this.bartenderServiceUrl = store.getItem('btServiceUrl') || 'http://localhost:8000';
    },
    
    getQrFormat() {
        return store.getItem(this.storageKey('qrFormat')) || this.DEFAULT_QR_FORMAT;
    },

    saveQrFormat(val) {
        store.setItem(this.storageKey('qrFormat'), val);
    },

    resetQrFormat() {
        store.setItem(this.storageKey('qrFormat'), this.DEFAULT_QR_FORMAT);
    }
};
