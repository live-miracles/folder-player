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
