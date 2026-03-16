import { useEffect, useState } from 'react';

declare global {
    interface Window {
        api: any;
    }
}

export default function App() {
    const [recents, setRecents] = useState<string[]>([]);

    async function openFolder() {
        const result = await window.api.openFolder();

        if (result) {
            alert(`Loaded ${result.files.length} files`);
            loadRecents();
        }
    }

    async function loadRecents() {
        const r = await window.api.getRecents();
        setRecents(r);
    }

    useEffect(() => {
        loadRecents();
    }, []);

    return (
        <div
            style={{
                fontFamily: 'sans-serif',
                padding: 40,
                maxWidth: 600,
                margin: 'auto',
            }}>
            <h1>Folder Player</h1>

            <button onClick={openFolder}>Open Folder</button>

            <h3 style={{ marginTop: 30 }}>Recent Folders</h3>

            <ul>
                {recents.map((r) => (
                    <li key={r}>{r}</li>
                ))}
            </ul>
        </div>
    );
}
