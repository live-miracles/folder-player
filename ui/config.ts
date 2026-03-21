const FILE_TYPES = { IMAGE: 'Image', VIDEO: 'Video', AUDIO: 'AudioFile', FOLDER: 'Photos' };

export function renderTableBody(
    folderFiles: [number, { path: string; type: string }[]][],
    configMap: Map<number, string[]>,
) {
    let html = '';

    let i = 0;
    for (const [index, files] of folderFiles) {
        const types = files.map((f) => f.type);
        const selectedOptions = configMap.get(index) ?? [];

        let optionsHtml = '';
        const isMic = selectedOptions.includes('mic') ? 'true' : 'false';
        optionsHtml += getOptionHtml('mic', 'bool', isMic);

        const isCam = selectedOptions.includes('cam') ? 'true' : 'false';
        optionsHtml += getOptionHtml('cam', 'bool', isCam);

        if (types.includes(FILE_TYPES.AUDIO) || types.includes(FILE_TYPES.VIDEO)) {
            const isLoop = selectedOptions.includes('loop') ? 'true' : 'false';
            optionsHtml += getOptionHtml('loop', 'bool', isLoop);

            const opt = selectedOptions.find((opt) => opt.endsWith('%')) ?? '100';
            const parsed = parseInt(opt);
            optionsHtml += getOptionHtml('%', 'number', isNaN(parsed) ? '100' : String(parsed));
        }
        if (types.includes(FILE_TYPES.FOLDER)) {
            const opt = selectedOptions.find((opt) => opt.endsWith('s')) ?? '10';
            const parsed = parseInt(opt);
            optionsHtml += getOptionHtml('s', 'number', isNaN(parsed) ? '10' : String(parsed));
        }

        let rowColor = i++ % 2 === 0 ? 'bg-base-300/30' : '';
        files.forEach((file, i) => {
            html += `<tr class="${rowColor}">`;
            if (i === 0) {
                html += `<td rowspan="${files.length}" class="align-top font-semibold">${index === -1 ? '' : index}</td>`;
            }
            html += `<td class="break-all max-w-[600px]">${file.path}</td> <td class="break-all">${getFileTypeHtml(file.type)}</td>`;
            if (i === 0) html += `<td rowspan="${files.length}">${optionsHtml}</td>`;
            html += `</tr>`;
        });
    }

    document.getElementById('config-table')!.innerHTML = html;
}

function getOptionHtml(name: string, type: string, value: string) {
    if (type === 'bool') {
        return `<label class="swap ml-2">
            <input type="checkbox" ${value === 'true' ? 'checked="checked"' : ''} />
            <div class="swap-on"><span class="badge badge-sm badge-primary">${name}</span></div>
            <div class="swap-off"><span class="badge badge-sm">${name}</span></div>
        </label>`;
    }
    return `<input type="text" class="input input-xs w-14 ml-2" value="${value}" />&nbsp;${name}`;
}

function getFileTypeHtml(type: string) {
    let color = '';
    if (type === FILE_TYPES.AUDIO) color = 'badge-primary';
    if (type === FILE_TYPES.VIDEO) color = 'badge-secondary';
    if (type === FILE_TYPES.IMAGE) color = 'badge-accent';
    if (type === FILE_TYPES.FOLDER) color = 'badge-warning';

    return `<span class="badge badge-soft badge-sm ${color}">${type}</span>`;
}
