console.log('UI loaded');

const button = document.getElementById('selectFile')!;
const pathBox = document.getElementById('vmixPath') as HTMLInputElement;

button.addEventListener('click', async () => {
    const path = await (window as any).api.selectVmixFile();

    if (path) {
        pathBox.value = path;
    }
});
