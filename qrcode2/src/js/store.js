export const store = {
    _tabId: '',

    init(tabId) {
        this._tabId = tabId || '';
    },

    getItem(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    },

    setItem(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { }
    },

    removeItem(key) {
        try { localStorage.removeItem(key); } catch (e) { }
    },

    updateTabRegistry() {
        if (!this._tabId) return;
        try {
            var list = {};
            try { list = JSON.parse(localStorage.getItem('bt_tabList') || '{}'); } catch (e) { }
            list[this._tabId] = Date.now();
            localStorage.setItem('bt_tabList', JSON.stringify(list));
        } catch (e) { }
    },

    loadTabState(tabId) {
        const prefix = 'bt_' + tabId + '_';
        const data = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.indexOf(prefix) === 0) {
                    data[k.substring(prefix.length)] = localStorage.getItem(k);
                }
            }
        } catch (e) { }
        return data;
    },

    listTabs() {
        try {
            const list = JSON.parse(localStorage.getItem('bt_tabList') || '{}');
            return Object.keys(list)
                .filter((tabId) => tabId.indexOf('_') < 0)
                .map((tabId) => ({ tabId, updatedAt: list[tabId] }));
        } catch (e) { return []; }
    }
};
