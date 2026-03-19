// async function waitForVmixReady() {
//     for (let i = 0; i < 20; i++) {
//         const info = await vMixCall();
//         if (info.value !== null) return;
//         await sleep(500);
//     }

//     throw new Error('vMix not ready');
// }

// async function addFolderInputs(folderPath: string) {
//     let files = fs.readdirSync(folderPath);

//     files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

//     for (const file of files) {
//         const type = detectType(file);
//         if (!type) continue;

//         const fullPath = path.join(folderPath, file);

//         await vMixCall('AddInput', { Value: `${type}|${fullPath}` });
//         await sleep(200);
//     }
// }

// function sleep(ms: number) {
//     return new Promise((res) => setTimeout(res, ms));
// }
