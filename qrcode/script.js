// ===== 字段配置 =====
// 哪些字段默认锁定 (true = 值不变，下次生成时保留)
const lockState = {
    pihao: false,
    xinghao: false,
    guige: false,
    panpinhao: false,
    maochong: false,
    jingzhong: false,
    riqi: false,
    jianyanyuan: true   // 检验员默认锁定
};

// 固定字段 (始终不可修改)
const fixedFields = ['chanpin'];

// 每个标签页独立 ID（通过 window.name 持久化，不显示在 URL 中）
let tabId = window.name || '';
if (!tabId) {
    tabId = Math.random().toString(36).slice(2, 8);
    window.name = tabId;
}

// 历史记录（全局共享）
let qrHistory = JSON.parse(localStorage.getItem('qrHistory') || '[]');

// 维护标签页注册表，定期清理超过 30 天的旧数据
function updateTabRegistry() {
    const list = JSON.parse(localStorage.getItem('qrTabList') || '{}');
    list[tabId] = Date.now();
    // 清理超过 30 天的旧标签数据
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    for (const id in list) {
        if (list[id] < cutoff) {
            delete list[id];
            localStorage.removeItem('qrTab_' + id);
        }
    }
    localStorage.setItem('qrTabList', JSON.stringify(list));
}

// ===== 初始化 =====
window.onload = function () {
    restoreLockStates();
    renderHistory();
    buildBatchTable();
    restoreBatchTable();
    generateQR();
    updatePageTitle();
    const allKeys = Object.keys(lockState).concat('chanpin');
    allKeys.forEach(key => {
        const el = document.getElementById('f_' + key);
        if (el) el.addEventListener('input', saveFormValues);
    });
    // 批量表格输入时自动保存
    document.getElementById('batchTableBody').addEventListener('input', function(e) {
        if (e.target.tagName === 'INPUT') saveFormValues();
    });
    window.addEventListener('beforeunload', saveFormValues);
    window.addEventListener('pagehide', saveFormValues);
    // Service Worker 离线缓存（file:// 下静默失败，localhost/http-server 下自动启用）
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
};

function restoreLockStates() {
    const saved = JSON.parse(localStorage.getItem('qrTab_' + tabId) || '{}');
    const savedLockState = saved.lockState || {};
    for (const key in savedLockState) {
        if (key in lockState) lockState[key] = savedLockState[key];
    }
    for (const key in lockState) {
        updateLockUI(key);
    }
    const savedValues = saved.values || {};
    for (const key in savedValues) {
        const el = document.getElementById('f_' + key);
        if (el) el.value = savedValues[key];
    }
}

function restoreBatchTable() {
    const saved = JSON.parse(localStorage.getItem('qrTab_' + tabId) || '{}');
    const batchData = saved.batchData || [];
    if (batchData.length > 0) {
        const tbody = document.getElementById('batchTableBody');
        tbody.innerHTML = '';
        batchData.forEach(d => addBatchRow(d));
    }
}

function saveFormValues() {
    const data = { lockState: {}, values: {}, batchData: [] };
    for (const key in lockState) {
        data.lockState[key] = lockState[key];
        const el = document.getElementById('f_' + key);
        if (el) data.values[key] = el.value;
    }
    const chanpinEl = document.getElementById('f_chanpin');
    if (chanpinEl) data.values.chanpin = chanpinEl.value;
    // 保存批量表格数据
    const rows = document.getElementById('batchTableBody').querySelectorAll('tr');
    rows.forEach(tr => {
        const row = {};
        let hasValue = false;
        tr.querySelectorAll('input[data-key]').forEach(inp => {
            row[inp.dataset.key] = inp.value;
            if (inp.value.trim()) hasValue = true;
        });
        if (hasValue) data.batchData.push(row);
    });
    localStorage.setItem('qrTab_' + tabId, JSON.stringify(data));
    updateTabRegistry();
    updatePageTitle();
}

function updatePageTitle() {
    const f = getFields();
    const parts = [];
    if (f.pihao) parts.push(f.pihao);
    if (f.xinghao || f.guige) parts.push((f.xinghao + ' ' + f.guige).trim());
    const prefix = parts.length > 0 ? parts.join(' | ') + ' — ' : '';
    document.title = prefix + '二维码生成器';
}

// ===== 锁定/解锁 =====
function toggleLock(key) {
    lockState[key] = !lockState[key];
    updateLockUI(key);
    saveFormValues();
    buildBatchTable(); // 锁定状态改变后重建表格列
}

function updateLockUI(key) {
    const btn = document.getElementById('lock_' + key);
    const input = document.getElementById('f_' + key);
    if (!btn) return;
    if (lockState[key]) {
        btn.textContent = '🔒';
        btn.classList.add('locked');
        btn.title = '已锁定 — 点击解锁';
        if (input) {
            input.classList.add('is-fixed');
            input.readOnly = true; // 锁定后基础信息里的输入框不可编辑
            // Add fixed badge to label
            const label = input.closest('.field-group')?.querySelector('label');
            if (label && !label.querySelector('.fixed-badge')) {
                const badge = document.createElement('span');
                badge.className = 'fixed-badge';
                badge.textContent = '固定';
                label.appendChild(badge);
            }
        }
    } else {
        btn.textContent = '🔓';
        btn.classList.remove('locked');
        btn.title = '未锁定 — 点击锁定';
        if (input) {
            input.classList.remove('is-fixed');
            input.readOnly = false; // 解锁后可编辑
            const label = input.closest('.field-group')?.querySelector('label');
            if (label) {
                const badge = label.querySelector('.fixed-badge');
                if (badge) badge.remove();
            }
        }
    }
}

// ===== 获取当前字段值 =====
function getFields() {
    return {
        pihao: document.getElementById('f_pihao').value.trim(),
        chanpin: document.getElementById('f_chanpin').value.trim(),
        xinghao: document.getElementById('f_xinghao').value.trim(),
        guige: document.getElementById('f_guige').value.trim(),
        panpinhao: document.getElementById('f_panpinhao').value.trim(),
        maochong: document.getElementById('f_maochong').value.trim(),
        jingzhong: document.getElementById('f_jingzhong').value.trim(),
        riqi: document.getElementById('f_riqi').value.trim(),
        jianyanyuan: document.getElementById('f_jianyanyuan').value.trim(),
    };
}

// ===== 组装二维码内容 (完整格式含中文) =====
function buildQRContent(fields) {
    // 输出格式: 批号；产品名；\n型号；规格；\n盘品号；\n毛重；净重；日期；检验员
    return `${fields.pihao}；${fields.chanpin}；\n${fields.xinghao}；${fields.guige}；\n${fields.panpinhao}；\n${fields.maochong}；${fields.jingzhong}；${fields.riqi}；${fields.jianyanyuan}`;
}

// ===== 生成二维码 (qrcode-generator + UTF-8 中文支持) =====
function generateQR() {
    const fields = getFields();
    const text = buildQRContent(fields);

    const wrap = document.getElementById('qrWrap');
    wrap.innerHTML = '';

    try {
        const canvas = renderQRCanvas(text, 400);
        wrap.appendChild(canvas);
    } catch (e) {
        wrap.innerHTML = `<div class="qr-placeholder"><div class="icon">⚠</div><div>生成失败: ${e.message}</div></div>`;
        return;
    }

    updateTextPreview(fields);
    addHistory(fields, text);
    saveFormValues();
}

function updateTextPreview(fields) {
    const el = document.getElementById('qrTextPreview');
    el.innerHTML = [
        `<strong>批号:</strong> ${fields.pihao}`,
        `<strong>产品:</strong> ${fields.chanpin}`,
        `<strong>型号:</strong> ${fields.xinghao}`,
        `<strong>规格:</strong> ${fields.guige}`,
        `<strong>盘品号:</strong> ${fields.panpinhao}`,
        `<strong>毛重:</strong> ${fields.maochong} kg`,
        `<strong>净重:</strong> ${fields.jingzhong} kg`,
        `<strong>生产日期:</strong> ${fields.riqi}`,
        `<strong>产地:</strong> ${fields.jianyanyuan}`,
    ].join('<br>');
}

// ===== 下载 =====
function downloadQR() {
    const wrap = document.getElementById('qrWrap');
    const canvas = wrap.querySelector('canvas');
    const fields = getFields();
    const match = (fields.pihao || '').match(/(\d{1,4})$/);
    const num = match ? parseInt(match[1], 10) : 0;
    const filename = `${num}.png`;
    if (!canvas) return alert('请先生成二维码');
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// ===== 清空可变字段 =====
function clearUnlocked() {
    const fields = ['pihao', 'xinghao', 'guige', 'panpinhao', 'maochong', 'jingzhong', 'riqi'];
    fields.forEach(key => {
        if (!lockState[key]) {
            const el = document.getElementById('f_' + key);
            if (el) el.value = '';
        }
    });
}

function importLastSession() {
    const list = JSON.parse(localStorage.getItem('qrTabList') || '{}');
    const otherIds = Object.keys(list).filter(id => id !== tabId && localStorage.getItem('qrTab_' + id));
    if (otherIds.length === 0) {
        alert('没有找到其他标签页的数据');
        return;
    }
    if (otherIds.length === 1) {
        doImportSession(otherIds[0]);
        return;
    }
    showImportPicker(otherIds, list);
}

function doImportSession(sourceId) {
    const saved = JSON.parse(localStorage.getItem('qrTab_' + sourceId) || '{}');
    const vals = saved.values || {};
    const batchData = saved.batchData || [];
    let hasData = false;
    for (const key in vals) { if (vals[key]) { hasData = true; break; } }
    if (!hasData && batchData.length === 0) {
        alert('该标签页没有数据');
        return;
    }
    if (!confirm('将从选中标签页导入主表单、锁定状态和批量表格数据，确定继续？')) return;
    for (const key in vals) {
        const el = document.getElementById('f_' + key);
        if (el) el.value = vals[key];
    }
    const locks = saved.lockState || {};
    for (const key in locks) {
        if (key in lockState) lockState[key] = locks[key];
        updateLockUI(key);
    }
    if (batchData.length > 0) {
        const tbody = document.getElementById('batchTableBody');
        tbody.innerHTML = '';
        batchData.forEach(d => addBatchRow(d));
    }
    generateQR();
}

function showImportPicker(ids, list) {
    const backdrop = document.createElement('div');
    backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:3000;display:flex;align-items:center;justify-content:center;';
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:10px;padding:24px;max-width:420px;width:90%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.2);';
    const title = document.createElement('h3');
    title.textContent = '选择要导入的标签页';
    title.style.cssText = 'margin:0 0 16px;font-size:1rem;color:#1e293b;flex-shrink:0;';
    modal.appendChild(title);
    const p = document.createElement('p');
    p.textContent = '数据来源：各标签页最近一次保存的状态';
    p.style.cssText = 'font-size:0.8rem;color:#64748b;margin-bottom:12px;flex-shrink:0;';
    modal.appendChild(p);

    const listContainer = document.createElement('div');
    listContainer.style.cssText = 'overflow-y:auto;flex:1;min-height:0;padding-bottom:4px;';
    
    ids.forEach(id => {
        const data = JSON.parse(localStorage.getItem('qrTab_' + id) || '{}');
        const vals = data.values || {};
        const line = [vals.pihao, vals.xinghao, vals.guige].filter(Boolean).join(' | ') || '(空)';
        const ts = new Date(list[id]).toLocaleString('zh-CN');
        const btn = document.createElement('button');
        btn.textContent = line;
        btn.title = '最后活动: ' + ts;
        btn.style.cssText = 'display:block;width:100%;margin-bottom:8px;padding:10px 14px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;cursor:pointer;text-align:left;font-size:0.88rem;color:#1e293b;';
        btn.onmouseenter = () => { btn.style.borderColor = '#2563eb'; btn.style.background = '#eff6ff'; };
        btn.onmouseleave = () => { btn.style.borderColor = '#e2e8f0'; btn.style.background = '#f8fafc'; };
        btn.onclick = () => {
            backdrop.remove();
            doImportSession(id);
        };
        listContainer.appendChild(btn);
    });
    modal.appendChild(listContainer);
    
    const cancel = document.createElement('button');
    cancel.textContent = '取消';
    cancel.style.cssText = 'display:block;width:100%;margin-top:12px;padding:8px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;cursor:pointer;font-size:0.85rem;color:#64748b;flex-shrink:0;';
    cancel.onclick = () => backdrop.remove();
    modal.appendChild(cancel);
    
    backdrop.appendChild(modal);
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
    document.body.appendChild(backdrop);
}

// ===== 型号变化时自动更新规格 (复用 specMap 思路) =====
const specMap = {
    "10": "1.2*3.6",
    "16": "1.5*4.5",
    "25": "1.8*5.0",
    "35": "2.8*5",
    "50": "2.5*6",
    "70": "3.0*7",
    "95": "3.5*8",
    "120": "4.0*9",
    "150": "4.5*10",
    "185": "5.0*11",
    "240": "5.5*12",
};

function onXingHaoInput(val) {
    if (lockState.guige) return; // 规格已锁定则不自动填
    const match = String(val).match(/\/(\d+)/) || String(val).match(/-(\d+)/);
    if (match && match[1] && specMap[match[1]]) {
        document.getElementById('f_guige').value = specMap[match[1]];
    }
}

// ===== 历史记录 =====
function addHistory(fields, text) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const item = {
        pihao: fields.pihao,
        panpinhao: fields.panpinhao,
        xinghao: fields.xinghao,
        text,
        time: timeStr,
        ts: Date.now()
    };
    // 避免完全重复的记录
    if (qrHistory.length > 0 && qrHistory[0].text === text) return;
    qrHistory.unshift(item);
    if (qrHistory.length > 20) qrHistory = qrHistory.slice(0, 20);
    localStorage.setItem('qrHistory', JSON.stringify(qrHistory));
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('historyList');
    if (qrHistory.length === 0) {
        list.innerHTML = '<div class="empty-tip">暂无记录</div>';
        return;
    }
    list.innerHTML = qrHistory.map((item, i) => `
        <div class="history-item" onclick="loadHistory(${i})">
            <div class="hist-main">${item.pihao || '—'} | ${item.panpinhao || '—'}</div>
            <div>${item.xinghao || '—'}</div>
            <div class="hist-time">🕐 ${item.time}</div>
        </div>
    `).join('');
}

function loadHistory(index) {
    const item = qrHistory[index];
    if (!item) return;
    const values = item.text.split('\n').flatMap(line => line.split('；').filter(Boolean));
    const ids = ['f_pihao', 'f_chanpin', 'f_xinghao', 'f_guige', 'f_panpinhao', 'f_maochong', 'f_jingzhong', 'f_riqi', 'f_jianyanyuan'];
    values.forEach((val, i) => {
        const el = document.getElementById(ids[i]);
        if (el) el.value = val;
    });
    const fields = getFields();
    const text = buildQRContent(fields);
    const wrap = document.getElementById('qrWrap');
    wrap.innerHTML = '';
    try {
        const canvas = renderQRCanvas(text, 400);
        wrap.appendChild(canvas);
    } catch(e) { /* ignore */ }
    updateTextPreview(fields);
    saveFormValues();
}

function clearHistory() {
    if (!confirm('确定清空所有历史记录？')) return;
    qrHistory = [];
    localStorage.removeItem('qrHistory');
    renderHistory();
}

// ===== 批量生成（表格模式）=====

const fieldLabels = {
    pihao:       '批号',
    xinghao:     '型号',
    guige:       '规格',
    panpinhao:   '盘品号',
    maochong:    '毛重',
    jingzhong:   '净重',
    riqi:        '生产日期',
    jianyanyuan: '产地'
};

// 获取所有在批量表格中显示的字段 key 列表
function getTableKeys() {
    return Object.keys(lockState);
}

// 获取当前处于“解锁”状态的字段
function getUnlockedKeys() {
    return Object.keys(lockState).filter(k => !lockState[k]);
}

// 构建/重建批量表格表头
function buildBatchTable() {
    const keys = getTableKeys();
    const thead = document.getElementById('batchTableHead');
    const tbody = document.getElementById('batchTableBody');

    // 表头
    if (keys.length === 0) {
        thead.innerHTML = `<tr><th colspan="2" style="text-align:center;padding:10px;color:var(--text-muted);">所有字段已锁定，请解锁至少一个字段</th></tr>`;
        tbody.innerHTML = '';
        return;
    }
    let thHTML = '<tr>';
    keys.forEach(k => thHTML += `<th>${fieldLabels[k] || k}</th>`);
    thHTML += '<th style="width:32px;"></th></tr>';
    thead.innerHTML = thHTML;

    // 保留旧行数据重建（防止锁定切换后数据丢失）
    const oldRows = Array.from(tbody.querySelectorAll('tr'));
    const oldData = oldRows.map(tr => {
        const row = {};
        tr.querySelectorAll('input[data-key]').forEach(inp => row[inp.dataset.key] = inp.value);
        return row;
    });
    tbody.innerHTML = '';
    if (oldData.length === 0) oldData.push({});
    oldData.forEach(d => addBatchRow(d));
}

// 添加一行（可预填数据）
function addBatchRow(prefill = {}) {
    const keys = getTableKeys();
    if (keys.length === 0) return;
    const tbody = document.getElementById('batchTableBody');
    const tr = document.createElement('tr');
    
    // 获取当前主表单的值，作为“新解锁”字段的默认填充
    const baseFields = getFields();

    keys.forEach(k => {
        const td = document.createElement('td');
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.dataset.key = k;
        
        // 设置输入框的值
        // 优先使用已有的行数据 (prefill)，只有在添加全新行时才参考主表单 (baseFields)
        if (k in prefill) {
            inp.value = prefill[k];
        } else {
            inp.value = baseFields[k] || '';
        }

        // 样式处理：锁定的字段在视觉上稍微变淡一点，提示其为“非递增”状态
        // 但保持可编辑，满足用户“每行独立手动改”的需求
        if (lockState[k]) {
            inp.style.color = '#64748b'; // 稍微变灰一点
            inp.style.fontWeight = 'normal';
        }

        inp.placeholder = fieldLabels[k] || k;
        inp.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tr = inp.closest('tr');
                const tbody = tr.parentElement;
                const allRows = tbody.querySelectorAll('tr');
                const rowIndex = Array.from(allRows).indexOf(tr);
                const allInputs = tr.querySelectorAll('input');
                const colIndex = Array.from(allInputs).indexOf(inp);
                if (e.shiftKey) {
                    const prevRow = allRows[rowIndex - 1];
                    if (prevRow) {
                        const prevInputs = prevRow.querySelectorAll('input');
                        if (prevInputs[colIndex]) prevInputs[colIndex].focus();
                    }
                } else {
                    const nextRow = allRows[rowIndex + 1];
                    if (nextRow) {
                        const nextInputs = nextRow.querySelectorAll('input');
                        if (nextInputs[colIndex]) nextInputs[colIndex].focus();
                    } else {
                        addBatchRow();
                        const newRows = tbody.querySelectorAll('tr');
                        const newLastRow = newRows[newRows.length - 1];
                        const newInputs = newLastRow.querySelectorAll('input');
                        if (newInputs[colIndex]) newInputs[colIndex].focus();
                    }
                }
            }
        });
        td.appendChild(inp);
        tr.appendChild(td);
    });
    // 删除按钮
    const delTd = document.createElement('td');
    delTd.style.textAlign = 'center';
    const delBtn = document.createElement('button');
    delBtn.className = 'del-row-btn';
    delBtn.textContent = '×';
    delBtn.title = '删除此行';
    delBtn.onclick = () => tr.remove();
    delTd.appendChild(delBtn);
    tr.appendChild(delTd);
    tbody.appendChild(tr);
    // 聚焦第一格
    tr.querySelector('input')?.focus();
}

// 清空表格（保留一空行）
function clearBatchTable() {
    document.getElementById('batchTableBody').innerHTML = '';
    addBatchRow();
    document.getElementById('batchNav').style.display = 'none';
    batchRecords = [];
}

// 智能自动生成（按规则递增）
function autoGenerate() {
    const countStr = prompt("请输入要自动生成的标签数量：\n\n【规则】\n• 自动追加在现有行之后\n• 批号、盘品号：以前面最后一行（或主表单）为基准递增\n• 其他字段：复制最后一行（或主表单）的数值", "10");
    if (!countStr) return;
    const count = parseInt(countStr);
    if (isNaN(count) || count <= 0) return;

    const keys = getUnlockedKeys();
    if (keys.length === 0) {
        alert('所有字段均已锁定，没有需要生成的字段。');
        return;
    }

    // 获取现有数据
    const existingData = getBatchTableData();
    const baseFields = getFields();
    
    // 是否是“实质空表”
    const isEmpty = existingData.length === 0;
    
    // 确定基准点：有数据就用最后一行，没数据就用左侧表单
    const startSource = isEmpty ? baseFields : existingData[existingData.length - 1];

    // 递增尾数辅助函数
    const incrementTail = (str) => {
        if (!str) return '';
        return str.replace(/(\d+)(?!.*\d)/, (match) => {
            const num = parseInt(match, 10) + 1;
            return num.toString().padStart(match.length, '0');
        });
    };

    // 初始值计算：
    // 如果是空表，第一行用 startSource 的原始值
    // 如果已有数据，第一行用 startSource 的递增值 (前提是该字段未锁定)
    let currentPihao = startSource.pihao;
    if (!isEmpty && !lockState.pihao) currentPihao = incrementTail(currentPihao);

    let currentPanpinhao = startSource.panpinhao;
    if (!isEmpty && !lockState.panpinhao) currentPanpinhao = incrementTail(currentPanpinhao);

    // 如果表格当前是纯空行，清掉它以便追加
    if (isEmpty) {
        document.getElementById('batchTableBody').innerHTML = '';
    }

    for (let i = 0; i < count; i++) {
        const rowData = {};
        keys.forEach(k => {
            if (k === 'pihao') {
                rowData[k] = currentPihao;
                // 只有未锁定时才继续递增
                if (!lockState.pihao) currentPihao = incrementTail(currentPihao);
            } else if (k === 'panpinhao') {
                rowData[k] = currentPanpinhao;
                // 只有未锁定时才继续递增
                if (!lockState.panpinhao) currentPanpinhao = incrementTail(currentPanpinhao);
            } else {
                // 其他字段（型号、规格、重量等）直接从基准点复制
                // 即使它们是“解锁”状态，自动生成通常也只是复制第一行，除非有特殊逻辑
                rowData[k] = startSource[k];
            }
        });
        addBatchRow(rowData);
    }
}

// 从表格读取所有行数据
function getBatchTableData() {
    const rows = document.getElementById('batchTableBody').querySelectorAll('tr');
    const result = [];
    rows.forEach(tr => {
        const obj = {};
        let hasValue = false;
        tr.querySelectorAll('input[data-key]').forEach(inp => {
            obj[inp.dataset.key] = inp.value.trim();
            if (inp.value.trim()) hasValue = true;
        });
        if (hasValue) result.push(obj);
    });
    return result;
}

// 一键生成并预览
function oneClickGenerate() {
    const rows = getBatchTableData();
    if (rows.length === 0) {
        alert('请至少填写一行数据后再生成。');
        return;
    }

    const baseFields = getFields();
    batchRecords = [];

    for (const row of rows) {
        const fields = Object.assign({}, baseFields);
        for (const [k, v] of Object.entries(row)) {
            // 无论锁定与否，生成时均以列表数据为准
            // 满足用户“每行独立编辑”的需求
            if (k in fields) {
                fields[k] = v;
            }
        }
        const text = buildQRContent(fields);
        let canvas;
        try { canvas = renderQRCanvas(text, 400); } catch(e) { canvas = null; }
        batchRecords.push({ fields, text, canvas });
    }

    batchIndex = 0;
    showBatchRecord(0);
    document.getElementById('batchNav').style.display = 'block';
    openPrintPreview(batchRecords);
}

// 渲染单条 QR 到 canvas（含底部批号小字），返回 canvas 元素
function renderQRCanvas(text, size = 184) {
    qrcode.stringToBytesFuncs['UTF-8'] = function(s) {
        const enc = encodeURIComponent(s);
        const bytes = [];
        for (let i = 0; i < enc.length; i++) {
            if (enc[i] === '%') { bytes.push(parseInt(enc.substr(i+1,2),16)); i+=2; }
            else bytes.push(enc.charCodeAt(i));
        }
        return bytes;
    };
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    const qr = qrcode(0, 'L');
    qr.addData(text);
    qr.make();
    const mc = qr.getModuleCount();
    const cs = Math.floor(size / mc);
    const mg = Math.floor((size - mc * cs) / 2);
    const qrCanvas = document.createElement('canvas');
    qrCanvas.width = size; qrCanvas.height = size;
    const ctx = qrCanvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#1e293b';
    for (let r = 0; r < mc; r++)
        for (let c = 0; c < mc; c++)
            if (qr.isDark(r, c)) ctx.fillRect(mg + c*cs, mg + r*cs, cs, cs);

    const pihao = text.split('；')[0] || '';
    const textHeight = Math.max(24, Math.round(size * 0.13));
    const fontSize = Math.max(11, Math.round(size * 0.055));
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = size;
    finalCanvas.height = size + textHeight;
    const fCtx = finalCanvas.getContext('2d');
    fCtx.fillStyle = '#fff';
    fCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    fCtx.drawImage(qrCanvas, 0, 0);
    if (pihao) {
        fCtx.fillStyle = '#1e293b';
        fCtx.font = `bold ${fontSize}px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif`;
        fCtx.textAlign = 'center';
        fCtx.textBaseline = 'middle';
        fCtx.fillText(pihao, size / 2, size + textHeight / 2);
    }
    return finalCanvas;
}

let batchRecords = [];   // [{fields, text, canvas}, ...]
let batchIndex = 0;

function showBatchRecord(i) {
    if (batchRecords.length === 0) return;
    const rec = batchRecords[i];

    // 不再回填到左侧表单，避免破坏主模板数据
    /*
    for (const [k, v] of Object.entries(rec.fields)) {
        const el = document.getElementById('f_' + k);
        if (el && !el.readOnly) el.value = v;
    }
    */

    // 渲染预览
    const wrap = document.getElementById('qrWrap');
    wrap.innerHTML = '';
    if (rec.canvas) {
        wrap.appendChild(rec.canvas);
    } else {
        wrap.innerHTML = `<div class="qr-placeholder"><div class="icon">⚠</div><div>生成失败</div></div>`;
    }
    updateTextPreview(rec.fields);
    document.getElementById('batchNavLabel').textContent =
        `第 ${i + 1} / ${batchRecords.length} 条`;
}

function navBatch(dir) {
    batchIndex = Math.max(0, Math.min(batchRecords.length - 1, batchIndex + dir));
    showBatchRecord(batchIndex);
}

function openPrintPreview(records) {
    // 使用 about:blank 避免本地 file:// 协议跨域限制
    const win = window.open('about:blank', '_blank', 'width=900,height=700');
    if (!win) { alert('弹窗被拦截，请允许本页弹窗后重试。'); return; }

    // 构建每个 QR 块的 HTML
    const items = records.map((rec, i) => {
        const imgSrc = rec.canvas ? rec.canvas.toDataURL('image/png') : '';
        const f = rec.fields;
        const match = (f.pihao || '').match(/(\d{1,4})$/);
        const num = match ? parseInt(match[1], 10) : (i + 1);
        const filename = `${num}.png`;
        return `
        <div class="qr-item">
            ${imgSrc ? `<img src="${imgSrc}" data-filename="${filename}">` : '<div class="err">生成失败</div>'}
            <div class="info">
                <div class="line"><strong>批号:</strong> ${f.pihao}</div>
                <div class="line"><strong>产品:</strong> ${f.chanpin}</div>
                <div class="line"><strong>型号/规格:</strong> ${f.xinghao} / ${f.guige}</div>
                <div class="line"><strong>盘品号:</strong> ${f.panpinhao}</div>
                <div class="line"><strong>毛重/净重:</strong> ${f.maochong}kg / ${f.jingzhong}kg</div>
                <div class="line"><strong>日期/产地:</strong> ${f.riqi} &nbsp; ${f.jianyanyuan}</div>
            </div>
        </div>`;
    }).join('');

    win.document.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>二维码打印预览 — 共 ${records.length} 条</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family:'Microsoft YaHei',sans-serif; }
  body { background:#f5f5f5; padding:20px; }
  .toolbar { display:flex; gap:10px; margin-bottom:16px; align-items:center; }
  .toolbar h2 { flex:1; font-size:1rem; color:#333; }
  .toolbar button {
      padding:8px 18px; border:none; border-radius:6px; cursor:pointer;
      font-size:0.9rem; font-weight:600;
  }
  .btn-print { background:#2563eb; color:white; }
  .btn-download { background:#10b981; color:white; }
  .btn-close  { background:#e5e7eb; color:#374151; }
  .grid { display:flex; flex-direction:column; gap:20px; }
  .qr-item {
      background:white; border:1px solid #ddd; border-radius:8px;
      padding:20px; display:flex; gap:20px; align-items:flex-start;
      width: 100%;
  }
  .qr-item img { border:1px solid #eee; flex-shrink:0; width:400px; height:auto; }
  .info { font-size:1.1rem; color:#1e293b; line-height:2.2; flex:1; }
  .info .line { border-bottom:1px dotted #e2e8f0; padding-bottom:5px; }
  .err { width:400px; min-height:400px; display:flex; align-items:center;
         justify-content:center; background:#fef2f2; color:#ef4444; font-size:1rem; }
  @media print {
      body { background:white; padding:0; }
      .toolbar { display:none; }
      .grid { gap:10px; }
      .qr-item { page-break-inside:avoid; border:1px solid #999; margin-bottom:10px; }
  }
</style>
</head>
<body>
  <div class="toolbar">
      <h2>打印预览 — 共 ${records.length} 个二维码</h2>
      <button class="btn-download" onclick="downloadAll()">⬇ 下载全部图片</button>
      <button class="btn-print" onclick="window.print()">🖨 打印 / 存为PDF</button>
      <button class="btn-close" onclick="window.close()">✕ 关闭</button>
  </div>
  <div class="grid">${items}</div>
  <script>
      function downloadAll() {
          const imgs = document.querySelectorAll('.qr-item img');
          if (imgs.length === 0) return;
          if (!confirm('确定要下载这 ' + imgs.length + ' 张图片吗？\\n浏览器可能会弹出多次保存提示。')) return;
          
          imgs.forEach((img, i) => {
              setTimeout(() => {
                  const link = document.createElement('a');
                  link.href = img.src;
                  link.download = img.getAttribute('data-filename') || ('QR_' + i + '.png');
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
              }, i * 300); // 间隔300ms避免浏览器拦截
          });
      }
      // 如果需要自动弹出打印，可以去掉下行注释
      // setTimeout(() => window.print(), 500);
  </script>
</body>
</html>`);
    win.document.close();
}

// 切换表格放大/全屏模式
function toggleBatchZoom() {
    const card = document.getElementById('batchCard');
    const overlay = document.getElementById('zoomOverlay');
    const btn = document.getElementById('zoomBtn');
    
    const isZoomed = card.classList.toggle('zoomed');
    overlay.classList.toggle('active', isZoomed);
    
    if (isZoomed) {
        btn.innerHTML = '✕ 退出全屏';
        btn.style.borderColor = '#ef4444';
        btn.style.color = '#ef4444';
        document.body.style.overflow = 'hidden'; // 禁止背景滚动
    } else {
        btn.innerHTML = '🔍 全屏放大编辑';
        btn.style.borderColor = 'var(--primary)';
        btn.style.color = 'var(--primary)';
        document.body.style.overflow = '';
    }
}



