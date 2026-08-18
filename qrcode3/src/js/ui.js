import { state } from './state.js';
import { store } from './store.js';
import * as api from './api.js';
import * as utils from './utils.js';

export const ui = {
    selectedImportTabId: null,
    selectedBatchRow: -1,
    selectedBatchCol: -1,
    _cellEditMode: false,
    _cellEditOriginalValue: '',
    templates: [],
    overlayZ: 3000,
    _toastTimer: null,
    showOverlay(id) {
        this.overlayZ += 1;
        const el = document.getElementById(id);
        if (el) {
            el.style.zIndex = this.overlayZ;
            el.style.display = 'flex';
        }
    },

    init() {
        this.bindEvents();
        this.refreshAll();
        this.refreshTemplates();
        this.refreshConfigs();
        this.restoreBartenderSettings();
        this.onDefaultPrinterChange();
    },

    bindEvents() {
        // Config & settings
        document.getElementById('configSelect').addEventListener('change', (e) => {
            this.loadConfig(e.target.value);
        });
        document.getElementById('refreshConfigsBtn').addEventListener('click', () => {
            this.refreshConfigs();
        });
        document.getElementById('openFieldSettingsBtn').addEventListener('click', () => {
            this.openFieldSettings();
        });
        document.getElementById('closeFieldSettingsBtn').addEventListener('click', () => {
            this.closeFieldSettings();
        });
        document.getElementById('closeFieldSettingsDoneBtn').addEventListener('click', () => {
            this.closeFieldSettings();
        });
        document.getElementById('addFieldDefBtn').addEventListener('click', () => {
            this.addFieldDef();
        });
        document.getElementById('resetFieldDefsBtn').addEventListener('click', () => {
            this.resetFieldDefs();
        });
        document.getElementById('importFieldDefsBtn').addEventListener('click', () => {
            this.importFieldDefs();
        });
        document.getElementById('exportFieldDefsBtn').addEventListener('click', () => {
            this.exportFieldDefs();
        });

        // Entry Form buttons
        document.getElementById('saveToBatchBtn').addEventListener('click', () => {
            this.saveToBatch();
        });
        document.getElementById('clearEntryFormBtn').addEventListener('click', () => {
            this.clearEntryForm();
        });

        // Batch Table panel buttons
        document.getElementById('zoomBtn').addEventListener('click', () => {
            this.toggleBatchZoom();
        });
        document.getElementById('zoomOverlay').addEventListener('click', () => {
            this.toggleBatchZoom();
        });
        document.getElementById('addBatchRowBtn').addEventListener('click', () => {
            this.addBatchRow();
        });
        document.getElementById('autoGenerateBtn').addEventListener('click', () => {
            this.autoGenerate();
        });
        document.getElementById('clearBatchTableBtn').addEventListener('click', () => {
            this.clearBatchTable();
        });
        document.getElementById('batchSendToBartenderBtn').addEventListener('click', () => {
            this.batchSendToBartender();
        });

        // BarTender printing settings
        document.getElementById('btUseDefaultPrinter').addEventListener('change', () => {
            this.onDefaultPrinterChange();
        });
        document.getElementById('btTemplateSelect').addEventListener('change', () => {
            this.onTemplateChange();
        });
        document.getElementById('refreshTemplatesBtn').addEventListener('click', () => {
            this.refreshTemplates();
        });
        document.getElementById('btMappingBtn').addEventListener('click', () => {
            this.toggleMappingPanel();
        });

        // Mapping Panel actions
        document.getElementById('addMappingFieldBtn').addEventListener('click', () => {
            this.addMappingField();
        });
        document.getElementById('saveFieldMappingBtn').addEventListener('click', () => {
            this.saveFieldMapping();
        });
        document.getElementById('importMappingBtn').addEventListener('click', () => {
            this.importMapping();
        });
        document.getElementById('exportMappingBtn').addEventListener('click', () => {
            this.exportMapping();
        });
        document.getElementById('resetFieldMappingBtn').addEventListener('click', () => {
            this.resetFieldMapping();
        });

        // Main Print Buttons
        document.getElementById('btPrintBtn').addEventListener('click', () => {
            this.singleSendToBartender();
        });
        document.getElementById('btBatchBtn').addEventListener('click', () => {
            this.batchSendToBartender();
        });
        document.getElementById('clearPrintLogBtn').addEventListener('click', () => {
            this.clearPrintLog();
        });

        // Tab Import overlay
        document.getElementById('closeTabImportBtn').addEventListener('click', () => {
            this.closeTabImport();
        });
        document.getElementById('tabImportConfirmBtn').addEventListener('click', () => {
            this.importAllFromTab();
        });
        document.getElementById('showTabImportBtn').addEventListener('click', () => {
            this.showTabImport();
        });
        document.getElementById('closeTabImportCancelBtn').addEventListener('click', () => {
            this.closeTabImport();
        });

        // Config Textareas
        document.getElementById('qrFormatInput').addEventListener('change', () => {
            this.saveQrFormat();
        });
        document.getElementById('resetQrFormatBtn').addEventListener('click', () => {
            this.resetQrFormat();
        });
        document.getElementById('previewQrFormatBtn').addEventListener('click', () => {
            this.previewQrFormat();
        });
        document.getElementById('importQrFormatBtn').addEventListener('click', () => {
            this.importQrFormat();
        });
        document.getElementById('exportQrFormatBtn').addEventListener('click', () => {
            this.exportQrFormat();
        });
        document.getElementById('importLookupBtn').addEventListener('click', () => {
            this.importLookup();
        });
        document.getElementById('exportLookupBtn').addEventListener('click', () => {
            this.exportLookup();
        });
        document.getElementById('lookupInput').addEventListener('change', () => {
            this.saveLookupConfig();
        });

        // Event delegation for Field Settings list
        const fieldDefList = document.getElementById('fieldDefList');
        fieldDefList.addEventListener('change', (e) => {
            const item = e.target.closest('.field-def-item');
            if (!item) return;
            const index = parseInt(item.getAttribute('data-index'));
            if (e.target.classList.contains('fd-key')) {
                this.updateFieldDef(index, 'key', e.target.value);
            } else if (e.target.classList.contains('fd-label')) {
                this.updateFieldDef(index, 'label', e.target.value);
            } else if (e.target.classList.contains('fd-default')) {
                this.updateFieldDef(index, 'defaultValue', e.target.value);
            }
        });
        fieldDefList.addEventListener('click', (e) => {
            const item = e.target.closest('.field-def-item');
            if (!item) return;
            const index = parseInt(item.getAttribute('data-index'));
            if (e.target.classList.contains('fd-badge-lock')) {
                this.toggleFieldLock(index);
            } else if (e.target.classList.contains('fd-badge-incr')) {
                this.toggleFieldIncrement(index);
            } else if (e.target.classList.contains('fd-badge-qr')) {
                this.toggleFieldQr(index);
            } else if (e.target.classList.contains('fd-del')) {
                this.deleteFieldDef(index);
            }
        });

        // Event delegation for Entry Form input changes & lookup check
        const entryForm = document.getElementById('entryForm');
        entryForm.addEventListener('input', (e) => {
            const indexAttr = e.target.getAttribute('data-field-index');
            if (indexAttr !== null) {
                const index = parseInt(indexAttr);
                this.onEntryFieldChange(index, e.target.value);
            }
        });
        entryForm.addEventListener('keydown', (e) => {
            const indexAttr = e.target.getAttribute('data-field-index');
            if (indexAttr !== null) {
                this.onEntryKeyDown(e);
            }
        });

        // Event delegation for Batch Table events
        const batchTableBody = document.getElementById('batchTableBody');
        batchTableBody.addEventListener('click', (e) => {
            const delBtn = e.target.closest('.del-row-btn');
            if (delBtn) {
                const tr = delBtn.closest('tr');
                const index = Array.from(batchTableBody.children).indexOf(tr);
                if (index >= 0) {
                    this.deleteBatchRow(index);
                }
                return;
            }
            const dupBtn = e.target.closest('.dup-row-btn');
            if (dupBtn) {
                const tr = dupBtn.closest('tr');
                const index = Array.from(batchTableBody.children).indexOf(tr);
                if (index >= 0) {
                    this.duplicateBatchRow(index);
                }
                return;
            }

            if (e.target.tagName === 'INPUT') {
                const row = parseInt(e.target.getAttribute('data-row'));
                if (!isNaN(row)) {
                    const rows = batchTableBody.querySelectorAll('tr');
                    rows.forEach((tr, i) => {
                        tr.classList.toggle('batch-row-selected', i === row);
                    });
                    this.selectedBatchRow = row;
                    this.selectedBatchCol = parseInt(e.target.getAttribute('data-col'));
                    this.fillEntryFromBatch(row);
                }
            }
        });

        batchTableBody.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT') {
                e.target.title = e.target.value || '(空)';
            }
        });

        batchTableBody.addEventListener('change', (e) => {
            if (e.target.tagName === 'INPUT' && !e.target.readOnly) {
                const row = parseInt(e.target.getAttribute('data-row'));
                const col = parseInt(e.target.getAttribute('data-col'));
                if (!isNaN(row) && !isNaN(col)) {
                    this.updateBatchCellByIndex(row, col, e.target.value);
                }
            }
        });

        // 每行打印模板选择
        batchTableBody.addEventListener('change', (e) => {
            const sel = e.target.closest('.row-tpl-select');
            if (!sel) return;
            const row = parseInt(sel.getAttribute('data-row'));
            if (!isNaN(row) && state.batchRows[row]) {
                state.batchRows[row]._template = sel.value;
                state.saveBatchRows();
            }
        });

        batchTableBody.addEventListener('keydown', (e) => {
            if (e.target.tagName !== 'INPUT' || e.target.readOnly) return;
            const row = parseInt(e.target.getAttribute('data-row'));
            const col = parseInt(e.target.getAttribute('data-col'));
            if (isNaN(row) || isNaN(col)) return;

            let handled = true;
            const inp = e.target;

            if (this._cellEditMode) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    const orig = this._cellEditOriginalValue;
                    inp.value = orig;
                    this.saveCurrentCell(row, col, orig);
                    this.exitCellEdit();
                    this.placeCaretAtEnd(inp);
                    return;
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                    this.exitCellEdit();
                } else {
                    return;
                }
            }

            if (e.key === 'Enter' && !e.shiftKey) {
                this.saveCurrentCell(row, col, inp.value);
                if (row + 1 >= state.batchRows.length) {
                    this.selectedBatchRow = row;
                    this.addBatchRow();
                }
                this.selectedBatchRow = row + 1;
                this.focusBatchCell(row + 1, col);
            } else if (e.key === 'Enter' && e.shiftKey) {
                this.saveCurrentCell(row, col, inp.value);
                this.selectedBatchRow = Math.max(0, row - 1);
                this.focusBatchCell(this.selectedBatchRow, col);
            } else if (e.key === 'ArrowDown') {
                this.saveCurrentCell(row, col, inp.value);
                if (row + 1 < state.batchRows.length) {
                    this.selectedBatchRow = row + 1;
                    this.focusBatchCell(row + 1, col);
                }
            } else if (e.key === 'ArrowUp') {
                this.saveCurrentCell(row, col, inp.value);
                this.selectedBatchRow = Math.max(0, row - 1);
                this.focusBatchCell(this.selectedBatchRow, col);
            } else if (e.key === 'ArrowRight' && col < state.fieldDefs.length - 1) {
                this.saveCurrentCell(row, col, inp.value);
                this.focusBatchCell(row, col + 1);
            } else if (e.key === 'ArrowLeft' && col > 0) {
                this.saveCurrentCell(row, col, inp.value);
                this.focusBatchCell(row, col - 1);
            } else if (e.key === 'Tab') {
                this.saveCurrentCell(row, col, inp.value);
                if (e.shiftKey) {
                    let prevCol = col - 1;
                    let prevRow = row;
                    if (prevCol < 0) {
                        prevRow = row - 1;
                        prevCol = state.fieldDefs.length - 1;
                        if (prevRow < 0) { prevRow = 0; prevCol = 0; }
                    }
                    this.selectedBatchRow = prevRow;
                    this.focusBatchCell(prevRow, prevCol);
                } else {
                    let nextCol = col + 1;
                    let nextRow = row;
                    if (nextCol >= state.fieldDefs.length) {
                        nextCol = 0;
                        nextRow = row + 1;
                    }
                    if (nextRow >= state.batchRows.length) {
                        nextRow = row;
                        nextCol = col;
                    }
                    this.selectedBatchRow = nextRow;
                    this.focusBatchCell(nextRow, nextCol);
                }
            } else {
                handled = false;
            }
            if (handled) e.preventDefault();
        });

        // 聚焦单元格时全选内容，便于直接输入替换
        batchTableBody.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'INPUT' && !e.target.readOnly) {
                try { e.target.select(); } catch (err) { }
            }
        });

        // 单元格失焦时退出编辑模式
        batchTableBody.addEventListener('focusout', (e) => {
            if (e.target.tagName === 'INPUT' && this._cellEditMode) {
                this.exitCellEdit();
            }
        });

        // 中文输入法：开始输入时取消全选，光标放到末尾，避免替换原内容
        batchTableBody.addEventListener('compositionstart', (e) => {
            if (this._cellEditMode) return;
            if (e.target.tagName === 'INPUT' && !e.target.readOnly) {
                try {
                    const len = e.target.value.length;
                    e.target.setSelectionRange(len, len);
                } catch (err) { }
            }
        });

        // 支持从 Excel 等直接粘贴多行多列数据，自动填入批量表
        batchTableBody.addEventListener('paste', (e) => {
            if (e.target.tagName !== 'INPUT' || e.target.readOnly) return;
            const row = parseInt(e.target.getAttribute('data-row'));
            const col = parseInt(e.target.getAttribute('data-col'));
            if (isNaN(row) || isNaN(col)) return;
            const text = (e.clipboardData || window.clipboardData).getData('text');
            if (!text) return;
            const lines = text.replace(/\r\n?/g, '\n').split('\n');
            while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
            if (lines.length === 0) return;
            const grid = lines.map((l) => l.split('\t'));
            if (this.pasteIntoGrid(row, col, grid)) {
                e.preventDefault();
                requestAnimationFrame(() => {
                    const inp = document.querySelector('#batchTableBody input[data-row="' + row + '"][data-col="' + col + '"]');
                    if (inp) { inp.focus(); try { inp.select(); } catch (err) { } }
                });
            }
        });

        // Window unload to auto save table inputs in focus
        window.addEventListener('beforeunload', () => {
            const inputs = document.querySelectorAll('#batchTableBody input:not([readonly])');
            inputs.forEach((inp) => {
                const row = parseInt(inp.getAttribute('data-row'));
                const col = parseInt(inp.getAttribute('data-col'));
                if (!isNaN(row) && !isNaN(col) && row < state.batchRows.length && col < state.fieldDefs.length) {
                    state.batchRows[row][state.fieldDefs[col].key] = inp.value;
                }
            });
            state.saveBatchRows();
            state.flushHistory();
        });

        // Global undo / redo shortcuts
        document.addEventListener('keydown', (e) => {
            const mod = e.ctrlKey || e.metaKey;
            if (!mod || e.altKey || e.isComposing) return;
            const key = (e.key || '').toLowerCase();
            const isUndo = key === 'z' && !e.shiftKey;
            const isRedo = key === 'y' || (key === 'z' && e.shiftKey);
            if (!isUndo && !isRedo) return;
            e.preventDefault();
            this.commitActiveCell();
            if (isUndo) this.performUndo();
            else this.performRedo();
        });

        // F2 编辑当前单元格：聚焦并把光标移到字段末尾
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'F2') return;
            const tag = e.target && e.target.tagName;
            if (tag === 'TEXTAREA' || tag === 'SELECT') return;
            e.preventDefault();
            this.editActiveCell();
        });
    },

    commitActiveCell() {
        const active = document.activeElement;
        if (active && active.tagName === 'INPUT' && !active.readOnly) {
            const row = parseInt(active.getAttribute('data-row'));
            const col = parseInt(active.getAttribute('data-col'));
            if (!isNaN(row) && !isNaN(col)) {
                this.saveCurrentCell(row, col, active.value);
            }
        }
    },

    editActiveCell() {
        const active = document.activeElement;
        let row = -1;
        let col = -1;

        if (active && active.tagName === 'INPUT' && active.getAttribute('data-row') !== null) {
            row = parseInt(active.getAttribute('data-row'));
            col = parseInt(active.getAttribute('data-col'));
            if (!active.readOnly) {
                this.placeCaretAtEnd(active);
                this.enterCellEdit(active);
                return;
            }
        }

        if (state.batchRows.length === 0) return;
        if (row < 0 || isNaN(row) || row >= state.batchRows.length) {
            row = this.selectedBatchRow >= 0 && this.selectedBatchRow < state.batchRows.length
                ? this.selectedBatchRow : 0;
        }
        if (col < 0 || isNaN(col) || col >= state.fieldDefs.length) {
            col = this.selectedBatchCol >= 0 ? this.selectedBatchCol : 0;
        }
        this.focusCellCaretEnd(row, col, 0);
    },

    placeCaretAtEnd(inp) {
        inp.focus();
        const len = (inp.value || '').length;
        try { inp.setSelectionRange(len, len); } catch (err) { }
    },

    focusCellCaretEnd(row, col, depth) {
        if (depth > state.fieldDefs.length) return;
        const inp = document.querySelector('#batchTableBody input[data-row="' + row + '"][data-col="' + col + '"]');
        if (!inp) return;
        if (inp.readOnly) {
            this.focusCellCaretEnd(row, Math.min(col + 1, state.fieldDefs.length - 1), depth + 1);
            return;
        }
        this.selectedBatchCol = col;
        this.placeCaretAtEnd(inp);
        this.enterCellEdit(inp);
    },

    enterCellEdit(inp) {
        this._cellEditMode = true;
        this._cellEditOriginalValue = inp.value;
    },

    exitCellEdit() {
        this._cellEditMode = false;
        this._cellEditOriginalValue = '';
    },

    performUndo() {
        if (!state.canUndo()) {
            this.toast('没有可撤销的操作');
            return;
        }
        state.undo();
        this.selectedBatchRow = state.batchRows.length > 0
            ? Math.min(this.selectedBatchRow, state.batchRows.length - 1) : -1;
        this.refreshAll();
        this.toast('已撤销');
    },

    performRedo() {
        if (!state.canRedo()) {
            this.toast('没有可重做的操作');
            return;
        }
        state.redo();
        this.selectedBatchRow = state.batchRows.length > 0
            ? Math.min(this.selectedBatchRow, state.batchRows.length - 1) : -1;
        this.refreshAll();
        this.toast('已重做');
    },

    toast(msg) {
        let el = document.getElementById('historyToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'historyToast';
            el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
                'background:rgba(15,23,42,0.9);color:#fff;padding:8px 16px;border-radius:8px;' +
                'font-size:0.82rem;z-index:9999;pointer-events:none;transition:opacity 0.25s;opacity:0;';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.style.opacity = '1';
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 1200);
    },

    refreshAll() {
        this.buildFieldDefList();
        this.validateFieldKeys();
        this.buildEntryForm();
        this.rebuildBatchTable();
        this.updateDataPreview();
        this.updateFieldStats();
        this.renderPrintLog();
        this.updateQrFormatInput();
        state.mappingCache = null;
        state.mappingTemplate = null;
        this.buildMappingPanel();
    },

    buildFieldDefList() {
        const container = document.getElementById('fieldDefList');
        container.innerHTML = state.fieldDefs.map((fd, i) =>
            `<div class="field-def-item" data-index="${i}">` +
            `<input class="fd-key" type="text" placeholder="字段key" value="${utils.escHtml(fd.key)}" title="变量标识（英文）">` +
            `<input class="fd-label" type="text" placeholder="显示名称" value="${utils.escHtml(fd.label)}" title="中文显示名">` +
            `<input class="fd-default" type="text" placeholder="默认值（可选）" value="${utils.escHtml(fd.defaultValue)}" title="录入时的默认值">` +
            `<div class="fd-badges">` +
            `<span class="fd-badge fd-badge-lock ${fd.locked ? 'locked-on' : 'locked-off'}" title="锁定时批量表中此列只读">` +
            `${fd.locked ? '🔒 锁定' : '🔓 解锁'}</span>` +
            `<span class="fd-badge fd-badge-incr ${fd.increment ? 'incr-on' : 'incr-off'}" title="智能递增时自动累加此字段">` +
            `${fd.increment ? '⇧ 递增' : '= 不变'}</span>` +
            `<span class="fd-badge fd-badge-qr ${fd.qrField ? 'qr-on' : 'qr-off'}" title="标记后该字段值将组合成二维码数据发送至 BarTender">` +
            `${fd.qrField ? '▦ QR' : '▢'}</span>` +
            `</div>` +
            `<button class="fd-del" title="删除">✕</button>` +
            `</div>`
        ).join('');
    },

    updateFieldDef(index, prop, value) {
        if (!state.fieldDefs[index]) return;
        const oldKey = state.fieldDefs[index].key;
        state.fieldDefs[index][prop] = value;
        if (prop === 'key' && oldKey !== value) {
            state.batchRows.forEach((row) => {
                if (row[oldKey] !== undefined) {
                    row[value] = row[oldKey];
                    delete row[oldKey];
                }
            });
            state.saveBatchRows();
            const cache = this.loadEntryCache();
            if (cache[oldKey] !== undefined) {
                cache[value] = cache[oldKey];
                delete cache[oldKey];
                this.saveEntryCache(cache);
            }
        }
        state.saveFieldDefs();
        if (prop === 'key') this.validateFieldKeys();
    },

    validateFieldKeys() {
        const keys = {};
        const dupes = {};
        state.fieldDefs.forEach((fd) => {
            const k = fd.key;
            if (!k) return;
            if (keys[k]) {
                dupes[k] = true;
            } else {
                keys[k] = true;
            }
        });
        const inputs = document.querySelectorAll('#fieldDefList .fd-key');
        inputs.forEach((inp, i) => {
            const k = (state.fieldDefs[i] && state.fieldDefs[i].key) || '';
            if (!k) {
                inp.style.borderColor = '#ef4444';
                inp.style.background = '#fef2f2';
                inp.title = '字段 key 不能为空';
            } else if (dupes[k]) {
                inp.style.borderColor = '#ef4444';
                inp.style.background = '#fef2f2';
                inp.title = `key "${k}" 重复，将导致数据覆盖`;
            } else {
                inp.style.borderColor = '';
                inp.style.background = '';
                inp.title = '';
            }
        });
        return Object.keys(dupes).length === 0;
    },

    toggleFieldLock(index) {
        if (!state.fieldDefs[index]) return;
        state.fieldDefs[index].locked = !state.fieldDefs[index].locked;
        state.saveFieldDefs();
        this.buildFieldDefList();
    },

    toggleFieldIncrement(index) {
        if (!state.fieldDefs[index]) return;
        state.fieldDefs[index].increment = !state.fieldDefs[index].increment;
        state.saveFieldDefs();
        this.buildFieldDefList();
    },

    toggleFieldQr(index) {
        if (!state.fieldDefs[index]) return;
        state.fieldDefs[index].qrField = !state.fieldDefs[index].qrField;
        state.saveFieldDefs();
        this.buildFieldDefList();
        this.updateQrFormatHint();
        this.updateDataPreview();
    },

    deleteFieldDef(index) {
        if (!state.fieldDefs[index]) return;
        if (!confirm(`确定删除字段 "${state.fieldDefs[index].label || state.fieldDefs[index].key || '(空)'}" 吗？\n批量表中的对应列数据将丢失。`)) return;
        const removedKey = state.fieldDefs[index].key;
        state.fieldDefs.splice(index, 1);
        state.batchRows.forEach((row) => { delete row[removedKey]; });
        state.saveBatchRows();
        state.saveFieldDefs();
        this.refreshAll();
    },

    addFieldDef() {
        let n = 1;
        let baseKey = 'field_' + n;
        while (state.fieldDefs.some((fd) => fd.key === baseKey)) {
            n++;
            baseKey = 'field_' + n;
        }
        state.fieldDefs.push({ key: baseKey, label: '', defaultValue: '', locked: false, increment: false, qrField: false });
        state.saveFieldDefs();
        this.refreshAll();
        setTimeout(() => {
            const inputs = document.querySelectorAll('#fieldDefList .fd-key');
            if (inputs.length > 0) inputs[inputs.length - 1].focus();
        }, 100);
    },

    resetFieldDefs() {
        if (!confirm('确定重置为默认字段配置吗？')) return;
        state.fieldDefs = JSON.parse(JSON.stringify(state.DEFAULT_FIELD_DEFS));
        state.saveFieldDefs();
        state.batchRows = [];
        state.saveBatchRows();
        this.refreshAll();
    },

    importFieldDefs() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = function () {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    if (!Array.isArray(data)) throw new Error('格式错误');
                    state.fieldDefs = data;
                    state.saveFieldDefs();
                    this.refreshAll();
                } catch (e) {
                    alert('导入失败：文件格式不正确');
                }
            };
            reader.readAsText(file);
        }.bind(this);
        input.click();
    },

    exportFieldDefs() {
        const blob = new Blob([JSON.stringify(state.fieldDefs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'field_defs_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    // Entry Form logic
    buildEntryForm() {
        const cache = this.loadEntryCache();
        const container = document.getElementById('entryForm');
        container.innerHTML = state.fieldDefs.map((fd, i) => {
            const val = utils.strVal(cache[fd.key] !== undefined ? cache[fd.key] : fd.defaultValue);
            return '<div class="field-row" style="margin-bottom:10px;">' +
            '<div class="field-group" style="flex:1;">' +
            '<label>' + (fd.label || fd.key || '(未命名)') +
            (fd.locked ? '<span class="fixed-badge">锁定</span>' : '') + '</label>' +
            `<input type="text" id="ef_${i}" value="${utils.escHtml(val)}" ` +
            `placeholder="${utils.escHtml(fd.label || fd.key)}" ` +
            `title="${utils.escAttr(val)}" ` +
            `data-field-index="${i}">` +
            '</div></div>';
        }).join('');
        if (state.fieldDefs.length === 0) {
            container.innerHTML = '<div class="empty-tip">请先在字段管理中定义字段</div>';
        }
    },

    loadEntryCache() {
        try {
            const saved = store.getItem(state.storageKey('entryFormData'));
            if (saved) return JSON.parse(saved);
        } catch (e) { }
        return {};
    },

    saveEntryCache(cache) {
        try {
            store.setItem(state.storageKey('entryFormData'), JSON.stringify(cache));
        } catch (e) { }
    },

    onEntryFieldChange(index, value) {
        const fd = state.fieldDefs[index];
        if (fd) {
            const cache = this.loadEntryCache();
            cache[fd.key] = value;
            this.saveEntryCache(cache);

            if (state.lookupCache && state.lookupCache.data && fd.key === state.lookupCache.key) {
                const model = (value || '').trim();
                if (model) {
                    const table = state.lookupCache.data;
                    let row = table[model];
                    if (!row) {
                        for (let k in table) {
                            if (model.indexOf(k) >= 0) { row = table[k]; break; }
                        }
                    }
                    if (row) {
                        let changed = false;
                        for (let f in row) {
                            if (cache[f] !== row[f]) {
                                cache[f] = row[f];
                                changed = true;
                                let fi = -1;
                                for (let j = 0; j < state.fieldDefs.length; j++) {
                                    if (state.fieldDefs[j].key === f) { fi = j; break; }
                                }
                                if (fi >= 0) {
                                    const el = document.getElementById('ef_' + fi);
                                    if (el) { el.value = row[f]; el.title = row[f]; }
                                }
                            }
                        }
                        if (changed) this.saveEntryCache(cache);
                    }
                }
            }
        }
        this.updateDataPreview();
    },

    onEntryKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const container = document.getElementById('entryForm');
            const inputs = Array.from(container.querySelectorAll('input[type="text"]:not([readonly])'));
            const idx = inputs.indexOf(e.target);
            if (idx >= 0 && idx < inputs.length - 1) {
                inputs[idx + 1].focus();
                inputs[idx + 1].select();
            }
        }
    },

    getEntryFormData() {
        const cache = this.loadEntryCache();
        const data = {};
        state.fieldDefs.forEach((fd, i) => {
            const el = document.getElementById('ef_' + i);
            const val = el ? el.value : (cache[fd.key] !== undefined ? cache[fd.key] : utils.strVal(fd.defaultValue));
            data[fd.key] = val;
        });
        data['qrdata'] = utils.buildQRData(data, state.fieldDefs, state.getQrFormat());
        return data;
    },

    clearEntryForm() {
        this.saveEntryCache({});
        state.fieldDefs.forEach((fd, i) => {
            const el = document.getElementById('ef_' + i);
            if (el) el.value = fd.defaultValue || '';
        });
        this.updateDataPreview();
    },

    saveToBatch() {
        const data = this.getEntryFormData();
        state.batchRows.push(data);
        state.saveBatchRows();
        this.rebuildBatchTable();
        this.updateBatchCount();
        this.updateDataPreview();
    },

    fillEntryFromBatch(index) {
        const row = state.batchRows[index];
        if (!row) return;
        state.fieldDefs.forEach((fd, i) => {
            const el = document.getElementById('ef_' + i);
            if (el) el.value = utils.strVal(row[fd.key]);
        });
        this.updateDataPreview();
    },

    // Batch Table drawing & helper methods
    buildBatchTable() {
        const thead = document.getElementById('batchTableHead');
        thead.innerHTML = '<tr>' +
            '<th style="width:40px; text-align:center;">✕</th>' +
            '<th style="width:36px; text-align:center;">#</th>' +
            state.fieldDefs.map((fd, ci) => {
                return `<th style="cursor:col-resize;" class="th-resizable" data-col="${ci}" title="双击自动调整列宽">${fd.label || fd.key}` +
                    (fd.locked ? ' <span style="color:#b45309;font-size:0.7rem;">🔒</span>' : '') +
                    (fd.increment ? ' <span style="color:#2563eb;font-size:0.7rem;">⇧</span>' : '') +
                    (fd.qrField ? ' <span style="color:#7c3aed;font-size:0.7rem;">▦</span>' : '') +
                    '</th>';
            }).join('') +
            '<th style="width:180px; text-align:center;">打印模板</th>' +
            '</tr>';
        
        // Dynamic event binding for dblclick on columns
        thead.querySelectorAll('.th-resizable').forEach(th => {
            th.addEventListener('dblclick', () => {
                const colIdx = parseInt(th.getAttribute('data-col'));
                this.autoSizeColumn(colIdx);
            });
        });
    },

    restoreColWidths() {
        const table = document.getElementById('batchTable');
        if (!table) return;
        let widths = {};
        try { widths = JSON.parse(store.getItem(state.storageKey('colWidths')) || '{}'); } catch (e) { return; }
        const colKeys = Object.keys(widths);
        if (colKeys.length === 0) return;

        const ths = table.querySelectorAll('thead th');
        const inputs = table.querySelectorAll('tbody td input');

        for (let c = 0; c < colKeys.length; c++) {
            const ci = parseInt(colKeys[c]);
            const w = widths[ci];
            const th = ths[ci + 2];
            if (th) th.style.width = w;
            for (let i = 0; i < inputs.length; i++) {
                const inp = inputs[i];
                if (parseInt(inp.getAttribute('data-col')) === ci) {
                    inp.style.width = w;
                    inp.style.minWidth = '0';
                }
            }
        }
    },

    autoSizeColumn(colIndex) {
        const table = document.getElementById('batchTable');
        if (!table) return;

        let ruler = document.getElementById('colRuler');
        if (!ruler) {
            ruler = document.createElement('span');
            ruler.id = 'colRuler';
            ruler.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:0.95rem;font-family:inherit;padding:12px 10px;';
            document.body.appendChild(ruler);
        }

        const th = table.querySelectorAll('thead th')[colIndex + 2]; // +2 skips 操作 and # columns
        let maxW = 0;
        if (th) {
            ruler.textContent = (th.textContent || '').trim();
            maxW = ruler.offsetWidth;
        }

        const inputs = table.querySelectorAll('tbody input[data-col="' + colIndex + '"]');
        for (let i = 0; i < inputs.length; i++) {
            ruler.textContent = inputs[i].value || '';
            maxW = Math.max(maxW, ruler.offsetWidth);
        }

        const w = Math.min(Math.max(maxW + 16, 50), 600) + 'px';
        if (th) th.style.width = w;
        inputs.forEach((inp) => {
            inp.style.width = w;
            inp.style.minWidth = '0';
        });

        let widths = {};
        try { widths = JSON.parse(store.getItem(state.storageKey('colWidths')) || '{}'); } catch (e) { }
        widths[colIndex] = w;
        store.setItem(state.storageKey('colWidths'), JSON.stringify(widths));
    },

    rebuildBatchTable() {
        this.buildBatchTable();
        const tbody = document.getElementById('batchTableBody');
        tbody.innerHTML = state.batchRows.map((row, ri) => {
            return '<tr class="' + (ri === this.selectedBatchRow ? 'batch-row-selected' : '') + '">' +
                '<td style="text-align:center; white-space:nowrap;">' +
                '<button class="dup-row-btn" title="复制此行">⧉</button>' +
                '<button class="del-row-btn" title="删除此行">✕</button></td>' +
                '<td style="text-align:center; color:var(--text-muted); font-size:0.8rem;">' + (ri + 1) + '</td>' +
                state.fieldDefs.map((fd, fi) => {
                    const val = utils.strVal(row[fd.key]);
                    if (fd.locked) {
                        return '<td><input type="text" value="' + utils.escHtml(String(val)) + '" readonly ' +
                            'data-row="' + ri + '" data-col="' + fi + '" ' +
                            'style="background:#fef3c7; cursor:pointer;" title="' + utils.escAttr(String(val || '(空)')) + '"></td>';
                    }
                    return '<td><input type="text" value="' + utils.escHtml(String(val)) + '" ' +
                        'data-row="' + ri + '" data-col="' + fi + '" ' +
                        'title="' + utils.escAttr(String(val || '(空)')) + '"></td>';
                }).join('') +
                this.buildRowTemplateCell(row, ri) +
                '</tr>';
        }).join('');
        this.updateBatchCount();
        requestAnimationFrame(() => {
            requestAnimationFrame(() => this.restoreColWidths());
        });
    },

    buildRowTemplateCell(row, ri) {
        const cur = row._template || '';
        let opts = '<option value="">默认(全局)</option>';
        (this.templates || []).forEach((t) => {
            opts += '<option value="' + utils.escAttr(t.name) + '"' + (cur === t.name ? ' selected' : '') + '>' + utils.escHtml(t.name) + '</option>';
        });
        if (cur && !(this.templates || []).some((t) => t.name === cur)) {
            opts += '<option value="' + utils.escAttr(cur) + '" selected>' + utils.escHtml(cur) + '</option>';
        }
        return '<td style="padding:2px;"><select class="row-tpl-select" data-row="' + ri + '" ' +
            'style="width:100%; border:none; outline:none; background:transparent; padding:6px 4px; font-size:0.8rem; cursor:pointer;">' +
            opts + '</select></td>';
    },

    saveCurrentCell(row, col, value) {
        if (row >= state.batchRows.length) return;
        const key = (col < state.fieldDefs.length) ? state.fieldDefs[col].key : null;
        if (!key) return;
        state.batchRows[row][key] = value;
        state.saveBatchRows();
    },

    focusBatchCell(row, col, depth) {
        if (depth === undefined) depth = 0;
        if (depth > state.fieldDefs.length) return;
        setTimeout(() => {
            const inp = document.querySelector('#batchTableBody input[data-row="' + row + '"][data-col="' + col + '"]');
            if (!inp) return;
            if (inp.readOnly) {
                this.focusBatchCell(row, Math.min(col + 1, state.fieldDefs.length - 1), depth + 1);
                return;
            }
            this.selectedBatchCol = col;
            inp.focus();
            try {
                inp.select();
            } catch (err) { }
        }, 80);
    },

    updateBatchCount() {
        document.getElementById('batchCount').textContent = '(' + state.batchRows.length + '条)';
    },

    addBatchRow(prefill) {
        const row = {};
        const srcRow = this.selectedBatchRow >= 0 && this.selectedBatchRow < state.batchRows.length
            ? state.batchRows[this.selectedBatchRow]
            : (state.batchRows.length > 0 ? state.batchRows[state.batchRows.length - 1] : null);
        state.fieldDefs.forEach((fd) => {
            if (prefill && prefill[fd.key]) {
                row[fd.key] = prefill[fd.key];
            } else if (srcRow && srcRow[fd.key]) {
                row[fd.key] = srcRow[fd.key];
            } else {
                row[fd.key] = fd.defaultValue || '';
            }
        });
        row._template = (prefill && prefill._template) || (srcRow ? srcRow._template : '') || '';
        const insertAt = this.selectedBatchRow >= 0 ? this.selectedBatchRow + 1 : state.batchRows.length;
        state.batchRows.splice(insertAt, 0, row);
        this.selectedBatchRow = insertAt;
        state.saveBatchRows();
        this.rebuildBatchTable();
    },

    deleteBatchRow(index) {
        state.batchRows.splice(index, 1);
        if (this.selectedBatchRow >= state.batchRows.length) this.selectedBatchRow = state.batchRows.length - 1;
        state.saveBatchRows();
        this.rebuildBatchTable();
    },

    makeEmptyRow() {
        const row = {};
        state.fieldDefs.forEach((fd) => {
            row[fd.key] = fd.defaultValue || '';
        });
        return row;
    },

    duplicateBatchRow(index) {
        if (!state.batchRows[index]) return;
        const copy = {};
        state.fieldDefs.forEach((fd) => {
            copy[fd.key] = state.batchRows[index][fd.key] !== undefined ? state.batchRows[index][fd.key] : (fd.defaultValue || '');
        });
        copy._template = state.batchRows[index]._template || '';
        state.batchRows.splice(index + 1, 0, copy);
        this.selectedBatchRow = index + 1;
        state.saveBatchRows();
        this.rebuildBatchTable();
    },

    pasteIntoGrid(row, col, grid) {
        const targets = [];
        let c = col;
        for (let pc = 0; pc < grid[0].length; pc++) {
            while (c < state.fieldDefs.length && state.fieldDefs[c].locked) c++;
            if (c >= state.fieldDefs.length) break;
            targets.push(c);
            c++;
        }
        if (targets.length === 0) return false;

        for (let r = 0; r < grid.length; r++) {
            const targetRow = row + r;
            while (state.batchRows.length <= targetRow) {
                state.batchRows.push(this.makeEmptyRow());
            }
            const cells = grid[r] || [];
            for (let pc = 0; pc < targets.length; pc++) {
                const key = state.fieldDefs[targets[pc]].key;
                state.batchRows[targetRow][key] = (pc < cells.length) ? cells[pc] : '';
            }
        }
        this.selectedBatchRow = row + grid.length - 1;
        state.saveBatchRows();
        this.rebuildBatchTable();
        return true;
    },

    updateBatchCellByIndex(rowIndex, colIndex, value) {
        if (!state.batchRows[rowIndex] || colIndex >= state.fieldDefs.length) return;
        const fd = state.fieldDefs[colIndex];
        state.batchRows[rowIndex][fd.key] = value;
        state.saveBatchRows();
        const inp = document.querySelector('#batchTableBody input[data-row="' + rowIndex + '"][data-col="' + colIndex + '"]');
        if (inp) inp.title = value || '(空)';

        if (state.lookupCache && state.lookupCache.data && fd.key === state.lookupCache.key) {
            const model = (value || '').trim();
            if (model) {
                const table = state.lookupCache.data;
                let row = table[model];
                if (!row) {
                    for (let k in table) {
                        if (model.indexOf(k) >= 0) { row = table[k]; break; }
                    }
                }
                if (row) {
                    for (let f in row) {
                        if (state.batchRows[rowIndex][f] !== row[f]) {
                            state.batchRows[rowIndex][f] = row[f];
                            for (let j = 0; j < state.fieldDefs.length; j++) {
                                if (state.fieldDefs[j].key === f && j !== colIndex) {
                                    const el = document.querySelector('#batchTableBody input[data-row="' + rowIndex + '"][data-col="' + j + '"]');
                                    if (el) { el.value = row[f]; el.title = row[f]; }
                                    break;
                                }
                            }
                        }
                    }
                    state.saveBatchRows();
                }
            }
        }
    },

    autoGenerate() {
        if (state.fieldDefs.length === 0) {
            alert('请先定义字段');
            return;
        }
        if (state.batchRows.length === 0) {
            this.addBatchRow();
            this.rebuildBatchTable();
        }
        const incrementFields = state.fieldDefs.filter((fd) => fd.increment);
        if (incrementFields.length === 0) {
            alert('没有设置递增字段。请在字段管理中为至少一个字段开启"递增"标记。');
            return;
        }
        const countStr = prompt('请输入需要生成的条数（在现有基础上新增）：', '10');
        if (!countStr) return;
        const count = parseInt(countStr, 10);
        if (isNaN(count) || count <= 0) {
            alert('请输入有效的正整数');
            return;
        }

        let lastRow = state.batchRows[state.batchRows.length - 1];
        for (let i = 0; i < count; i++) {
            const newRow = {};
            state.fieldDefs.forEach((fd) => {
                if (fd.increment && lastRow) {
                    const prev = utils.strVal(lastRow[fd.key]);
                    newRow[fd.key] = utils.autoIncrementValue(prev);
                } else {
                    newRow[fd.key] = lastRow ? utils.strVal(lastRow[fd.key]) : utils.strVal(fd.defaultValue);
                }
            });
            newRow._template = lastRow ? lastRow._template : '';
            state.batchRows.push(newRow);
            lastRow = state.batchRows[state.batchRows.length - 1];
        }
        state.saveBatchRows();
        this.rebuildBatchTable();
        const wrap = document.getElementById('batchTableWrap');
        if (wrap) setTimeout(() => { wrap.scrollTop = wrap.scrollHeight; }, 100);
    },

    clearBatchTable() {
        if (!confirm('确定清空全部批量数据吗？')) return;
        state.batchRows = [];
        this.selectedBatchRow = -1;
        state.saveBatchRows();
        this.rebuildBatchTable();
    },

    toggleBatchZoom() {
        const card = document.getElementById('batchCard');
        const overlay = document.getElementById('zoomOverlay');
        const table = document.getElementById('batchTable');
        const wrap = document.getElementById('batchTableWrap');

        if (card.classList.contains('zoomed')) {
            card.classList.remove('zoomed');
            overlay.classList.remove('active');
            document.getElementById('zoomBtn').textContent = '🔍 全屏编辑';
            table.style.tableLayout = 'fixed';
            table.style.width = '100%';
            table.style.minWidth = '600px';
            wrap.style.maxHeight = '';
        } else {
            card.classList.add('zoomed');
            overlay.classList.add('active');
            document.getElementById('zoomBtn').textContent = '✕ 退出全屏';
            table.style.tableLayout = 'auto';
            table.style.width = '';
            table.style.minWidth = '';
            wrap.style.maxHeight = '';
        }
    },

    updatePageTitle(data) {
        data = data || this.getEntryFormData();
        const find = (candidates) => {
            for (const c of candidates) {
                const v = data[c];
                if (v && String(v).trim()) return String(v).trim();
            }
            const cLower = candidates.map((c) => c.toLowerCase());
            for (const fd of state.fieldDefs) {
                const lbl = (fd.label || '').toLowerCase();
                const key = (fd.key || '').toLowerCase();
                for (const c of cLower) {
                    if (lbl.indexOf(c) >= 0 || key.indexOf(c) >= 0) {
                        const v = data[fd.key];
                        if (v && String(v).trim()) return String(v).trim();
                    }
                }
            }
            return '';
        };
        const guige = find(['规格', 'guige', 'spec']);
        const xinghao = find(['型号', 'xinghao', 'model']);
        const pihao = find(['批号', 'pihao', 'batch']);
        const parts = [];
        if (guige) parts.push(guige);
        if (xinghao) parts.push(xinghao);
        if (pihao) parts.push(pihao);
        const prefix = parts.length > 0 ? parts.join(' | ') + ' — ' : '';
        document.title = prefix + 'BarTender 批量标签打印';
    },

    // Preview Pane
    updateDataPreview() {
        const container = document.getElementById('dataPreview');
        const data = this.getEntryFormData();
        this.updatePageTitle(data);
        const entries = state.fieldDefs.map((fd) => {
            return { label: fd.label || fd.key, value: data[fd.key] || '-' };
        });
        if (entries.length === 0) {
            container.innerHTML = '<div class="empty-tip">请先定义字段</div>';
            return;
        }
        const qrtext = utils.buildQRData(data, state.fieldDefs, state.getQrFormat());
        container.innerHTML = '<table class="data-preview-table">' +
            entries.map((e) => {
                return '<tr><th>' + utils.escHtml(e.label) + '</th><td>' + utils.escHtml(e.value) + '</td></tr>';
            }).join('') +
            '</table>' +
            (qrtext ? '<div style="margin-top:8px; padding:8px 10px; background:#ede9fe; border-radius:6px; ' +
             'border:1px solid #c4b5fd; font-size:0.75rem; word-break:break-all; line-height:1.5;">' +
             '<span style="color:#7c3aed; font-weight:700;">▦ 二维码数据预览</span><br>' +
             '<span style="color:#5b21b6;">' + utils.escHtml(qrtext) + '</span></div>' : '');
    },

    // BarTender Integrated functions
    async refreshTemplates() {
        const select = document.getElementById('btTemplateSelect');
        const status = document.getElementById('btPrintStatus');
        select.disabled = true;
        status.textContent = '正在获取模板列表...';
        status.style.color = '#64748b';

        try {
            const result = await api.fetchTemplates(state.bartenderServiceUrl);
            this.templates = result.templates || [];
            const prevVal = select.value;
            select.innerHTML = '<option value="">— 请选择模板 —</option>';

            if (result.templates && result.templates.length > 0) {
                result.templates.forEach((t) => {
                    const opt = document.createElement('option');
                    opt.value = t.name;
                    opt.textContent = t.name;
                    select.appendChild(opt);
                });
                if (prevVal && Array.from(select.options).some((o) => o.value === prevVal)) {
                    select.value = prevVal;
                }
                this.setBtStatus('已加载 ' + result.templates.length + ' 个模板', '#16a34a');
            } else {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = '(模板目录为空 — 请放入 .btw 文件)';
                opt.disabled = true;
                select.appendChild(opt);
                this.setBtStatus('未找到 .btw 模板文件，请放入 templates/ 目录', '#dc2626');
            }
        } catch (e) {
            this.templates = [];
            select.innerHTML = '<option value="">— 服务未连接 —</option>';
            this.setBtStatus('无法连接打印服务: ' + e.message, '#dc2626');
        } finally {
            select.disabled = false;
            state.mappingCache = null;
            state.mappingTemplate = null;
            this.buildMappingPanel();
            this.rebuildBatchTable();
        }
    },

    async refreshConfigs() {
        const select = document.getElementById('configSelect');
        select.disabled = true;

        try {
            const result = await api.fetchConfigs(state.bartenderServiceUrl);
            select.innerHTML = '<option value="">— 加载配置 —</option>';

            if (result.configs && result.configs.length > 0) {
                result.configs.forEach((c) => {
                    const opt = document.createElement('option');
                    opt.value = c.name;
                    opt.textContent = c.name.replace('.json', '');
                    select.appendChild(opt);
                });
            } else {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = '(configs 目录为空)';
                opt.disabled = true;
                select.appendChild(opt);
            }
        } catch (e) {
            select.innerHTML = '<option value="">— 服务未连接 —</option>';
        } finally {
            select.disabled = false;
        }
    },

    async loadConfig(name) {
        if (!name) return;
        if (!confirm('确定要加载配置 "' + name.replace('.json', '') + '" 吗？\n当前字段定义、字段映射和二维码格式将被覆盖。')) {
            document.getElementById('configSelect').value = '';
            return;
        }

        try {
            const config = await api.fetchConfigDetails(state.bartenderServiceUrl, name);

            if (config.fieldDefs && Array.isArray(config.fieldDefs)) {
                store.setItem(state.storageKey('customFieldDefs'), JSON.stringify(config.fieldDefs));
            }
            if (typeof config.qrFormat === 'string') {
                store.setItem(state.storageKey('qrFormat'), config.qrFormat);
            }
            const templateName = document.getElementById('btTemplateSelect').value;
            if (config.mapping && Array.isArray(config.mapping)) {
                store.setItem(state.storageKey('btMapping_' + templateName), JSON.stringify(config.mapping));
                store.setItem(state.storageKey('btMapping___default__'), JSON.stringify(config.mapping));
            }
            if (config.lookup && config.lookup.key && config.lookup.data) {
                state.lookupCache = config.lookup;
                store.setItem(state.storageKey('lookupConfig'), JSON.stringify(config.lookup));
            } else {
                state.lookupCache = null;
                store.removeItem(state.storageKey('lookupConfig'));
            }

            state.loadFieldDefs();
            state.recordHistory();
            state.mappingCache = null;
            state.mappingTemplate = null;
            this.refreshAll();
            this.onDefaultPrinterChange();
            this.setBtStatus('已加载配置: ' + name.replace('.json', ''), '#16a34a');
            document.getElementById('configSelect').value = '';
        } catch (e) {
            alert('加载配置失败: ' + e.message);
            document.getElementById('configSelect').value = '';
        }
    },

    setBtStatus(msg, color) {
        const el = document.getElementById('btPrintStatus');
        el.textContent = msg;
        el.style.color = color;
    },

    onDefaultPrinterChange() {
        const useDefault = document.getElementById('btUseDefaultPrinter').checked;
        const input = document.getElementById('btPrinterName');
        input.disabled = useDefault;
        input.style.opacity = useDefault ? '0.4' : '1';
        store.setItem(state.storageKey('btUseDefaultPrinter'), useDefault);
    },

    onTemplateChange() {
        state.mappingCache = null;
        state.mappingTemplate = null;
        this.buildMappingPanel();
    },

    restoreBartenderSettings() {
        const savedPrinter = store.getItem(state.storageKey('btPrinterName'));
        if (savedPrinter) document.getElementById('btPrinterName').value = savedPrinter;
        document.getElementById('btPrinterName').addEventListener('change', function () {
            store.setItem(state.storageKey('btPrinterName'), this.value);
        });
        const useDefault = store.getItem(state.storageKey('btUseDefaultPrinter')) !== 'false';
        document.getElementById('btUseDefaultPrinter').checked = useDefault;
        const savedCopies = store.getItem(state.storageKey('btCopies'));
        if (savedCopies) document.getElementById('btCopies').value = savedCopies;
        document.getElementById('btCopies').addEventListener('change', function () {
            store.setItem(state.storageKey('btCopies'), this.value);
        });
    },

    // Mapping fields
    getFormFieldKeys() {
        const keys = state.fieldDefs.map((fd) => fd.key);
        keys.push('qrdata');
        return keys;
    },

    getDefaultMapping() {
        const keys = this.getFormFieldKeys();
        return keys.map((k) => {
            const fd = state.fieldDefs.find((f) => f.key === k);
            return {
                key: k,
                templateVar: k,
                value: fd ? (fd.defaultValue || '') : '',
                source: 'form'
            };
        });
    },

    getFieldMappingFor(templateName) {
        const key = state.storageKey('btMapping_' + (templateName || '__default__'));
        const saved = store.getItem(key);
        if (saved) {
            try {
                const m = JSON.parse(saved);
                if (Array.isArray(m) && m.length > 0) {
                    state.mappingCache = m;
                    state.mappingTemplate = templateName || '';
                    return m;
                }
            } catch (e) { }
        }
        if (templateName) {
            const defaultKey = state.storageKey('btMapping___default__');
            const defaultSaved = store.getItem(defaultKey);
            if (defaultSaved) {
                try {
                    const dm = JSON.parse(defaultSaved);
                    if (Array.isArray(dm) && dm.length > 0) {
                        state.mappingCache = dm;
                        state.mappingTemplate = templateName;
                        return dm;
                    }
                } catch (e) { }
            }
        }
        state.mappingCache = this.getDefaultMapping();
        state.mappingTemplate = templateName || '';
        return state.mappingCache;
    },

    persistMapping() {
        const templateName = document.getElementById('btTemplateSelect').value;
        if (!templateName) return;
        store.setItem(state.storageKey('btMapping_' + templateName), JSON.stringify(state.mappingCache));
        state.mappingTemplate = templateName;
    },

    getBtPrintData(fields, templateName) {
        const tpl = templateName || document.getElementById('btTemplateSelect').value;
        this.getFieldMappingFor(tpl);
        const data = {};
        const qrdata = fields ? utils.buildQRData(fields, state.fieldDefs, state.getQrFormat()) : '';
        state.mappingCache.forEach((item) => {
            if (!item.templateVar) return;
            if (item.source === 'form') {
                if (item.key === 'qrdata') {
                    data[item.templateVar] = qrdata;
                } else {
                    const v = fields && fields[item.key];
                    data[item.templateVar] = (v !== undefined && v !== null) ? this.toBarTenderText(v) : '';
                }
            } else {
                data[item.templateVar] = this.toBarTenderText(utils.strVal(item.value));
            }
        });
        return data;
    },

    toBarTenderText(str) {
        return String(str).replace(/\\n/g, '\n');
    },

    toggleMappingPanel() {
        const panel = document.getElementById('btMappingPanel');
        const btn = document.getElementById('btMappingBtn');
        if (panel.style.display === 'none' || !panel.style.display) {
            panel.style.display = 'block';
            btn.style.borderColor = 'var(--primary)';
            btn.style.color = 'var(--primary)';
            state.mappingCache = null;
            state.mappingTemplate = null;
            this.buildMappingPanel();
        } else {
            panel.style.display = 'none';
            btn.style.borderColor = '';
            btn.style.color = '';
        }
    },

    buildMappingPanel() {
        const container = document.getElementById('btMappingFields');
        if (!container) return;
        const templateName = document.getElementById('btTemplateSelect').value;
        this.getFieldMappingFor(templateName);
        container.innerHTML = '';

        state.mappingCache.forEach((item, idx) => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.gap = '6px';
            div.style.alignItems = 'center';
            div.setAttribute('data-mapping-idx', idx);

            if (item.source === 'form') {
                const sel = document.createElement('select');
                sel.style.flex = '1';
                sel.style.padding = '6px';
                sel.style.border = '1px solid var(--border)';
                sel.style.borderRadius = '4px';
                sel.style.fontSize = '0.78rem';
                sel.style.background = '#fff';
                sel.className = 'mapping-key-select';
                const emptyOpt = document.createElement('option');
                emptyOpt.value = '';
                emptyOpt.textContent = '— 选择字段 —';
                sel.appendChild(emptyOpt);
                this.getFormFieldKeys().forEach((k) => {
                    const opt = document.createElement('option');
                    opt.value = k;
                    const fd = state.fieldDefs.find((f) => f.key === k);
                    if (k === 'qrdata') {
                        opt.textContent = '▦ 二维码数据 (qrdata)';
                    } else {
                        opt.textContent = (fd ? fd.label + ' (' + k + ')' : k);
                    }
                    if (k === item.key) opt.selected = true;
                    sel.appendChild(opt);
                });
                sel.addEventListener('change', (e) => {
                    state.mappingCache[idx].key = e.target.value;
                    if (e.target.value) {
                        state.mappingCache[idx].source = 'form';
                    }
                    this.persistMapping();
                });
                div.appendChild(sel);
            } else {
                const keyInp = document.createElement('input');
                keyInp.type = 'text';
                keyInp.placeholder = '固定值';
                keyInp.value = item.key || '';
                keyInp.style.flex = '1';
                keyInp.style.padding = '6px';
                keyInp.style.border = '1px solid var(--border)';
                keyInp.style.borderRadius = '4px';
                keyInp.style.fontSize = '0.78rem';
                keyInp.addEventListener('change', (e) => {
                    state.mappingCache[idx].key = e.target.value;
                    this.persistMapping();
                });
                div.appendChild(keyInp);

                const valInp = document.createElement('input');
                valInp.type = 'text';
                valInp.placeholder = '值';
                valInp.value = item.value || '';
                valInp.style.flex = '1';
                valInp.style.padding = '6px';
                valInp.style.border = '1px solid var(--border)';
                valInp.style.borderRadius = '4px';
                valInp.style.fontSize = '0.78rem';
                valInp.addEventListener('change', (e) => {
                    state.mappingCache[idx].value = e.target.value;
                    this.persistMapping();
                });
                div.appendChild(valInp);
            }

            const varInp = document.createElement('input');
            varInp.type = 'text';
            varInp.placeholder = '模板变量名';
            varInp.value = item.templateVar || '';
            varInp.style.flex = '1';
            varInp.style.padding = '6px';
            varInp.style.border = '1px solid var(--border)';
            varInp.style.borderRadius = '4px';
            varInp.style.fontSize = '0.78rem';
            varInp.className = 'mapping-var-input';
            varInp.addEventListener('change', (e) => {
                state.mappingCache[idx].templateVar = e.target.value;
                this.persistMapping();
            });
            div.appendChild(varInp);

            const delBtn = document.createElement('button');
            delBtn.textContent = '✕';
            delBtn.style.background = 'none';
            delBtn.style.border = 'none';
            delBtn.style.color = '#ef4444';
            delBtn.style.cursor = 'pointer';
            delBtn.style.fontSize = '1rem';
            delBtn.style.padding = '4px 6px';
            delBtn.style.borderRadius = '4px';
            delBtn.addEventListener('click', () => {
                this.deleteMappingField(idx);
            });
            div.appendChild(delBtn);

            container.appendChild(div);
        });
    },

    addMappingField() {
        state.mappingCache.push({ key: '', templateVar: '', value: '', source: 'form' });
        this.persistMapping();
        this.buildMappingPanel();
        setTimeout(() => {
            const inps = document.querySelectorAll('#btMappingFields .mapping-var-input');
            if (inps.length > 0) inps[inps.length - 1].focus();
        }, 50);
    },

    deleteMappingField(idx) {
        state.mappingCache.splice(idx, 1);
        this.persistMapping();
        this.buildMappingPanel();
    },

    saveFieldMapping() {
        const templateName = document.getElementById('btTemplateSelect').value;
        if (!templateName) {
            this.setBtStatus('请先选择一个模板', '#dc2626');
            return;
        }
        const newMapping = [];
        const rows = document.querySelectorAll('#btMappingFields > div');
        const formKeys = this.getFormFieldKeys();
        rows.forEach((row) => {
            const idx = parseInt(row.getAttribute('data-mapping-idx'));
            const keyInp = row.querySelector('.mapping-key-select') || row.querySelector('input[placeholder="固定值"]');
            const varInp = row.querySelector('.mapping-var-input');
            const valInp = row.querySelector('input[placeholder="值"]');
            const key = keyInp ? keyInp.value.trim() : '';
            const templateVar = varInp ? varInp.value.trim() : '';
            const isFormField = formKeys.includes(key);
            newMapping.push({
                key: key,
                templateVar: templateVar,
                value: isFormField ? '' : (valInp ? valInp.value : ''),
                source: isFormField ? 'form' : 'static'
            });
        });
        state.mappingCache = newMapping;
        this.persistMapping();
        this.setBtStatus('字段映射已保存', '#16a34a');
        this.buildMappingPanel();
    },

    resetFieldMapping() {
        const templateName = document.getElementById('btTemplateSelect').value;
        if (!templateName) return;
        if (!confirm('确定重置为默认映射吗？')) return;
        state.mappingCache = this.getDefaultMapping();
        state.mappingTemplate = templateName || '__default__';
        store.removeItem(state.storageKey('btMapping_' + templateName));
        this.buildMappingPanel();
        this.setBtStatus('已重置为默认映射', '#64748b');
    },

    importMapping() {
        const templateName = document.getElementById('btTemplateSelect').value;
        if (!templateName) {
            alert('请先选择一个模板');
            return;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = function () {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    if (!Array.isArray(data)) throw new Error('格式错误');
                    state.mappingCache = data;
                    this.persistMapping();
                    this.buildMappingPanel();
                    this.setBtStatus('映射已导入', '#16a34a');
                } catch (e) {
                    alert('导入失败：文件格式不正确');
                }
            };
            reader.readAsText(file);
        }.bind(this);
        input.click();
    },

    exportMapping() {
        const templateName = document.getElementById('btTemplateSelect').value;
        if (!templateName) {
            alert('请先选择一个模板');
            return;
        }
        this.getFieldMappingFor(templateName);
        const blob = new Blob([JSON.stringify(state.mappingCache, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mapping_' + templateName.replace('.btw', '') + '_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    // Print Buttons Control
    disablePrintButtons() {
        document.getElementById('btPrintBtn').disabled = true;
        const batchBtn = document.getElementById('btBatchBtn');
        if (batchBtn) batchBtn.disabled = true;
    },

    enablePrintButtons() {
        document.getElementById('btPrintBtn').disabled = false;
        document.getElementById('btPrintBtn').textContent = '▦ 发送至 BarTender 打印';
        const batchBtn = document.getElementById('btBatchBtn');
        if (batchBtn) batchBtn.disabled = false;
    },

    applyLookup(data) {
        if (!state.lookupCache || !data) return data;
        const keyField = state.lookupCache.key;
        const model = (data[keyField] || '').trim();
        if (!model) return data;
        const table = state.lookupCache.data;
        let row = table[model];
        if (!row) {
            for (let k in table) {
                if (model.indexOf(k) >= 0) { row = table[k]; break; }
            }
        }
        if (!row) return data;
        for (let f in row) {
            if (!data[f] || data[f].trim() === '') {
                data[f] = row[f];
            }
        }
        return data;
    },

    singleSendToBartender() {
        const templateName = document.getElementById('btTemplateSelect').value;
        const useDefault = document.getElementById('btUseDefaultPrinter').checked;
        const printerName = useDefault ? '' : document.getElementById('btPrinterName').value.trim();
        const copies = parseInt(document.getElementById('btCopies').value) || 1;

        if (!templateName) {
            this.setBtStatus('请先选择 BarTender 模板', '#dc2626');
            return;
        }
        if (!useDefault && !printerName) {
            this.setBtStatus('请填写打印机名称或勾选"模板默认"', '#dc2626');
            return;
        }

        const fields = this.getEntryFormData();
        this.applyLookup(fields);
        const printData = this.getBtPrintData(fields);

        this.disablePrintButtons();
        this.bartenderPrint(printData, templateName, printerName, copies);
    },

    batchSendToBartender() {
        if (state.batchRows.length === 0) {
            alert('批量表中没有数据。请先在录入表单中填写数据并"保存到批量表"，或使用智能递增生成数据。');
            return;
        }

        const templateName = document.getElementById('btTemplateSelect').value;
        const useDefault = document.getElementById('btUseDefaultPrinter').checked;
        const printerName = useDefault ? '' : document.getElementById('btPrinterName').value.trim();
        const copies = parseInt(document.getElementById('btCopies').value) || 1;

        if (!templateName) {
            alert('请先在右侧 BarTender 专业打印中选择模板');
            return;
        }
        if (!useDefault && !printerName) {
            alert('请填写打印机名称或勾选"模板默认"');
            return;
        }
        if (!confirm('确定要将 ' + state.batchRows.length + ' 条数据发送至 BarTender 打印吗？')) return;

        this.disablePrintButtons();
        this.setBtStatus('正在批量打印 ' + state.batchRows.length + ' 个标签...', '#64748b');

        let completed = 0;
        let failed = 0;
        const rows = state.batchRows.slice();

        const sendNext = async (index) => {
            if (index >= rows.length) {
                const msg = '批量打印完成: 成功 ' + completed + ' / 失败 ' + failed;
                this.setBtStatus(msg, failed > 0 ? '#dc2626' : '#16a34a');
                this.addPrintLog(templateName, completed, failed);
                this.enablePrintButtons();
                return;
            }
            try {
                this.applyLookup(rows[index]);
                const rowTpl = rows[index]._template || templateName;
                const printData = this.getBtPrintData(rows[index], rowTpl);
                await api.printTemplate(state.bartenderServiceUrl, rowTpl, printerName, copies, printData);
                completed++;
            } catch (e) {
                failed++;
            }
            this.setBtStatus('批量打印中: ' + (index + 1) + ' / ' + rows.length +
                ' (成功 ' + completed + ' / 失败 ' + failed + ')', '#64748b');
            setTimeout(() => { sendNext(index + 1); }, 300);
        };

        sendNext(0);
    },

    async bartenderPrint(printData, templateName, printerName, copies) {
        const btn = document.getElementById('btPrintBtn');
        btn.textContent = '正在发送打印...';

        try {
            const result = await api.printTemplate(state.bartenderServiceUrl, templateName, printerName, copies, printData);
            this.setBtStatus('打印成功: ' + (result.message || '已发送'), '#16a34a');
            this.addPrintLog(templateName, 1, 0);
        } catch (e) {
            this.setBtStatus('请求失败: ' + e.message, '#dc2626');
            this.addPrintLog(templateName, 0, 1);
        } finally {
            this.enablePrintButtons();
        }
    },

    // Print logs
    addPrintLog(templateName, success, failed) {
        state.printLog.unshift({
            time: new Date().toLocaleString('zh-CN'),
            template: templateName,
            success: success,
            failed: failed
        });
        state.savePrintLog();
        this.renderPrintLog();
    },

    renderPrintLog() {
        const container = document.getElementById('printLogList');
        if (state.printLog.length === 0) {
            container.innerHTML = '<div class="empty-tip">暂无记录</div>';
            return;
        }
        container.innerHTML = state.printLog.map((log) => {
            const icon = log.failed > 0 ? '❌' : '✅';
            const color = log.failed > 0 ? '#dc2626' : '#16a34a';
            let msg = '成功 ' + log.success;
            if (log.failed > 0) msg += ' / 失败 ' + log.failed;
            return '<div class="history-item" style="border-left:3px solid ' + color + ';">' +
                '<div class="hist-main">' + icon + ' ' + msg + '</div>' +
                '<div style="font-size:0.75rem;">模板: ' + utils.escHtml(log.template) + '</div>' +
                '<div class="hist-time">' + log.time + '</div>' +
                '</div>';
        }).join('');
    },

    clearPrintLog() {
        if (!confirm('确定清空所有发送记录吗？')) return;
        state.printLog = [];
        state.savePrintLog();
        this.renderPrintLog();
    },

    // Field settings pop-up overlays
    openFieldSettings() {
        this.updateQrFormatInput();
        this.updateQrFormatHint();
        this.restoreLookupInput();
        this.showOverlay('fieldSettingsOverlay');
    },

    closeFieldSettings() {
        document.getElementById('fieldSettingsOverlay').style.display = 'none';
        this.refreshAll();
    },

    updateFieldStats() {
        const el = document.getElementById('fieldStats');
        if (el) el.textContent = state.fieldDefs.length + ' 个字段';
        const qrEl = document.getElementById('qrStats');
        if (qrEl) {
            const format = state.getQrFormat();
            qrEl.textContent = format ? 'QR: ' + (format.length > 30 ? format.substring(0, 30) + '...' : format) : 'QR: 未设置';
        }
    },

    saveQrFormat() {
        const val = document.getElementById('qrFormatInput').value;
        state.saveQrFormat(val);
        this.updateDataPreview();
        this.updateQrFormatHint();
        this.updateFieldStats();
    },

    resetQrFormat() {
        if (!confirm('确定重置为默认二维码组合格式吗？')) return;
        document.getElementById('qrFormatInput').value = state.DEFAULT_QR_FORMAT;
        state.resetQrFormat();
        this.updateQrFormatHint();
        this.updateDataPreview();
        this.updateFieldStats();
    },

    previewQrFormat() {
        const format = document.getElementById('qrFormatInput').value;
        const example = {};
        state.fieldDefs.forEach((fd) => {
            example[fd.key] = fd.defaultValue || '(' + (fd.label || fd.key) + '示例)';
        });
        const result = format.replace(/\{(\w+)\}/g, (match, key) => {
            return example[key] || match;
        });
        alert('预览效果：\n\n' + result);
    },

    updateQrFormatHint() {
        const hint = document.getElementById('qrFormatHint');
        if (!hint) return;
        const keys = state.fieldDefs.filter((fd) => fd.qrField).map((fd) => '{' + fd.key + '}');
        if (keys.length === 0) {
            hint.textContent = '提示：请先在字段中标记 QR 字段';
        } else {
            hint.textContent = '可用字段：' + keys.join('  ');
        }
    },

    importQrFormat() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.json';
        input.onchange = function () {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const val = reader.result;
                document.getElementById('qrFormatInput').value = val;
                this.saveQrFormat();
            };
            reader.readAsText(file);
        }.bind(this);
        input.click();
    },

    exportQrFormat() {
        const format = state.getQrFormat();
        const blob = new Blob([format], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qr_format_' + new Date().toISOString().slice(0, 10) + '.txt';
        a.click();
        URL.revokeObjectURL(url);
    },

    // Lookups
    exportLookup() {
        const val = document.getElementById('lookupInput').value.trim();
        if (!val) return alert('查询表为空');
        const blob = new Blob([val], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lookup_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    importLookup() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = function () {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    JSON.parse(reader.result);
                    document.getElementById('lookupInput').value = reader.result;
                    this.saveLookupConfig();
                    this.setBtStatus('查询表已导入', '#16a34a');
                } catch (e) {
                    alert('无效的 JSON 文件');
                }
            };
            reader.readAsText(file);
        }.bind(this);
        input.click();
    },

    saveLookupConfig() {
        const val = document.getElementById('lookupInput').value.trim();
        if (val) {
            try {
                const parsed = JSON.parse(val);
                state.saveLookupCache(parsed);
            } catch (e) {
                state.saveLookupCache(null);
            }
        } else {
            state.saveLookupCache(null);
        }
    },

    restoreLookupInput() {
        const el = document.getElementById('lookupInput');
        if (!el) return;
        const saved = store.getItem(state.storageKey('lookupConfig'));
        if (saved) {
            el.value = saved;
            try { state.lookupCache = JSON.parse(saved); } catch (e) { state.lookupCache = null; }
        } else {
            el.value = '';
        }
    },

    updateQrFormatInput() {
        const el = document.getElementById('qrFormatInput');
        if (el) el.value = state.getQrFormat();
        this.updateQrFormatHint();
    },

    // Tab inherit logic
    findFieldKey(fieldDefs, candidates) {
        const cLower = candidates.map((c) => String(c).toLowerCase());
        for (const fd of fieldDefs) {
            const lbl = (fd.label || '').toLowerCase();
            const key = (fd.key || '').toLowerCase();
            for (const c of cLower) {
                if (lbl.indexOf(c) >= 0 || key.indexOf(c) >= 0) return fd.key;
            }
        }
        return '';
    },

    showTabImport() {
        const myTabId = state.tabId;
        const container = document.getElementById('tabImportList');
        this.selectedImportTabId = null;
        document.getElementById('tabImportConfirmBtn').disabled = true;
        this.showOverlay('tabImportOverlay');

        const tabs = store.listTabs();
        const others = tabs.filter((t) => t.tabId !== myTabId);

        if (others.length === 0) {
            container.innerHTML = '<div class="empty-tip">没有其他标签页可继承</div>';
            return;
        }

        const rows = [];
        for (const t of others) {
            const time = new Date(t.updatedAt).toLocaleString('zh-CN');
            let fieldCount = '-';
            let batchCount = '-';
            let title = '标签页';
            const data = store.loadTabState(t.tabId);
            if (data) {
                try {
                    const fd = JSON.parse(data.customFieldDefs || '[]');
                    fieldCount = fd.length;
                    const br = JSON.parse(data.batchTableData || '[]');
                    batchCount = br.length;
                    const entry = JSON.parse(data.entryFormData || '{}');
                    const key = this.findFieldKey(fd, ['规格', 'guige', 'spec']);
                    if (key) {
                        let val = '';
                        for (let r = 0; r < br.length; r++) {
                            if (br[r] && br[r][key]) { val = br[r][key]; break; }
                        }
                        if (!val && entry) val = entry[key] || '';
                        if (val) title = String(val);
                    }
                } catch (e) { }
            }
            if (fieldCount === 0 && batchCount === 0) continue;
            rows.push({ id: t.tabId, time, fieldCount, batchCount, title });
        }

        container.innerHTML = rows.map((r) => {
            return '<label style="display:flex; align-items:center; padding:10px 12px; background:var(--surface2); ' +
                'border-radius:8px; cursor:pointer; border:2px solid var(--border);' +
                '" class="tab-import-row" data-tab-id="' + r.id + '">' +
                '<input type="radio" name="importTab" style="margin-right:10px;">' +
                '<div style="flex:1;">' +
                '<div style="font-weight:600; font-size:0.85rem;">' + utils.escHtml(r.title) + '</div>' +
                '<div style="font-size:0.72rem; color:var(--text-muted);">最后活动: ' + r.time +
                ' | ' + r.fieldCount + ' 个字段 | ' + r.batchCount + ' 条数据</div>' +
                '</div></label>';
        }).join('');

        container.querySelectorAll('.tab-import-row').forEach(row => {
            row.addEventListener('click', (e) => {
                const targetId = row.getAttribute('data-tab-id');
                this.selectImportTab(targetId, row);
            });
        });
    },

    closeTabImport() {
        document.getElementById('tabImportOverlay').style.display = 'none';
        this.selectedImportTabId = null;
        document.getElementById('tabImportConfirmBtn').disabled = true;
    },

    selectImportTab(id, el) {
        this.selectedImportTabId = id;
        document.getElementById('tabImportConfirmBtn').disabled = false;
        const labels = document.querySelectorAll('#tabImportList label');
        labels.forEach((l) => {
            l.style.borderColor = 'var(--border)';
            l.style.background = 'var(--surface2)';
        });
        el.style.borderColor = '#7c3aed';
        el.style.background = '#f5f3ff';
    },

    importAllFromTab() {
        if (!this.selectedImportTabId) return;
        if (!confirm('确定要从标签页 ' + this.selectedImportTabId + ' 继承全部内容吗？\n当前标签页的所有数据将被覆盖。')) return;

        this.copyDataFromTab(this.selectedImportTabId);
        this.closeTabImport();
        this.refreshAll();
        const savedCopies = store.getItem(state.storageKey('btCopies'));
        if (savedCopies) document.getElementById('btCopies').value = savedCopies;
        const savedPrinter = store.getItem(state.storageKey('btPrinterName'));
        if (savedPrinter) document.getElementById('btPrinterName').value = savedPrinter;
        document.getElementById('btUseDefaultPrinter').checked = store.getItem(state.storageKey('btUseDefaultPrinter')) !== 'false';
        this.onDefaultPrinterChange();
        this.setBtStatus('已从标签页 ' + this.selectedImportTabId + ' 继承全部内容', '#16a34a');
    },

    copyDataFromTab(sourceId) {
        const data = store.loadTabState(sourceId);
        if (data && typeof data === 'object') {
            for (const key in data) {
                store.setItem(state.storageKey(key), data[key]);
            }
            store.updateTabRegistry();
        }
        state.loadFieldDefs();
        state.loadBatchRows();
        state.loadPrintLog();
        state.loadLookupCache();
        state.loadServiceUrl();
        state.recordHistory();
    }
};
