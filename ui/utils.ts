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

// Draw the segmented dB meter with peak indicator
function drawDbMeter(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    dB: number,
    left: boolean,
    muted: boolean,
) {
    // Define dB ranges and colors
    const dbRanges = [
        { min: -100, max: -90, frac: 0.07, colorOn: '#008000', colorOff: '#008080' },
        { min: -90, max: -36, frac: 0.28, colorOn: '#008000', colorOff: '#008080' },
        { min: -36, max: -18, frac: 0.25, colorOn: '#00c000', colorOff: '#00c0c0' },
        { min: -18, max: -6, frac: 0.25, colorOn: '#00ff00', colorOff: '#00ffff' },
        { min: -6, max: -1, frac: 0.12, colorOn: '#ffff00', colorOff: '#faff74' },
        { min: -1, max: 0, frac: 0.03, colorOn: '#ff0000', colorOff: '#ff0000' },
    ];

    let accumulatedHeight = 0; // Track filled height

    dbRanges.forEach((range) => {
        if (dB >= range.min) {
            const rangeHeight = range.frac * canvas.height;

            // Calculate the portion of this range to be filled
            const filledFraction = Math.min(dB, range.max) - range.min;
            const filledHeight = (filledFraction / (range.max - range.min)) * rangeHeight;

            // Draw the segment for this range
            ctx.fillStyle = muted ? range.colorOff : range.colorOn;
            ctx.fillRect(
                left ? 0 : canvas.width * 0.55,
                canvas.height - accumulatedHeight - filledHeight,
                canvas.width * 0.45,
                filledHeight,
            );
            accumulatedHeight += rangeHeight;
        }
    });
}

export function drawAudioLevels(canvas: HTMLCanvasElement, input: any) {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const left = Math.log10(parseFloat(input.meterF1)) * 20;
    const right = Math.log10(parseFloat(input.meterF2)) * 20;

    const muted = input.muted === 'True';
    const solo = input.solo === 'True';
    drawDbMeter(canvas, ctx, !muted || solo ? left : -100, true, muted);
    drawDbMeter(canvas, ctx, !muted || solo ? right : -100, false, muted);
}
