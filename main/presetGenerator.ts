import fs from 'fs';
import path from 'path';

export function generatePreset(folder: string, output: string, files: string[]) {
    const inputs = files
        .map((file, i) => {
            const full = path.join(folder, file);

            return `
<input number="${i + 1}" type="Video" title="${file}">
   <file>${full}</file>
</input>`;
        })
        .join('\n');

    const xml = `
<vmix>
<inputs>
${inputs}
</inputs>
</vmix>
`;

    fs.writeFileSync(output, xml);
}
