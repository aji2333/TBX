export async function fetchTemplates(serviceUrl) {
    const resp = await fetch(serviceUrl + '/api/v1/templates');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
}

export async function fetchConfigs(serviceUrl) {
    const resp = await fetch(serviceUrl + '/api/v1/configs');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
}

export async function fetchConfigDetails(serviceUrl, name) {
    const resp = await fetch(serviceUrl + '/api/v1/configs/' + encodeURIComponent(name));
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
}

export async function printTemplate(serviceUrl, templateName, printerName, copies, data) {
    const resp = await fetch(serviceUrl + '/api/v1/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            template_name: templateName,
            printer_name: printerName,
            copies: copies,
            data: data
        })
    });
    if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || 'HTTP ' + resp.status);
    }
    return await resp.json();
}
