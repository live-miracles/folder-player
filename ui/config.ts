export const FILE_TYPES = { IMAGE: 'Image', VIDEO: 'Video', AUDIO: 'AudioFile', FOLDER: 'Photos' };

export function renderConfigTable(
    folderFiles: [number, { path: string; type: string }[]][],
    config: [number, string[]][],
    folderPath: string,
) {
    document.getElementById('config-title')!.innerHTML = getParentAndCurrent(folderPath);
    const tbody = document.getElementById('config-table')!;

    tbody.innerHTML = '';

    folderFiles.sort((a, b) => {
        if (a[0] === -1) return 1;
        if (b[0] === -1) return -1;
        return a[0] - b[0];
    });
    const configMap = new Map(config);

    let html = '';

    let i = 0;
    for (const [index, files] of folderFiles) {
        const types = files.map((f) => f.type);
        const selectedOptions = configMap.get(index) ?? [];

        let optionsHtml = '';
        const isMic = selectedOptions.includes('mic') ? 'true' : 'false';
        optionsHtml += getOptionHtml('mic', 'bool', isMic, index);

        const isCam = selectedOptions.includes('cam') ? 'true' : 'false';
        optionsHtml += getOptionHtml('cam', 'bool', isCam, index);

        if (types.includes(FILE_TYPES.AUDIO) || types.includes(FILE_TYPES.VIDEO)) {
            const isLoop = selectedOptions.includes('loop') ? 'true' : 'false';
            optionsHtml += getOptionHtml('loop', 'bool', isLoop, index);

            const opt = selectedOptions.find((opt) => opt.endsWith('%')) ?? '100';
            const parsed = parseInt(opt);
            optionsHtml += getOptionHtml(
                '%',
                'number',
                isNaN(parsed) ? '100' : String(parsed),
                index,
            );
        }
        if (types.includes(FILE_TYPES.FOLDER)) {
            const opt = selectedOptions.find((opt) => opt.endsWith('s')) ?? '10';
            const parsed = parseInt(opt);
            optionsHtml += getOptionHtml(
                's',
                'number',
                isNaN(parsed) ? '10' : String(parsed),
                index,
            );
        }

        let rowColor = i++ % 2 === 0 ? 'bg-base-300/30' : '';
        files.forEach((file, i) => {
            html += `<tr class="${rowColor}">`;
            if (i === 0) {
                html += `<td rowspan="${files.length}" class="align-top font-semibold">${index === -1 ? '' : index}</td>`;
            }
            html += `<td class="break-all max-w-[600px]">${file.path}</td> <td class="break-all w-[90px]">${getFileTypeHtml(file.type)}</td>`;
            if (i === 0) html += `<td rowspan="${files.length}">${optionsHtml}</td>`;
            html += `</tr>`;
        });
    }

    tbody.innerHTML = html;
}

function getParentAndCurrent(folderPath: string) {
    const parts = folderPath.replace(/\\/g, '/').split('/').filter(Boolean);
    return parts.slice(-2).join('/');
}

function getOptionHtml(name: string, type: string, value: string, index: number) {
    if (index === -1) return '';

    if (type === 'bool') {
        return `<label class="swap ml-2">
            <input data-index="${index}" data-name="${name}" class="config-option" type="checkbox" ${value === 'true' ? 'checked="checked"' : ''} />
            <div class="swap-on"><span class="badge badge-sm badge-primary">${name}</span></div>
            <div class="swap-off"><span class="badge badge-sm">${name}</span></div>
        </label>`;
    }
    return `<input data-index="${index}" data-name="${name}" type="number" class="config-option input input-xs w-14 ml-2" value="${value}" />&nbsp;${name}`;
}

function getFileTypeHtml(type: string) {
    let color = '';
    if (type === FILE_TYPES.AUDIO) color = 'badge-primary';
    if (type === FILE_TYPES.VIDEO) color = 'badge-secondary';
    if (type === FILE_TYPES.IMAGE) color = 'badge-accent';
    if (type === FILE_TYPES.FOLDER) color = 'badge-warning';

    return `<span class="badge badge-soft badge-sm ${color}">${type}</span>`;
}

export function getTableConfig() {
    const options = document.querySelectorAll('.config-option') as NodeListOf<HTMLInputElement>;
    const configMap = new Map<number, string[]>();
    options.forEach((opt) => {
        const index = Number(opt.dataset.index);
        if (isNaN(index)) {
            throw new Error('Option index is NaN. ' + opt);
        }
        const name = opt.dataset.name;
        if (!name) {
            throw new Error('Option name is not defined. ' + opt);
        }

        if (opt.type === 'checkbox') {
            if (opt.checked) {
                if (!configMap.get(index)) configMap.set(index, []);
                configMap.get(index)!.push(name);
            }
        } else {
            const value = parseInt(opt.value);
            if (isNaN(value)) {
                throw new Error('Option value is NaN. ' + opt);
            }
            if (name === 's' && value !== 10) {
                if (1 > value || value > 1000)
                    throw new Error('Slideshow time must be between 1 and 1000 sec');
                if (!configMap.get(index)) configMap.set(index, []);
                configMap.get(index)!.push(value + name);
            } else if (name === '%' && value !== 100) {
                if (0 > value || value > 1000)
                    throw new Error('Volume value must be between 0 and 10000 %');
                if (!configMap.get(index)) configMap.set(index, []);
                configMap.get(index)!.push(value + name);
            }
        }
    });

    const list = Array.from(configMap).sort((a, b) => a[0] - b[0]);
    const text = list.map((elem) => elem[0] + ' ' + elem[1].join(' ')).join('\r\n');
    return text;
}
