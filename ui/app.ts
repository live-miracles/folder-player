console.log('UI loaded');

const selectBaseFileElem = document.getElementById('select-base-file-btn')!;
const baseFilePathElem = document.getElementById('base-file-path-input') as HTMLInputElement;

selectBaseFileElem.addEventListener('click', async () => {
    const path = await (window as any).api.selectBaseFile();

    if (path) {
        baseFilePathElem.value = path;
    }
});
