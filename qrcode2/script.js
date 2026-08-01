// ===== 默认字段定义 =====
const DEFAULT_FIELD_DEFS = [
    { key: 'chanpin', label: '产品', defaultValue: '三变科技股份有限公司 110kV 电力变压器', locked: true, increment: false, qrField: true },
    { key: 'pihao', label: '批号', defaultValue: '', locked: false, increment: true, qrField: true },
    { key: 'xinghao', label: '型号', defaultValue: '', locked: false, increment: false, qrField: true },
    { key: 'guige', label: '规格', defaultValue: '', locked: false, increment: false, qrField: true },
    { key: 'panpinhao', label: '盘品号', defaultValue: '', locked: false, increment: true, qrField: true },
    { key: 'maochong', label: '毛重', defaultValue: '', locked: false, increment: false, qrField: false },
    { key: 'jingzhong', label: '净重', defaultValue: '', locked: false, increment: false, qrField: false },
    { key: 'changdu', label: '长度', defaultValue: '', locked: false, increment: false, qrField: false },
    { key: 'riqi', label: '日期', defaultValue: '', locked: false, increment: false, qrField: false },
    { key: 'jianyanyuan', label: '检验员', defaultValue: '', locked: true, increment: false, qrField: false }
];

const DEFAULT_QR_FORMAT = '{pihao}；{chanpin}；{xinghao}；{guige}；{panpinhao}；毛重:{maochong}kg；净重:{jingzhong}kg；{riqi}';

// ===== 全局状态 =====
let fieldDefs = [];
let batchRows = [];
let printLog = [];

// ===== BarTender 映射状态 =====
const BARTENDER_SERVICE_URL = localStorage.getItem('btServiceUrl') || 'http://localhost:8000';
let _mappingCache = null;
let _mappingTemplate = null;

// ===== 初始化 =====
window.onload = function () {
    loadFieldDefs();
    loadBatchRows();
    loadPrintLog();
    refreshAll();
    refreshTemplates();
    restoreBartenderSettings();
    onDefaultPrinterChange();
    buildMappingPanel();
};

// ==================== 字段定义管理 ====================

function loadFieldDefs() {
    const saved = localStorage.getItem('customFieldDefs');
    if (saved) {
        try {
            fieldDefs = JSON.parse(saved);
            if (!Array.isArray(fieldDefs) || fieldDefs.length === 0) throw new Error('empty');
        } catch (e) {
            fieldDefs = JSON.parse(JSON.stringify(DEFAULT_FIELD_DEFS));
        }
    } else {
        fieldDefs = JSON.parse(JSON.stringify(DEFAULT_FIELD_DEFS));
    }
}

function saveFieldDefs() {
    localStorage.setItem('customFieldDefs', JSON.stringify(fieldDefs));
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
    fieldDefs.splice(index, 1);
    // Also remove column data from batch rows
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
        if (fields && fields[key]) return fields[key];
        var fd = fieldDefs.find(function (f) { return f.key === key; });
        return fd ? (fd.defaultValue || '') : '';
    });
}

function getQrFormat() {
    return localStorage.getItem('qrFormat') || DEFAULT_QR_FORMAT;
}

function saveQrFormat() {
    var val = document.getElementById('qrFormatInput').value;
    localStorage.setItem('qrFormat', val);
    updateDataPreview();
    updateQrFormatHint();
}

function resetQrFormat() {
    if (!confirm('确定重置为默认二维码组合格式吗？')) return;
    document.getElementById('qrFormatInput').value = DEFAULT_QR_FORMAT;
    localStorage.setItem('qrFormat', DEFAULT_QR_FORMAT);
    updateQrFormatHint();
    updateDataPreview();
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
        if (el) el.value = row[fd.key] || '';
    });
    updateDataPreview();
}

// ==================== 批量数据表 ====================

function loadBatchRows() {
    const saved = localStorage.getItem('batchTableData');
    if (saved) {
        try { batchRows = JSON.parse(saved); } catch (e) { batchRows = []; }
    }
}

function saveBatchRows() {
    localStorage.setItem('batchTableData', JSON.stringify(batchRows));
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
        return '<tr>' +
            '<td style="text-align:center; color:var(--text-muted); font-size:0.8rem;">' + (ri + 1) + '</td>' +
            fieldDefs.map(function (fd, fi) {
                var val = row[fd.key] || '';
                if (fd.locked) {
                    return '<td><input type="text" value="' + escHtml(val) + '" onclick="fillEntryFromBatch(' + ri + ')" readonly ' +
                        'style="background:#fef3c7; cursor:pointer;" title="锁定字段不可编辑。请在顶部字段管理中点击 🔒 解锁此字段。点击此处可回填到录入表单"></td>';
                }
                return '<td><input type="text" value="' + escHtml(val) + '" ' +
                    'onchange="updateBatchCell(' + ri + ', \'' + fd.key + '\', this.value)" ' +
                    'onclick="fillEntryFromBatch(' + ri + ')" title="点击可回填到录入表单"></td>';
            }).join('') +
            '<td style="text-align:center;"><button class="del-row-btn" onclick="deleteBatchRow(' + ri + ')" title="删除此行">✕</button></td>' +
            '</tr>';
    }).join('');
    updateBatchCount();
}

function updateBatchCount() {
    document.getElementById('batchCount').textContent = '(' + batchRows.length + '条)';
}

function getBatchTableData() {
    return batchRows;
}

function addBatchRow(prefill) {
    var row = {};
    fieldDefs.forEach(function (fd) {
        row[fd.key] = (prefill && prefill[fd.key]) ? prefill[fd.key] : (fd.defaultValue || '');
    });
    batchRows.push(row);
    saveBatchRows();
    rebuildBatchTable();
}

function deleteBatchRow(index) {
    batchRows.splice(index, 1);
    saveBatchRows();
    rebuildBatchTable();
}

function updateBatchCell(rowIndex, key, value) {
    if (!batchRows[rowIndex]) return;
    batchRows[rowIndex][key] = value;
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
                var prev = lastRow[fd.key] || '';
                newRow[fd.key] = autoIncrementValue(prev);
            } else if (fd.locked || !fd.increment) {
                newRow[fd.key] = lastRow ? (lastRow[fd.key] || fd.defaultValue || '') : (fd.defaultValue || '');
            } else {
                newRow[fd.key] = lastRow ? (lastRow[fd.key] || fd.defaultValue || '') : (fd.defaultValue || '');
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
    return localStorage.getItem('btServiceUrl') || BARTENDER_SERVICE_URL;
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
    localStorage.setItem('btUseDefaultPrinter', useDefault);
}

function onTemplateChange() {
    _mappingCache = null;
    _mappingTemplate = null;
    buildMappingPanel();
}

function restoreBartenderSettings() {
    var savedPrinter = localStorage.getItem('btPrinterName');
    if (savedPrinter) document.getElementById('btPrinterName').value = savedPrinter;
    document.getElementById('btPrinterName').addEventListener('change', function () {
        localStorage.setItem('btPrinterName', this.value);
    });
    var useDefault = localStorage.getItem('btUseDefaultPrinter') === 'true';
    document.getElementById('btUseDefaultPrinter').checked = useDefault;
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
    var key = 'btMapping_' + templateName;
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
    localStorage.setItem('btMapping_' + templateName, JSON.stringify(_mappingCache));
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
                data[item.templateVar] = (fields && fields[item.key]) ? fields[item.key] : '';
            }
        } else {
            data[item.templateVar] = item.value || '';
        }
    });
    return data;
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
    var formFields = getEntryFormData();

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
    _mappingCache.push({ key: '', templateVar: '', value: '', source: 'static' });
    persistMapping();
    buildMappingPanel();
    setTimeout(function () {
        var inp = document.querySelector('#btMappingFields input[data-mapping-prop="templateVar"]');
        if (inp) inp.focus();
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
    localStorage.removeItem('btMapping_' + templateName);
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
    var saved = localStorage.getItem('printLog');
    if (saved) {
        try { printLog = JSON.parse(saved); } catch (e) { printLog = []; }
    }
}

function savePrintLog() {
    // Keep only last 100 entries
    if (printLog.length > 100) printLog = printLog.slice(-100);
    localStorage.setItem('printLog', JSON.stringify(printLog));
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
    buildBatchTable();
    rebuildBatchTable();
    updateDataPreview();
    renderPrintLog();
    updateQrFormatInput();
    _mappingCache = null;
    _mappingTemplate = null;
    buildMappingPanel();
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
