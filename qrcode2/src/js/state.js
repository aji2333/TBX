export const state = {
    DEFAULT_FIELD_DEFS: [],
    DEFAULT_QR_FORMAT: '',
    
    fieldDefs: [],
    batchRows: [],
    printLog: [],
    
    sessionId: '',
    tabId: '',
    isNewTab: false,
    
    bartenderServiceUrl: 'http://localhost:8000',
    mappingCache: null,
    mappingTemplate: null,
    lookupCache: null,

    init() {
        this.initSessionAndTab();
        this.updateTabRegistry();
        this.loadFieldDefs();
        this.loadBatchRows();
        this.loadPrintLog();
        this.loadLookupCache();
        this.loadServiceUrl();
    },
    
    initSessionAndTab() {
        try { this.sessionId = localStorage.getItem('bt_lastSession') || ''; } catch (e) { }
        if (!this.sessionId) {
            this.sessionId = Date.now().toString(36);
            try { localStorage.setItem('bt_lastSession', this.sessionId); } catch (e) { }
        }

        this.tabId = window.name || '';
        var fresh = false;
        try {
            var nav = performance.getEntriesByType('navigation');
            if (nav && nav.length && nav[0].type === 'navigate') fresh = true;
        } catch (e) { }
        if (!this.tabId || fresh) {
            this.tabId = Math.random().toString(36).slice(2, 8);
        }
        window.name = this.tabId;
        this.isNewTab = fresh;
    },
    
    storageKey(base) {
        return 'bt_' + this.sessionId + '_' + this.tabId + '_' + base;
    },
    
    latestTabId() {
        var list = {};
        try { list = JSON.parse(localStorage.getItem('bt_tabList') || '{}'); } catch (e) {}
        var myKey = this.sessionId + '_' + this.tabId;
        var latest = null;
        var latestTs = 0;
        for (var id in list) {
            if (id === myKey) continue;
            if (list[id] > latestTs) {
                latestTs = list[id];
                latest = id;
            }
        }
        return latest;
    },
    
    updateTabRegistry() {
        var list = {};
        try { list = JSON.parse(localStorage.getItem('bt_tabList') || '{}'); } catch (e) {}
        list[this.sessionId + '_' + this.tabId] = Date.now();
        var cutoff = Date.now() - 30 * 24 * 3600 * 1000;
        for (var id in list) {
            if (list[id] < cutoff) {
                delete list[id];
                var prefix = 'bt_' + id + '_';
                var toRemove = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var mk = localStorage.key(i);
                    if (mk && mk.indexOf(prefix) === 0) toRemove.push(mk);
                }
                toRemove.forEach(function (k) { localStorage.removeItem(k); });
            }
        }
        localStorage.setItem('bt_tabList', JSON.stringify(list));
    },
    
    loadFieldDefs() {
        var saved = localStorage.getItem(this.storageKey('customFieldDefs'));
        if (saved) {
            try {
                this.fieldDefs = JSON.parse(saved);
                if (Array.isArray(this.fieldDefs) && this.fieldDefs.length > 0) return;
            } catch (e) { }
        }
        this.fieldDefs = [];
    },
    
    saveFieldDefs() {
        localStorage.setItem(this.storageKey('customFieldDefs'), JSON.stringify(this.fieldDefs));
    },
    
    loadBatchRows() {
        const saved = localStorage.getItem(this.storageKey('batchTableData'));
        if (saved) {
            try { this.batchRows = JSON.parse(saved); } catch (e) { this.batchRows = []; }
        } else {
            this.batchRows = [];
        }
    },
    
    saveBatchRows() {
        localStorage.setItem(this.storageKey('batchTableData'), JSON.stringify(this.batchRows));
    },
    
    loadPrintLog() {
        var saved = localStorage.getItem(this.storageKey('printLog'));
        if (saved) {
            try { this.printLog = JSON.parse(saved); } catch (e) { this.printLog = []; }
        } else {
            this.printLog = [];
        }
    },
    
    savePrintLog() {
        if (this.printLog.length > 100) this.printLog = this.printLog.slice(-100);
        localStorage.setItem(this.storageKey('printLog'), JSON.stringify(this.printLog));
    },
    
    loadLookupCache() {
        try {
            var v = localStorage.getItem(this.storageKey('lookupConfig'));
            this.lookupCache = v ? JSON.parse(v) : null;
        } catch (e) { this.lookupCache = null; }
    },
    
    saveLookupCache(data) {
        this.lookupCache = data;
        if (data) {
            localStorage.setItem(this.storageKey('lookupConfig'), JSON.stringify(data));
        } else {
            localStorage.removeItem(this.storageKey('lookupConfig'));
        }
    },
    
    loadServiceUrl() {
        this.bartenderServiceUrl = localStorage.getItem(this.storageKey('btServiceUrl')) || 'http://localhost:8000';
    },
    
    saveServiceUrl(url) {
        this.bartenderServiceUrl = url;
        localStorage.setItem(this.storageKey('btServiceUrl'), url);
    },

    getQrFormat() {
        return localStorage.getItem(this.storageKey('qrFormat')) || this.DEFAULT_QR_FORMAT;
    },

    saveQrFormat(val) {
        localStorage.setItem(this.storageKey('qrFormat'), val);
    },

    resetQrFormat() {
        localStorage.setItem(this.storageKey('qrFormat'), this.DEFAULT_QR_FORMAT);
    }
};
