export function renderVmixWeb(state: any) {
    document.getElementById('preset-name')!.innerText = state.preset;
    renderInputList(state.inputs);
    (window as any).lucide.createIcons();
}

function renderInputList(inputs: any[]) {
    const elem = document.getElementById('input-list')!;

    elem.innerHTML = inputs
        .filter(Boolean)
        .map(
            (input) => `
        <div class="flex items-center justify-between bg-base-300 rounded-box px-3 py-2 cursor-pointer hover:bg-base-content/10">
            <div class="flex gap-3 items-center">
                ${input.duration ? `<span class="text-sm opacity-60">30:00</span>` : ''}
                <span>${input.title}</span>
            </div>
            <div class="flex gap-2">
                <i data-lucide="mic"></i>
                <i data-lucide="repeat"></i>
            </div>
        </div>`,
        )
        .join('');
}
