export function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function escAttr(str) {
    return escHtml(str).replace(/'/g, '&#39;');
}

export function strVal(v) {
    return (v !== undefined && v !== null) ? v : '';
}

export function autoIncrementValue(val) {
    var m = val.match(/^(.*?)(\d+)$/);
    if (m) {
        var prefix = m[1];
        var numStr = m[2];
        var num = parseInt(numStr, 10);
        var incremented = (num + 1).toString();
        if (numStr.length > incremented.length) {
            incremented = incremented.padStart(numStr.length, '0');
        }
        return prefix + incremented;
    }
    if (/^\d+$/.test(val)) {
        var n = parseInt(val, 10);
        return String(n + 1);
    }
    return val;
}

export function buildQRData(fields, fieldDefs, qrFormat) {
    const format = qrFormat || '';
    return format.replace(/\{(\w+)\}/g, function (match, key) {
        if (fields && fields[key] !== undefined && fields[key] !== null) return fields[key];
        const fd = fieldDefs.find(function (f) { return f.key === key; });
        return fd ? strVal(fd.defaultValue) : '';
    });
}
