import type { Alert } from './types.js';

let alertCount = 0;
export function showErrorAlert(error: any) {
    const alertElem = document.getElementById('error-alert');
    if (!alertElem) return;
    alertElem.classList.remove('hidden');
    document.getElementById('error-msg')!.innerText = String(error);
    console.error(error);
    const alertId = ++alertCount;
    setTimeout(() => {
        if (alertId !== alertCount) return;
        alertElem.classList.add('hidden');
    }, 3000);
}

let successAlertCount = 0;
export function showSuccessAlert(text: string = 'Success!') {
    const alertElem = document.getElementById('success-alert');
    if (!alertElem) return;
    alertElem.classList.remove('hidden');
    document.getElementById('success-msg')!.innerText = text;

    const alertId = ++successAlertCount;
    setTimeout(() => {
        if (alertId !== successAlertCount) return;
        alertElem.classList.add('hidden');
    }, 3000);
}

export function capitalize(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function escapeHtml(text: string) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

type ReportAlert = Alert;

/** One row of a folder report: icon, "Error in 03: message", then affected files as chips. */
export function getAlertItemHtml(alert: ReportAlert) {
    const isError = alert.type === 'error';
    const files = alert.files?.length
        ? `<div class="mt-1.5 flex flex-wrap gap-1">${alert.files
              .map((file) => `<span class="chip font-mono text-[11px]">${escapeHtml(file)}</span>`)
              .join('')}</div>`
        : '';

    return `<li class="flex items-start gap-2.5 text-[13px]">
        <i data-lucide="${isError ? 'circle-x' : 'triangle-alert'}" class="mt-0.5 h-4 w-4 shrink-0 ${isError ? 'text-danger' : 'text-warning'}"></i>
        <div class="min-w-0">
            <p class="text-ink-muted"><span class="font-medium text-ink">${capitalize(alert.type)}</span>${alert.key ? ` in <span class="font-mono font-medium text-ink">${escapeHtml(alert.key)}</span>` : ''}: ${escapeHtml(alert.msg)}</p>
            ${files}
        </div>
    </li>`;
}

export function getReportSummaryHtml(errors: number, warnings: number) {
    return `<div class="flex items-center gap-2">
        <span class="chip chip-danger">${errors} ${errors === 1 ? 'error' : 'errors'}</span>
        <span class="chip chip-warning">${warnings} ${warnings === 1 ? 'warning' : 'warnings'}</span>
    </div>`;
}
