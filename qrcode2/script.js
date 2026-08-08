// ===== 默认字段定义 =====
const DEFAULT_FIELD_DEFS = [];
const DEFAULT_QR_FORMAT = '';

// ===== 全局状态 =====
let fieldDefs = [];
let batchRows = [];
let printLog = [];

// ===== 标签页隔离 =====
var tabId = window.name || '';
if (!tabId) {
    tabId = Math.random().toString(36).slice(2, 8);
    window.name = tabId;
}
function storageKey(base) {
    return 'bt_' + tabId + '_' + base;
}
function updateTabRegistry() {
    var list = {};
    try { list = JSON.parse(localStorage.getItem('bt_tabList') || '{}'); } catch (e) {}
    list[tabId] = Date.now();
    var cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    for (var id in list) {
        if (list[id] < cutoff) {
            delete list[id];
            ['customFieldDefs', 'batchTableData', 'printLog', 'btPrinterName',
             'btUseDefaultPrinter', 'btServiceUrl', 'qrFormat', 'btCopies'].forEach(function (suffix) {
                localStorage.removeItem('bt_' + id + '_' + suffix);
            });
            var mappingPrefix = 'bt_' + id + '_btMapping_';
            // 先收集再删除，避免迭代中修改 localStorage 导致跳过
            var toRemove = [];
            for (var i = 0; i < localStorage.length; i++) {
                var mk = localStorage.key(i);
                if (mk && mk.indexOf(mappingPrefix) === 0) toRemove.push(mk);
            }
            toRemove.forEach(function (k) { localStorage.removeItem(k); });
        }
    }
    localStorage.setItem('bt_tabList', JSON.stringify(list));
}

// ===== BarTender 映射状态 =====
const BARTENDER_SERVICE_URL = (localStorage.getItem(storageKey('btServiceUrl')) || 'http://localhost:8000');
let _mappingCache = null;
let _mappingTemplate = null;

// ===== 初始化 =====
window.onload = function () {
    updateTabRegistry();
    loadFieldDefs();
    loadBatchRows();
    loadPrintLog();
    refreshAll();
    refreshTemplates();
    refreshConfigs();
    restoreBartenderSettings();
    onDefaultPrinterChange();
    buildMappingPanel();
};

// ==================== 字段定义管理 ====================

function loadFieldDefs() {
    var saved = localStorage.getItem(storageKey('customFieldDefs'));
    if (saved) {
        try {
            fieldDefs = JSON.parse(saved);
            if (!Array.isArray(fieldDefs) || fieldDefs.length === 0) throw new Error('empty');
            return;
        } catch (e) { }
    }
    fieldDefs = [];
}

function saveFieldDefs() {
    localStorage.setItem(storageKey('customFieldDefs'), JSON.stringify(fieldDefs));
}

function addFieldDef() {
    var n = 1;
    var baseKey = 'field_' + n;
    while (fieldDefs.some(function (fd) { return fd.key === baseKey; })) {
        n++;
        baseKey = 'field_' + n;
    }
    fieldDefs.push({ key: baseKey, label: '', defaultValue: '', locked: false, increment: false, qrField: false });
    saveFieldDefs();
    refreshAll();
    // Focus the new row's key input
    setTimeout(function () {
        const inputs = document.querySelectorAll('#fieldDefList .fd-key');
        if (inputs.length > 0) inputs[inputs.length - 1].focus();
    }, 100);
}

function deleteFieldDef(index) {
    if (!confirm('确定删除字段 "' + (fieldDefs[index].label || fieldDefs[index].key || '(空)') + '" 吗？\n批量表中的对应列数据将丢失。')) return;
    var removedKey = fieldDefs[index].key;
    fieldDefs.splice(index, 1);
    batchRows.forEach(function (row) { delete row[removedKey]; });
    saveBatchRows();
    saveFieldDefs();
    refreshAll();
}

function updateFieldDef(index, prop, value) {
    fieldDefs[index][prop] = value;
    saveFieldDefs();
    if (prop === 'key') validateFieldKeys();
}

function validateFieldKeys() {
    var keys = {};
    var dupes = {};
    fieldDefs.forEach(function (fd) {
        var k = fd.key;
        if (!k) return;
        if (keys[k]) {
            dupes[k] = true;
        } else {
            keys[k] = true;
        }
    });
    var inputs = document.querySelectorAll('#fieldDefList .fd-key');
    inputs.forEach(function (inp, i) {
        var k = (fieldDefs[i] && fieldDefs[i].key) || '';
        if (!k) {
            inp.style.borderColor = '#ef4444';
            inp.style.background = '#fef2f2';
            inp.title = '字段 key 不能为空';
        } else if (dupes[k]) {
            inp.style.borderColor = '#ef4444';
            inp.style.background = '#fef2f2';
            inp.title = 'key "' + k + '" 重复，将导致数据覆盖';
        } else {
            inp.style.borderColor = '';
            inp.style.background = '';
            inp.title = '';
        }
    });
    return Object.keys(dupes).length === 0;
}

function toggleFieldLock(index) {
    fieldDefs[index].locked = !fieldDefs[index].locked;
    saveFieldDefs();
    buildFieldDefList();
}

function toggleFieldIncrement(index) {
    fieldDefs[index].increment = !fieldDefs[index].increment;
    saveFieldDefs();
    buildFieldDefList();
}

function toggleFieldQr(index) {
    fieldDefs[index].qrField = !fieldDefs[index].qrField;
    saveFieldDefs();
    buildFieldDefList();
    updateQrFormatHint();
    updateDataPreview();
}

function resetFieldDefs() {
    if (!confirm('确定重置为默认字段配置吗？')) return;
    fieldDefs = JSON.parse(JSON.stringify(DEFAULT_FIELD_DEFS));
    saveFieldDefs();
    refreshAll();
}

function importFieldDefs() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function () {
            try {
                const data = JSON.parse(reader.result);
                if (!Array.isArray(data)) throw new Error('格式错误');
                fieldDefs = data;
                saveFieldDefs();
                refreshAll();
            } catch (e) {
                alert('导入失败：文件格式不正确');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function exportFieldDefs() {
    const blob = new Blob([JSON.stringify(fieldDefs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'field_defs_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

var _selectedImportTabId = null;
var _selectedBatchRow = -1;

function showTabImport() {
    var list = JSON.parse(localStorage.getItem('bt_tabList') || '{}');
    var tabs = Object.keys(list).filter(function (id) { return id !== tabId; });

    var container = document.getElementById('tabImportList');
    if (tabs.length === 0) {
        container.innerHTML = '<div class="empty-tip">没有其他标签页可继承</div>';
    } else {
        container.innerHTML = tabs.map(function (id) {
            var time = new Date(list[id]).toLocaleString('zh-CN');
            var fieldCount = '-';
            var batchCount = '-';
            try {
                var fd = JSON.parse(localStorage.getItem('bt_' + id + '_customFieldDefs') || '[]');
                fieldCount = fd.length;
                var br = JSON.parse(localStorage.getItem('bt_' + id + '_batchTableData') || '[]');
                batchCount = br.length;
            } catch (e) { }
            return '<label style="display:flex; align-items:center; padding:10px 12px; background:var(--surface2); ' +
                'border-radius:8px; cursor:pointer; border:2px solid var(--border);' +
                '" onclick="selectImportTab(\'' + id + '\', this)" data-tab-id="' + id + '">' +
                '<input type="radio" name="importTab" style="margin-right:10px;">' +
                '<div style="flex:1;">' +
                '<div style="font-weight:600; font-size:0.85rem;">标签页 ' + id + '</div>' +
                '<div style="font-size:0.72rem; color:var(--text-muted);">最后活动: ' + time +
                ' | ' + fieldCount + ' 个字段 | ' + batchCount + ' 条数据</div>' +
                '</div></label>';
        }).join('');
    }
    _selectedImportTabId = null;
    document.getElementById('tabImportConfirmBtn').disabled = true;
    document.getElementById('tabImportOverlay').style.display = 'flex';
}

function closeTabImport() {
    document.getElementById('tabImportOverlay').style.display = 'none';
    _selectedImportTabId = null;
    document.getElementById('tabImportConfirmBtn').disabled = true;
}

function selectImportTab(id, el) {
    _selectedImportTabId = id;
    document.getElementById('tabImportConfirmBtn').disabled = false;
    var labels = document.querySelectorAll('#tabImportList label');
    labels.forEach(function (l) {
        l.style.borderColor = 'var(--border)';
        l.style.background = 'var(--surface2)';
    });
    el.style.borderColor = '#7c3aed';
    el.style.background = '#f5f3ff';
}

function importAllFromTab() {
    if (!_selectedImportTabId) return;
    if (!confirm('确定要从标签页 ' + _selectedImportTabId + ' 继承全部内容吗？\n当前标签页的所有数据将被覆盖。')) return;

    function copyKey(suffix) {
        var src = localStorage.getItem('bt_' + _selectedImportTabId + '_' + suffix);
        if (src !== null) {
            localStorage.setItem(storageKey(suffix), src);
        }
    }

    copyKey('customFieldDefs');
    copyKey('batchTableData');
    copyKey('printLog');
    copyKey('btPrinterName');
    copyKey('btUseDefaultPrinter');
    copyKey('btCopies');
    copyKey('btServiceUrl');
    copyKey('qrFormat');

    var mappingPrefix = 'bt_' + _selectedImportTabId + '_btMapping_';
    var destPrefix = 'bt_' + tabId + '_btMapping_';
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(mappingPrefix) === 0) {
            var suffix = k.substring(mappingPrefix.length);
            localStorage.setItem(destPrefix + suffix, localStorage.getItem(k));
        }
    }

    closeTabImport();
    loadFieldDefs();
    loadBatchRows();
    loadPrintLog();
    refreshAll();
    onDefaultPrinterChange();
    setBtStatus('已从标签页 ' + _selectedImportTabId + ' 继承全部内容', '#16a34a');
}

function buildFieldDefList() {
    const container = document.getElementById('fieldDefList');
    container.innerHTML = fieldDefs.map((fd, i) =>
        '<div class="field-def-item">' +
        '<input class="fd-key" type="text" placeholder="字段key" value="' + escHtml(fd.key) + '" ' +
        'onchange="updateFieldDef(' + i + ', \'key\', this.value)" title="变量标识（英文）">' +
        '<input class="fd-label" type="text" placeholder="显示名称" value="' + escHtml(fd.label) + '" ' +
        'onchange="updateFieldDef(' + i + ', \'label\', this.value)" title="中文显示名">' +
        '<input class="fd-default" type="text" placeholder="默认值（可选）" value="' + escHtml(fd.defaultValue) + '" ' +
        'onchange="updateFieldDef(' + i + ', \'defaultValue\', this.value)" title="录入时的默认值">' +
        '<div class="fd-badges">' +
        '<span class="fd-badge ' + (fd.locked ? 'locked-on' : 'locked-off') + '" ' +
        'onclick="toggleFieldLock(' + i + ')" title="锁定时批量表中此列只读">' +
        (fd.locked ? '🔒 锁定' : '🔓 解锁') + '</span>' +
        '<span class="fd-badge ' + (fd.increment ? 'incr-on' : 'incr-off') + '" ' +
        'onclick="toggleFieldIncrement(' + i + ')" title="智能递增时自动累加此字段">' +
        (fd.increment ? '⇧ 递增' : '= 不变') + '</span>' +
        '<span class="fd-badge ' + (fd.qrField ? 'qr-on' : 'qr-off') + '" ' +
        'onclick="toggleFieldQr(' + i + ')" title="标记后该字段值将组合成二维码数据发送至 BarTender">' +
        (fd.qrField ? '▦ QR' : '▢') + '</span>' +
        '</div>' +
        '<button class="fd-del" onclick="deleteFieldDef(' + i + ')" title="删除">✕</button>' +
        '</div>'
    ).join('');
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str) {
    return escHtml(str).replace(/'/g, '&#39;');
}

// 取值：只有 undefined/null 才返回空，保留 0/false 等
function strVal(v) {
    return (v !== undefined && v !== null) ? v : '';
}

// ==================== 单条录入表单 ====================

function buildEntryForm() {
    const container = document.getElementById('entryForm');
    container.innerHTML = fieldDefs.map((fd, i) =>
        '<div class="field-row" style="margin-bottom:10px;">' +
        '<div class="field-group" style="flex:1;">' +
        '<label>' + (fd.label || fd.key || '(未命名)') +
        (fd.locked ? '<span class="fixed-badge">锁定</span>' : '') + '</label>' +
        '<input type="text" id="ef_' + i + '" value="' + escHtml(fd.defaultValue) + '" ' +
        'placeholder="' + escHtml(fd.label || fd.key) + '" oninput="updateDataPreview()">' +
        '</div></div>'
    ).join('');
    if (fieldDefs.length === 0) {
        container.innerHTML = '<div class="empty-tip">请先在字段管理中定义字段</div>';
    }
}

function getEntryFormData() {
    const data = {};
    fieldDefs.forEach(function (fd, i) {
        const el = document.getElementById('ef_' + i);
        data[fd.key] = el ? el.value : (fd.defaultValue || '');
    });
    data['qrdata'] = buildQRData(data);
    return data;
}

function clearEntryForm() {
    fieldDefs.forEach(function (fd, i) {
        const el = document.getElementById('ef_' + i);
        if (el) el.value = fd.defaultValue || '';
    });
    updateDataPreview();
}

function buildQRData(fields) {
    var format = getQrFormat();
    return format.replace(/\{(\w+)\}/g, function (match, key) {
        if (fields && fields[key] !== undefined && fields[key] !== null) return fields[key];
        var fd = fieldDefs.find(function (f) { return f.key === key; });
        return fd ? strVal(fd.defaultValue) : '';
    });
}

function getQrFormat() {
    return localStorage.getItem(storageKey('qrFormat')) || DEFAULT_QR_FORMAT;
}

function saveQrFormat() {
    var val = document.getElementById('qrFormatInput').value;
    localStorage.setItem(storageKey('qrFormat'), val);
    updateDataPreview();
    updateQrFormatHint();
    updateFieldStats();
}

function resetQrFormat() {
    if (!confirm('确定重置为默认二维码组合格式吗？')) return;
    document.getElementById('qrFormatInput').value = DEFAULT_QR_FORMAT;
    localStorage.setItem(storageKey('qrFormat'), DEFAULT_QR_FORMAT);
    updateQrFormatHint();
    updateDataPreview();
    updateFieldStats();
}

function previewQrFormat() {
    var format = document.getElementById('qrFormatInput').value;
    var example = {};
    fieldDefs.forEach(function (fd) {
        example[fd.key] = fd.defaultValue || '(' + (fd.label || fd.key) + '示例)';
    });
    var result = format.replace(/\{(\w+)\}/g, function (match, key) {
        return example[key] || match;
    });
    alert('预览效果：\n\n' + result);
}

function updateQrFormatHint() {
    var hint = document.getElementById('qrFormatHint');
    if (!hint) return;
    var keys = fieldDefs.filter(function (fd) { return fd.qrField; }).map(function (fd) { return '{' + fd.key + '}'; });
    if (keys.length === 0) {
        hint.textContent = '提示：请先在字段中标记 QR 字段';
    } else {
        hint.textContent = '可用字段：' + keys.join('  ');
    }
}

function importQrFormat() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.json';
    input.onchange = function () {
        var file = this.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
            var val = reader.result;
            document.getElementById('qrFormatInput').value = val;
            saveQrFormat();
        };
        reader.readAsText(file);
    };
    input.click();
}

function exportQrFormat() {
    var format = getQrFormat();
    var blob = new Blob([format], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'qr_format_' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
}

function saveToBatch() {
    const data = getEntryFormData();
    batchRows.push(data);
    saveBatchRows();
    rebuildBatchTable();
    updateBatchCount();
    updateDataPreview();
}

function fillEntryFromBatch(index) {
    const row = batchRows[index];
    if (!row) return;
    fieldDefs.forEach(function (fd, i) {
        const el = document.getElementById('ef_' + i);
        if (el) el.value = strVal(row[fd.key]);
    });
    updateDataPreview();
}

// ==================== 批量数据表 ====================

function loadBatchRows() {
    const saved = localStorage.getItem(storageKey('batchTableData'));
    if (saved) {
        try { batchRows = JSON.parse(saved); } catch (e) { batchRows = []; }
    }
}

function saveBatchRows() {
    localStorage.setItem(storageKey('batchTableData'), JSON.stringify(batchRows));
}

function buildBatchTable() {
    const thead = document.getElementById('batchTableHead');
    thead.innerHTML = '<tr>' +
        '<th style="width:36px; text-align:center;">#</th>' +
        fieldDefs.map(function (fd) {
            return '<th>' + (fd.label || fd.key) +
                (fd.locked ? ' <span style="color:#b45309;font-size:0.7rem;">🔒</span>' : '') +
                (fd.increment ? ' <span style="color:#2563eb;font-size:0.7rem;">⇧</span>' : '') +
                (fd.qrField ? ' <span style="color:#7c3aed;font-size:0.7rem;">▦</span>' : '') +
                '</th>';
        }).join('') +
        '<th style="width:40px; text-align:center;">✕</th>' +
        '</tr>';
}

function rebuildBatchTable() {
    buildBatchTable();
    const tbody = document.getElementById('batchTableBody');
    tbody.innerHTML = batchRows.map(function (row, ri) {
        return '<tr class="' + (ri === _selectedBatchRow ? 'batch-row-selected' : '') + '">' +
            '<td style="text-align:center; color:var(--text-muted); font-size:0.8rem;">' + (ri + 1) + '</td>' +
            fieldDefs.map(function (fd, fi) {
                var val = strVal(row[fd.key]);
                if (fd.locked) {
                    return '<td><input type="text" value="' + escHtml(String(val)) + '" readonly ' +
                        'data-row="' + ri + '" data-col="' + fi + '" ' +
                        'style="background:#fef3c7; cursor:pointer;" title="锁定字段不可编辑。请在字段设置中点击 🔒 解锁。点击此处可回填到录入表单"></td>';
                }
                return '<td><input type="text" value="' + escHtml(String(val)) + '" ' +
                    'data-row="' + ri + '" data-col="' + fi + '" ' +
                    'onchange="updateBatchCellByIndex(' + ri + ', ' + fi + ', this.value)" ' +
                    'title="点击可回填到录入表单"></td>';
            }).join('') +
            '<td style="text-align:center;"><button class="del-row-btn" onclick="deleteBatchRow(' + ri + ')" title="删除此行">✕</button></td>' +
            '</tr>';
    }).join('');
    updateBatchCount();
    bindBatchTableEvents();
}

function bindBatchTableEvents() {
    var tbody = document.getElementById('batchTableBody');
    tbody.onclick = function (e) {
        if (e.target.tagName === 'INPUT') {
            var row = parseInt(e.target.getAttribute('data-row'));
            if (!isNaN(row)) {
                // 只切换 CSS，不重建 DOM
                var rows = tbody.querySelectorAll('tr');
                rows.forEach(function (tr, i) {
                    tr.classList.toggle('batch-row-selected', i === row);
                });
                _selectedBatchRow = row;
                fillEntryFromBatch(row);
            }
        }
    };
    tbody.onkeydown = function (e) {
        if (e.target.tagName !== 'INPUT' || e.target.readOnly) return;
        var row = parseInt(e.target.getAttribute('data-row'));
        var col = parseInt(e.target.getAttribute('data-col'));
        if (isNaN(row) || isNaN(col)) return;

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveCurrentCell(row, col, e.target.value);
            if (row + 1 >= batchRows.length) {
                _selectedBatchRow = row;
                addBatchRow();
                rebuildBatchTable();
            }
            _selectedBatchRow = row + 1;
            focusBatchCell(row + 1, col);
        } else if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            saveCurrentCell(row, col, e.target.value);
            _selectedBatchRow = Math.max(0, row - 1);
            focusBatchCell(_selectedBatchRow, col);
        }
    };
}

function saveCurrentCell(row, col, value) {
    if (row >= batchRows.length) return;
    var key = (col < fieldDefs.length) ? fieldDefs[col].key : null;
    if (!key) return;
    batchRows[row][key] = value;
    saveBatchRows();
}

function focusBatchCell(row, col) {
    setTimeout(function () {
        var inp = document.querySelector('#batchTableBody input[data-row="' + row + '"][data-col="' + col + '"]');
        if (inp && !inp.readOnly) { inp.focus(); inp.select(); }
    }, 50);
}

function updateBatchCount() {
    document.getElementById('batchCount').textContent = '(' + batchRows.length + '条)';
}

function addBatchRow(prefill) {
    var row = {};
    var srcRow = _selectedBatchRow >= 0 && _selectedBatchRow < batchRows.length
        ? batchRows[_selectedBatchRow]
        : (batchRows.length > 0 ? batchRows[batchRows.length - 1] : null);
    fieldDefs.forEach(function (fd) {
        if (prefill && prefill[fd.key]) {
            row[fd.key] = prefill[fd.key];
        } else if (srcRow && srcRow[fd.key]) {
            row[fd.key] = srcRow[fd.key];
        } else {
            row[fd.key] = fd.defaultValue || '';
        }
    });
    // 插入到选中行的下一行，否则追加末尾
    var insertAt = _selectedBatchRow >= 0 ? _selectedBatchRow + 1 : batchRows.length;
    batchRows.splice(insertAt, 0, row);
    _selectedBatchRow = insertAt;
    saveBatchRows();
    rebuildBatchTable();
}

function deleteBatchRow(index) {
    batchRows.splice(index, 1);
    if (_selectedBatchRow >= batchRows.length) _selectedBatchRow = batchRows.length - 1;
    saveBatchRows();
    rebuildBatchTable();
}

function updateBatchCell(rowIndex, key, value) {
    if (!batchRows[rowIndex]) return;
    batchRows[rowIndex][key] = value;
    saveBatchRows();
}

function updateBatchCellByIndex(rowIndex, colIndex, value) {
    if (!batchRows[rowIndex] || colIndex >= fieldDefs.length) return;
    batchRows[rowIndex][fieldDefs[colIndex].key] = value;
    saveBatchRows();
}

function autoGenerate() {
    if (fieldDefs.length === 0) {
        alert('请先定义字段');
        return;
    }
    if (batchRows.length === 0) {
        addBatchRow();
        rebuildBatchTable();
    }
    const incrementFields = fieldDefs.filter(function (fd) { return fd.increment; });
    if (incrementFields.length === 0) {
        alert('没有设置递增字段。请在字段管理中为至少一个字段开启"递增"标记。');
        return;
    }
    var countStr = prompt('请输入需要生成的条数（在现有基础上新增）：', '10');
    if (!countStr) return;
    var count = parseInt(countStr, 10);
    if (isNaN(count) || count <= 0) {
        alert('请输入有效的正整数');
        return;
    }

    let lastRow = batchRows[batchRows.length - 1];
    for (var i = 0; i < count; i++) {
        var newRow = {};
        fieldDefs.forEach(function (fd) {
            if (fd.increment && lastRow) {
                var prev = strVal(lastRow[fd.key]);
                newRow[fd.key] = autoIncrementValue(prev);
            } else if (fd.locked || !fd.increment) {
                newRow[fd.key] = lastRow ? strVal(lastRow[fd.key]) : strVal(fd.defaultValue);
            } else {
                newRow[fd.key] = lastRow ? strVal(lastRow[fd.key]) : strVal(fd.defaultValue);
            }
        });
        batchRows.push(newRow);
        lastRow = batchRows[batchRows.length - 1];
    }
    saveBatchRows();
    rebuildBatchTable();
    // Scroll to bottom
    var wrap = document.getElementById('batchTableWrap');
    if (wrap) setTimeout(function () { wrap.scrollLeft = wrap.scrollWidth; }, 100);
}

function autoIncrementValue(val) {
    var m = val.match(/^(.*?)(\d+)$/);
    if (m) {
        var prefix = m[1];
        var numStr = m[2];
        var num = parseInt(numStr, 10);
        var padded = numStr;
        var incremented = (num + 1).toString();
        if (numStr.length > incremented.length) {
            incremented = incremented.padStart(numStr.length, '0');
        }
        return prefix + incremented;
    }
    // If it's a plain number
    if (/^\d+$/.test(val)) {
        var n = parseInt(val, 10);
        return String(n + 1);
    }
    return val;
}

function clearBatchTable() {
    if (!confirm('确定清空全部批量数据吗？')) return;
    batchRows = [];
    _selectedBatchRow = -1;
    saveBatchRows();
    rebuildBatchTable();
}

// ==================== 全屏编辑 ====================

function toggleBatchZoom() {
    var card = document.getElementById('batchCard');
    var overlay = document.getElementById('zoomOverlay');
    if (card.classList.contains('zoomed')) {
        card.classList.remove('zoomed');
        overlay.classList.remove('active');
        document.getElementById('zoomBtn').textContent = '🔍 全屏编辑';
    } else {
        card.classList.add('zoomed');
        overlay.classList.add('active');
        document.getElementById('zoomBtn').textContent = '✕ 退出全屏';
    }
}

// ==================== 区域折叠 ====================

function toggleSection(bodyId, header) {
    var body = document.getElementById(bodyId);
    header.classList.toggle('collapsed');
    body.classList.toggle('collapsed');
}

// ==================== 数据预览 ====================

function updateDataPreview() {
    var container = document.getElementById('dataPreview');
    var data = getEntryFormData();
    var entries = fieldDefs.map(function (fd) {
        return { label: fd.label || fd.key, value: data[fd.key] || '-' };
    });
    if (entries.length === 0) {
        container.innerHTML = '<div class="empty-tip">请先定义字段</div>';
        return;
    }
    var qrtext = buildQRData(data);
    container.innerHTML = '<table class="data-preview-table">' +
        entries.map(function (e) {
            return '<tr><th>' + escHtml(e.label) + '</th><td>' + escHtml(e.value) + '</td></tr>';
        }).join('') +
        '</table>' +
        (qrtext ? '<div style="margin-top:8px; padding:8px 10px; background:#ede9fe; border-radius:6px; ' +
         'border:1px solid #c4b5fd; font-size:0.75rem; word-break:break-all; line-height:1.5;">' +
         '<span style="color:#7c3aed; font-weight:700;">▦ 二维码数据预览</span><br>' +
         '<span style="color:#5b21b6;">' + escHtml(qrtext) + '</span></div>' : '');
}

// ==================== BarTender 打印服务集成 ====================

function getBtServiceUrl() {
    return localStorage.getItem(storageKey('btServiceUrl')) || BARTENDER_SERVICE_URL;
}

async function refreshTemplates() {
    var select = document.getElementById('btTemplateSelect');
    var status = document.getElementById('btPrintStatus');
    select.disabled = true;
    status.textContent = '正在获取模板列表...';
    status.style.color = '#64748b';

    try {
        var resp = await fetch(getBtServiceUrl() + '/api/v1/templates');
        var result = await resp.json();
        var prevVal = select.value;
        select.innerHTML = '<option value="">— 请选择模板 —</option>';

        if (result.templates && result.templates.length > 0) {
            result.templates.forEach(function (t) {
                var opt = document.createElement('option');
                opt.value = t.name;
                opt.textContent = t.name;
                select.appendChild(opt);
            });
            if (prevVal && Array.from(select.options).some(function (o) { return o.value === prevVal; })) {
                select.value = prevVal;
            }
            setBtStatus('已加载 ' + result.templates.length + ' 个模板', '#16a34a');
        } else {
            var opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '(模板目录为空 — 请放入 .btw 文件)';
            opt.disabled = true;
            select.appendChild(opt);
            setBtStatus('未找到 .btw 模板文件，请放入 templates/ 目录', '#dc2626');
        }
    } catch (e) {
        select.innerHTML = '<option value="">— 服务未连接 —</option>';
        setBtStatus('无法连接打印服务: ' + e.message, '#dc2626');
    } finally {
        select.disabled = false;
        _mappingCache = null;
        _mappingTemplate = null;
        buildMappingPanel();
    }
}

async function refreshConfigs() {
    var select = document.getElementById('configSelect');
    select.disabled = true;

    try {
        var resp = await fetch(getBtServiceUrl() + '/api/v1/configs');
        var result = await resp.json();
        select.innerHTML = '<option value="">— 加载配置 —</option>';

        if (result.configs && result.configs.length > 0) {
            result.configs.forEach(function (c) {
                var opt = document.createElement('option');
                opt.value = c.name;
                opt.textContent = c.name.replace('.json', '');
                select.appendChild(opt);
            });
        } else {
            var opt = document.createElement('option');
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
}

async function loadConfig(name) {
    if (!name) return;
    if (!confirm('确定要加载配置 "' + name.replace('.json', '') + '" 吗？\n当前字段定义、字段映射和二维码格式将被覆盖。')) {
        document.getElementById('configSelect').value = '';
        return;
    }

    try {
        var resp = await fetch(getBtServiceUrl() + '/api/v1/configs/' + encodeURIComponent(name));
        if (!resp.ok) {
            alert('加载失败: ' + resp.status);
            document.getElementById('configSelect').value = '';
            return;
        }
        var config = await resp.json();

        // 应用字段定义
        if (config.fieldDefs && Array.isArray(config.fieldDefs)) {
            localStorage.setItem(storageKey('customFieldDefs'), JSON.stringify(config.fieldDefs));
        }
        // 应用 QR 格式
        if (typeof config.qrFormat === 'string') {
            localStorage.setItem(storageKey('qrFormat'), config.qrFormat);
        }
        // 应用字段映射（存到当前模板名下）
        var templateName = document.getElementById('btTemplateSelect').value;
        if (config.mapping && Array.isArray(config.mapping)) {
            localStorage.setItem(storageKey('btMapping_' + templateName), JSON.stringify(config.mapping));
        }

        // 重新加载并刷新
        loadFieldDefs();
        _mappingCache = null;
        _mappingTemplate = null;
        refreshAll();
        onDefaultPrinterChange();
        setBtStatus('已加载配置: ' + name.replace('.json', ''), '#16a34a');
        document.getElementById('configSelect').value = '';
    } catch (e) {
        alert('加载配置失败: ' + e.message);
        document.getElementById('configSelect').value = '';
    }
}

function setBtStatus(msg, color) {
    var el = document.getElementById('btPrintStatus');
    el.textContent = msg;
    el.style.color = color;
}

function onDefaultPrinterChange() {
    var useDefault = document.getElementById('btUseDefaultPrinter').checked;
    var input = document.getElementById('btPrinterName');
    input.disabled = useDefault;
    input.style.opacity = useDefault ? '0.4' : '1';
    localStorage.setItem(storageKey('btUseDefaultPrinter'), useDefault);
}

function onTemplateChange() {
    _mappingCache = null;
    _mappingTemplate = null;
    buildMappingPanel();
}

function restoreBartenderSettings() {
    var savedPrinter = localStorage.getItem(storageKey('btPrinterName'));
    if (savedPrinter) document.getElementById('btPrinterName').value = savedPrinter;
    document.getElementById('btPrinterName').addEventListener('change', function () {
        localStorage.setItem(storageKey('btPrinterName'), this.value);
    });
    var useDefault = localStorage.getItem(storageKey('btUseDefaultPrinter')) === 'true';
    document.getElementById('btUseDefaultPrinter').checked = useDefault;
    var savedCopies = localStorage.getItem(storageKey('btCopies'));
    if (savedCopies) document.getElementById('btCopies').value = savedCopies;
    document.getElementById('btCopies').addEventListener('change', function () {
        localStorage.setItem(storageKey('btCopies'), this.value);
    });
}

// ==================== 字段映射 ====================

function getFormFieldKeys() {
    var keys = fieldDefs.map(function (fd) { return fd.key; });
    keys.push('qrdata');
    return keys;
}

function getDefaultMapping() {
    var keys = getFormFieldKeys();
    return keys.map(function (k) {
        var fd = fieldDefs.find(function (f) { return f.key === k; });
        return {
            key: k,
            templateVar: k,
            value: fd ? (fd.defaultValue || '') : '',
            source: 'form'
        };
    });
}

function getFieldMappingFor(templateName) {
    var key = storageKey('btMapping_' + templateName);
    if (_mappingCache && _mappingTemplate === templateName) return _mappingCache;
    var saved = localStorage.getItem(key);
    if (saved) {
        try {
            _mappingCache = JSON.parse(saved);
            _mappingTemplate = templateName;
            return _mappingCache;
        } catch (e) { /* fall through */ }
    }
    _mappingCache = getDefaultMapping();
    _mappingTemplate = templateName;
    return _mappingCache;
}

function persistMapping() {
    var templateName = document.getElementById('btTemplateSelect').value;
    if (!templateName) return;
    localStorage.setItem(storageKey('btMapping_' + templateName), JSON.stringify(_mappingCache));
    _mappingTemplate = templateName;
}

function getBtPrintData(fields) {
    var templateName = document.getElementById('btTemplateSelect').value;
    getFieldMappingFor(templateName);
    var data = {};
    var qrdata = fields ? buildQRData(fields) : '';
    _mappingCache.forEach(function (item) {
        if (!item.templateVar) return;
        if (item.source === 'form') {
            if (item.key === 'qrdata') {
                data[item.templateVar] = qrdata;
            } else {
                var v = fields && fields[item.key];
                data[item.templateVar] = (v !== undefined && v !== null) ? toBarTenderText(v) : '';
            }
        } else {
            data[item.templateVar] = toBarTenderText(strVal(item.value));
        }
    });
    return data;
}

// \n → 实际换行符，用于 BarTender 多行文本
function toBarTenderText(str) {
    return String(str).replace(/\\n/g, '\n');
}

function toggleMappingPanel() {
    var panel = document.getElementById('btMappingPanel');
    var btn = document.getElementById('btMappingBtn');
    if (panel.style.display === 'none' || !panel.style.display) {
        panel.style.display = 'block';
        btn.style.borderColor = 'var(--primary)';
        btn.style.color = 'var(--primary)';
        _mappingCache = null;
        _mappingTemplate = null;
        buildMappingPanel();
    } else {
        panel.style.display = 'none';
        btn.style.borderColor = '';
        btn.style.color = '';
    }
}

function buildMappingPanel() {
    var container = document.getElementById('btMappingFields');
    if (!container) return;
    var templateName = document.getElementById('btTemplateSelect').value;
    getFieldMappingFor(templateName);
    container.innerHTML = '';

    _mappingCache.forEach(function (item, idx) {
        var div = document.createElement('div');
        div.style.display = 'flex';
        div.style.gap = '6px';
        div.style.alignItems = 'center';

        if (item.source === 'form') {
            var sel = document.createElement('select');
            sel.style.flex = '1';
            sel.style.padding = '6px';
            sel.style.border = '1px solid var(--border)';
            sel.style.borderRadius = '4px';
            sel.style.fontSize = '0.78rem';
            sel.style.background = '#fff';
            var emptyOpt = document.createElement('option');
            emptyOpt.value = '';
            emptyOpt.textContent = '— 选择字段 —';
            sel.appendChild(emptyOpt);
            getFormFieldKeys().forEach(function (k) {
                var opt = document.createElement('option');
                opt.value = k;
                var fd = fieldDefs.find(function (f) { return f.key === k; });
                if (k === 'qrdata') {
                    opt.textContent = '▦ 二维码数据 (qrdata)';
                } else {
                    opt.textContent = (fd ? fd.label + ' (' + k + ')' : k);
                }
                if (k === item.key) opt.selected = true;
                sel.appendChild(opt);
            });
            sel.setAttribute('data-mapping-idx', idx);
            sel.setAttribute('data-mapping-prop', 'key');
            sel.onchange = function () {
                _mappingCache[parseInt(this.getAttribute('data-mapping-idx'))].key = this.value;
                if (this.value) {
                    _mappingCache[parseInt(this.getAttribute('data-mapping-idx'))].source = 'form';
                }
                persistMapping();
            };
            div.appendChild(sel);
        } else {
            var keyInp = document.createElement('input');
            keyInp.type = 'text';
            keyInp.placeholder = '固定值';
            keyInp.value = item.key || '';
            keyInp.style.flex = '1';
            keyInp.style.padding = '6px';
            keyInp.style.border = '1px solid var(--border)';
            keyInp.style.borderRadius = '4px';
            keyInp.style.fontSize = '0.78rem';
            keyInp.setAttribute('data-mapping-idx', idx);
            keyInp.setAttribute('data-mapping-prop', 'key');
            keyInp.onchange = function () {
                _mappingCache[parseInt(this.getAttribute('data-mapping-idx'))].key = this.value;
                persistMapping();
            };
            div.appendChild(keyInp);

            var valInp = document.createElement('input');
            valInp.type = 'text';
            valInp.placeholder = '值';
            valInp.value = item.value || '';
            valInp.style.flex = '1';
            valInp.style.padding = '6px';
            valInp.style.border = '1px solid var(--border)';
            valInp.style.borderRadius = '4px';
            valInp.style.fontSize = '0.78rem';
            valInp.setAttribute('data-mapping-idx', idx);
            valInp.setAttribute('data-mapping-prop', 'value');
            valInp.onchange = function () {
                _mappingCache[parseInt(this.getAttribute('data-mapping-idx'))].value = this.value;
                persistMapping();
            };
            div.appendChild(valInp);
        }

        var varInp = document.createElement('input');
        varInp.type = 'text';
        varInp.placeholder = '模板变量名';
        varInp.value = item.templateVar || '';
        varInp.style.flex = '1';
        varInp.style.padding = '6px';
        varInp.style.border = '1px solid var(--border)';
        varInp.style.borderRadius = '4px';
        varInp.style.fontSize = '0.78rem';
        varInp.setAttribute('data-mapping-idx', idx);
        varInp.setAttribute('data-mapping-prop', 'templateVar');
        varInp.onchange = function () {
            _mappingCache[parseInt(this.getAttribute('data-mapping-idx'))].templateVar = this.value;
            persistMapping();
        };
        div.appendChild(varInp);

        var delBtn = document.createElement('button');
        delBtn.textContent = '✕';
        delBtn.style.background = 'none';
        delBtn.style.border = 'none';
        delBtn.style.color = '#ef4444';
        delBtn.style.cursor = 'pointer';
        delBtn.style.fontSize = '1rem';
        delBtn.style.padding = '4px 6px';
        delBtn.style.borderRadius = '4px';
        delBtn.onclick = function () {
            deleteMappingField(idx);
        };
        div.appendChild(delBtn);

        container.appendChild(div);
    });
}

function addMappingField() {
    _mappingCache.push({ key: '', templateVar: '', value: '', source: 'form' });
    persistMapping();
    buildMappingPanel();
    setTimeout(function () {
        var inps = document.querySelectorAll('#btMappingFields input[data-mapping-prop="templateVar"]');
        if (inps.length > 0) inps[inps.length - 1].focus();
    }, 50);
}

function deleteMappingField(idx) {
    _mappingCache.splice(idx, 1);
    persistMapping();
    buildMappingPanel();
}

function saveFieldMapping() {
    var templateName = document.getElementById('btTemplateSelect').value;
    if (!templateName) {
        setBtStatus('请先选择一个模板', '#dc2626');
        return;
    }
    var newMapping = [];
    var rows = document.querySelectorAll('#btMappingFields > div');
    var formKeys = getFormFieldKeys();
    rows.forEach(function (row) {
        var keyInp = row.querySelector('[data-mapping-prop="key"]');
        var varInp = row.querySelector('[data-mapping-prop="templateVar"]');
        var valInp = row.querySelector('[data-mapping-prop="value"]');
        var key = keyInp ? keyInp.value.trim() : '';
        var templateVar = varInp ? varInp.value.trim() : '';
        var isFormField = formKeys.includes(key);
        newMapping.push({
            key: key,
            templateVar: templateVar,
            value: isFormField ? '' : (valInp ? valInp.value : ''),
            source: isFormField ? 'form' : 'static'
        });
    });
    _mappingCache = newMapping;
    persistMapping();
    setBtStatus('字段映射已保存', '#16a34a');
    buildMappingPanel();
}

function resetFieldMapping() {
    var templateName = document.getElementById('btTemplateSelect').value;
    if (!templateName) return;
    if (!confirm('确定重置为默认映射吗？')) return;
    _mappingCache = getDefaultMapping();
    _mappingTemplate = templateName || '__default__';
    localStorage.removeItem(storageKey('btMapping_' + templateName));
    buildMappingPanel();
    setBtStatus('已重置为默认映射', '#64748b');
}

function importMapping() {
    var templateName = document.getElementById('btTemplateSelect').value;
    if (!templateName) {
        alert('请先选择一个模板');
        return;
    }
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function () {
        var file = this.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
            try {
                var data = JSON.parse(reader.result);
                if (!Array.isArray(data)) throw new Error('格式错误');
                _mappingCache = data;
                persistMapping();
                buildMappingPanel();
                setBtStatus('映射已导入', '#16a34a');
            } catch (e) {
                alert('导入失败：文件格式不正确');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function exportMapping() {
    var templateName = document.getElementById('btTemplateSelect').value;
    if (!templateName) {
        alert('请先选择一个模板');
        return;
    }
    getFieldMappingFor(templateName);
    var blob = new Blob([JSON.stringify(_mappingCache, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'mapping_' + templateName.replace('.btw', '') + '_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

// ==================== 发送到 BarTender ====================

function disablePrintButtons() {
    document.getElementById('btPrintBtn').disabled = true;
    var batchBtn = document.getElementById('btBatchBtn');
    if (batchBtn) batchBtn.disabled = true;
}

function enablePrintButtons() {
    document.getElementById('btPrintBtn').disabled = false;
    document.getElementById('btPrintBtn').textContent = '▦ 发送至 BarTender 打印';
    var batchBtn = document.getElementById('btBatchBtn');
    if (batchBtn) batchBtn.disabled = false;
}

function singleSendToBartender() {
    var templateName = document.getElementById('btTemplateSelect').value;
    var useDefault = document.getElementById('btUseDefaultPrinter').checked;
    var printerName = useDefault ? '' : document.getElementById('btPrinterName').value.trim();
    var copies = parseInt(document.getElementById('btCopies').value) || 1;

    if (!templateName) {
        setBtStatus('请先选择 BarTender 模板', '#dc2626');
        return;
    }
    if (!useDefault && !printerName) {
        setBtStatus('请填写打印机名称或勾选"模板默认"', '#dc2626');
        return;
    }

    var fields = getEntryFormData();
    var printData = getBtPrintData(fields);

    disablePrintButtons();
    bartenderPrint(printData, templateName, printerName, copies);
}

function batchSendToBartender() {
    if (batchRows.length === 0) {
        alert('批量表中没有数据。请先在录入表单中填写数据并"保存到批量表"，或使用智能递增生成数据。');
        return;
    }

    var templateName = document.getElementById('btTemplateSelect').value;
    var useDefault = document.getElementById('btUseDefaultPrinter').checked;
    var printerName = useDefault ? '' : document.getElementById('btPrinterName').value.trim();
    var copies = parseInt(document.getElementById('btCopies').value) || 1;

    if (!templateName) {
        alert('请先在右侧 BarTender 专业打印中选择模板');
        return;
    }
    if (!useDefault && !printerName) {
        alert('请填写打印机名称或勾选"模板默认"');
        return;
    }
    if (!confirm('确定要将 ' + batchRows.length + ' 条数据发送至 BarTender 打印吗？')) return;

    disablePrintButtons();
    setBtStatus('正在批量打印 ' + batchRows.length + ' 个标签...', '#64748b');

    var completed = 0;
    var failed = 0;
    var rows = batchRows.slice();

    var sendNext = async function (index) {
        if (index >= rows.length) {
            var msg = '批量打印完成: 成功 ' + completed + ' / 失败 ' + failed;
            setBtStatus(msg, failed > 0 ? '#dc2626' : '#16a34a');
            addPrintLog(templateName, completed, failed);
            enablePrintButtons();
            return;
        }
        try {
            var printData = getBtPrintData(rows[index]);
            var resp = await fetch(getBtServiceUrl() + '/api/v1/print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template_name: templateName,
                    printer_name: printerName,
                    copies: copies,
                    data: printData
                })
            });
            if (resp.ok) { completed++; } else { failed++; }
        } catch (e) {
            failed++;
        }
        setBtStatus('批量打印中: ' + (index + 1) + ' / ' + rows.length +
            ' (成功 ' + completed + ' / 失败 ' + failed + ')', '#64748b');
        setTimeout(function () { sendNext(index + 1); }, 300);
    };

    sendNext(0);
}

async function bartenderPrint(printData, templateName, printerName, copies) {
    var btn = document.getElementById('btPrintBtn');
    btn.textContent = '正在发送打印...';

    try {
        var resp = await fetch(getBtServiceUrl() + '/api/v1/print', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                template_name: templateName,
                printer_name: printerName,
                copies: copies,
                data: printData
            })
        });
        var result = await resp.json();
        if (resp.ok) {
            setBtStatus('打印成功: ' + (result.message || '已发送'), '#16a34a');
            addPrintLog(templateName, 1, 0);
        } else {
            setBtStatus('打印失败: ' + (result.detail || '未知错误'), '#dc2626');
            addPrintLog(templateName, 0, 1);
        }
    } catch (e) {
        setBtStatus('请求失败: ' + e.message, '#dc2626');
        addPrintLog(templateName, 0, 1);
    } finally {
        enablePrintButtons();
    }
}

// ==================== 打印日志 ====================

function loadPrintLog() {
    var saved = localStorage.getItem(storageKey('printLog'));
    if (saved) {
        try { printLog = JSON.parse(saved); } catch (e) { printLog = []; }
    }
}

function savePrintLog() {
    if (printLog.length > 100) printLog = printLog.slice(-100);
    localStorage.setItem(storageKey('printLog'), JSON.stringify(printLog));
}

function addPrintLog(templateName, success, failed) {
    printLog.unshift({
        time: new Date().toLocaleString('zh-CN'),
        template: templateName,
        success: success,
        failed: failed
    });
    savePrintLog();
    renderPrintLog();
}

function renderPrintLog() {
    var container = document.getElementById('printLogList');
    if (printLog.length === 0) {
        container.innerHTML = '<div class="empty-tip">暂无记录</div>';
        return;
    }
    container.innerHTML = printLog.map(function (log) {
        var icon = log.failed > 0 ? '❌' : '✅';
        var color = log.failed > 0 ? '#dc2626' : '#16a34a';
        var msg = '成功 ' + log.success;
        if (log.failed > 0) msg += ' / 失败 ' + log.failed;
        return '<div class="history-item" style="border-left:3px solid ' + color + ';">' +
            '<div class="hist-main">' + icon + ' ' + msg + '</div>' +
            '<div style="font-size:0.75rem;">模板: ' + escHtml(log.template) + '</div>' +
            '<div class="hist-time">' + log.time + '</div>' +
            '</div>';
    }).join('');
}

function clearPrintLog() {
    if (!confirm('确定清空所有发送记录吗？')) return;
    printLog = [];
    savePrintLog();
    renderPrintLog();
}

// ==================== 刷新全部UI ====================

function refreshAll() {
    var savedFormData = getEntryFormData();
    buildFieldDefList();
    validateFieldKeys();
    buildEntryForm();
    restoreEntryFormData(savedFormData);
    rebuildBatchTable();
    updateDataPreview();
    updateFieldStats();
    renderPrintLog();
    updateQrFormatInput();
    _mappingCache = null;
    _mappingTemplate = null;
    buildMappingPanel();
}

function openFieldSettings() {
    updateQrFormatInput();
    updateQrFormatHint();
    document.getElementById('fieldSettingsOverlay').style.display = 'flex';
}

function closeFieldSettings() {
    document.getElementById('fieldSettingsOverlay').style.display = 'none';
    refreshAll();
}

function updateFieldStats() {
    var el = document.getElementById('fieldStats');
    if (el) el.textContent = fieldDefs.length + ' 个字段';
    var qrEl = document.getElementById('qrStats');
    if (qrEl) {
        var format = getQrFormat();
        qrEl.textContent = format ? 'QR: ' + (format.length > 30 ? format.substring(0, 30) + '...' : format) : 'QR: 未设置';
    }
}

function restoreEntryFormData(data) {
    if (!data) return;
    fieldDefs.forEach(function (fd, i) {
        var el = document.getElementById('ef_' + i);
        if (el && data[fd.key] !== undefined && fd.key !== 'qrdata') {
            el.value = data[fd.key];
        }
    });
}

function updateQrFormatInput() {
    var el = document.getElementById('qrFormatInput');
    if (el) el.value = getQrFormat();
    updateQrFormatHint();
}
