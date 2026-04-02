export const FILE_TYPES = { IMAGE: 'Image', VIDEO: 'Video', AUDIO: 'AudioFile', FOLDER: 'Photos' };
const TYPE_MAP = { Video: 1, AudioFile: 2, Image: 3, Photos: 4 };

function getLeadingNumbers(text: string) {
    const match = text.match(/^(\d+)(?:_(\d+))?/);
    if (!match) return [-1, -1];

    const first = Number(match[1]);
    const second = match[2] !== undefined ? Number(match[2]) : -1;

    return [first, second];
}

function compareFiles(a: string, b: string) {
    const [a1, a2] = getLeadingNumbers(a);
    const [b1, b2] = getLeadingNumbers(b);
    if (a1 === -1 && a2 === -1) return 0;
    if (a1 === -1) return 1;
    if (b1 === -1) return -1;
    if (a1 !== b1) return a1 - b1;
    if (a2 !== b2) return a2 - b2;
    return a.localeCompare(b);
}

export function renderConfigTable(
    folderFiles: [string, { path: string; type: string }[]][],
    config: [string, string[]][],
    folderPath: string,
) {
    document.getElementById('config-title')!.innerHTML = folderPath;
    const tbody = document.getElementById('config-table')!;

    tbody.innerHTML = '';

    folderFiles.sort((a, b) => compareFiles(a[0], b[0]));
    const configMap = new Map(config);

    let html = '';

    let i = 0;
    for (const [key, files] of folderFiles) {
        files.sort((a: any, b: any) => (TYPE_MAP as any)[a.type] - (TYPE_MAP as any)[b.type]);
        const types = files.map((f) => f.type);
        const selectedOptions = configMap.get(key) ?? [];

        let optionsHtml = '';

        const isSkip = selectedOptions.includes('skip') ? 'true' : 'false';
        optionsHtml += getSkipOptionHtml(isSkip, key);

        const isCam = selectedOptions.includes('cam') ? 'true' : 'false';
        optionsHtml += getBoolOptionHtml('cam', isCam, key);

        const isMic = selectedOptions.includes('mic') ? 'true' : 'false';
        optionsHtml += getBoolOptionHtml('mic', isMic, key);

        if (types.includes(FILE_TYPES.AUDIO) || types.includes(FILE_TYPES.VIDEO)) {
            const isLoop = selectedOptions.includes('loop') ? 'true' : 'false';
            optionsHtml += getBoolOptionHtml('loop', isLoop, key);

            const opt = selectedOptions.find((opt) => opt.endsWith('%')) ?? '100';
            const parsed = parseInt(opt);
            optionsHtml += getNumberOptionHtml(
                '%',
                isNaN(parsed) ? '100' : String(parsed),
                key,
                0,
                1000,
            );
        }
        if (types.includes(FILE_TYPES.FOLDER)) {
            const opt = selectedOptions.find((opt) => opt.endsWith('s')) ?? '10';
            const parsed = parseInt(opt);
            optionsHtml += getNumberOptionHtml(
                's',
                isNaN(parsed) ? '10' : String(parsed),
                key,
                1,
                1000,
            );
        }

        let rowColor = i++ % 2 === 0 ? 'bg-base-300/30' : '';

        const tab = '&nbsp;&nbsp;&nbsp⤷&nbsp;&nbsp;&nbsp;';
        const applyTab =
            types.filter((t) => t === FILE_TYPES.AUDIO).length +
                types.filter((t) => t === FILE_TYPES.VIDEO).length ===
            1;
        files.forEach((file, i) => {
            html += `<tr class="${rowColor}">`;
            if (i === 0) {
                html += `<td rowspan="${files.length}" class="align-middle font-semibold">${key}</td>`;
            }
            const subType = file.type !== FILE_TYPES.AUDIO && file.type !== FILE_TYPES.VIDEO;
            html += `<td class="break-all">${applyTab && subType ? tab : ''}${getFileName(file.path)}</td>`;
            html += `<td class="break-all w-[120px]">${getFileTypeHtml(file.type)}</td>`;
            if (i === 0)
                html += `<td class="w-[480px]" rowspan="${files.length}">${optionsHtml}</td>`;
            html += `</tr>`;
        });
    }

    tbody.innerHTML = html;
    setupCamMicLogic(tbody);
}

function getFileName(path: string) {
    const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
    return parts.slice(-1)[0];
}

function getBoolOptionHtml(name: string, value: string, key: string) {
    if (key === '') return '';

    return `<label class="swap ml-2">
            <input data-key="${key}" data-name="${name}" class="config-option" type="checkbox" ${value === 'true' ? 'checked="checked"' : ''} />
            <div class="swap-on"><span class="badge badge-primary">${name}</span></div>
            <div class="swap-off"><span class="badge">${name}</span></div>
        </label>`;
}

function getNumberOptionHtml(name: string, value: string, key: string, min: number, max: number) {
    if (key === '') return '';

    return `<input data-key="${key}" data-name="${name}" type="number" min="${min}" max="${max}"
         class="config-option input input-sm w-14 ml-2" value="${value}" />&nbsp;${name}`;
}

function getSkipOptionHtml(value: string, key: string) {
    if (key === '') return '';

    return `<label class="swap ml-2">
            <input data-key="${key}" data-name="skip" class="config-option" type="checkbox" ${value === 'true' ? 'checked="checked"' : ''} />
            <div class="swap-on"><span class="badge badge-primary">skip next cam</span></div>
            <div class="swap-off"><span class="badge">skip next cam</span></div>
        </label>`;
}

function getFileTypeHtml(type: string) {
    let color = '';
    if (type === FILE_TYPES.AUDIO) color = 'badge-primary';
    if (type === FILE_TYPES.VIDEO) color = 'badge-secondary';
    if (type === FILE_TYPES.IMAGE) color = 'badge-accent';
    if (type === FILE_TYPES.FOLDER) color = 'badge-warning';

    return `<span class="badge badge-soft ${color}">${type}</span>`;
}

export function getTableConfig() {
    const options = document.querySelectorAll('.config-option') as NodeListOf<HTMLInputElement>;
    const configMap = new Map<string, string[]>();
    options.forEach((opt) => {
        const key = opt.dataset.key;
        if (!key) {
            throw new Error('Option key is not defined. ' + opt);
        }

        const name = opt.dataset.name;
        if (!name) {
            throw new Error('Option name is not defined. ' + opt);
        }

        if (opt.type === 'checkbox') {
            if (opt.checked) {
                if (!configMap.get(key)) configMap.set(key, []);
                configMap.get(key)!.push(name);
            }
        } else {
            const value = parseInt(opt.value);
            if (isNaN(value)) {
                throw new Error('Option value is NaN. ' + opt);
            }
            if (name === 's' && value !== 10) {
                if (1 > value || value > 1000)
                    throw new Error('Slideshow time must be between 1 and 1000 sec');
                if (!configMap.get(key)) configMap.set(key, []);
                configMap.get(key)!.push(value + name);
            } else if (name === '%' && value !== 100) {
                if (0 > value || value > 1000)
                    throw new Error('Volume value must be between 0 and 10000 %');
                if (!configMap.get(key)) configMap.set(key, []);
                configMap.get(key)!.push(value + name);
            }
        }
    });

    const list = Array.from(configMap).sort((a, b) => compareFiles(a[0], b[0]));
    const text = list.map((elem) => elem[0] + ' ' + elem[1].join(' ')).join('\r\n');
    return text;
}

function setupCamMicLogic(root: HTMLElement) {
    const groups = new Map<string, HTMLElement[]>();

    const inputs = root.querySelectorAll<HTMLInputElement>('.config-option[type="checkbox"]');

    inputs.forEach((input) => {
        const key = input.dataset.key;
        if (!key) {
            throw new Error('Option key is not defined. ' + input);
        }

        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(input);
    });

    groups.forEach((group) => {
        const cam = group.find((el) => el.dataset.name === 'cam') as HTMLInputElement | undefined;
        const mic = group.find((el) => el.dataset.name === 'mic') as HTMLInputElement | undefined;

        if (!cam || !mic) return;

        const update = () => {
            if (cam.checked) {
                mic.checked = true;
                mic.disabled = true;

                // optional UI feedback
                mic.closest('label')?.classList.add('opacity-50');
                mic.closest('label')?.classList.add('pointer-events-none');
            } else {
                mic.disabled = false;
                mic.closest('label')?.classList.remove('opacity-50');
                mic.closest('label')?.classList.remove('pointer-events-none');
            }
        };

        cam.addEventListener('change', update);

        // run once on init
        update();
    });
}
