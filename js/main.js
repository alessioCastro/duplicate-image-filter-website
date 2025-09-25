const fmtBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const els = {
    drop: document.getElementById('dropzone'),
    input: document.getElementById('fileInput'),
    clear: document.getElementById('btnClear'),
    zipExact: document.getElementById('btnZipExact'),
    zipNear: document.getElementById('btnZipNear'),
    list: document.getElementById('fileList'),
    statTotal: document.getElementById('statTotal'),
    statUnique: document.getElementById('statUnique'),
    statDupes: document.getElementById('statDupes'),
    statBytes: document.getElementById('statBytes'),
    status: document.getElementById('status'),
    tpl: document.getElementById('fileItemTpl')
};

let files = [];

function setStatus(msg) { els.status.textContent = msg; }

function resetAll() {
    files = [];
    els.list.innerHTML = '';
    updateStats();
    els.zipExact.disabled = true;
    els.zipNear.disabled = true;
    els.clear.disabled = true;
    setStatus('Pronto.');
}

function updateStats() {
    const total = files.length;
    const size = files.reduce((s, f) => s + (f.size || 0), 0);
    els.statTotal.textContent = total;
    els.statBytes.textContent = fmtBytes(size);
    els.statUnique.textContent = total;
    els.statDupes.textContent = 0;
}

async function handleFiles(selected) {
    for (const file of selected) {
        if (file.name.toLowerCase().endsWith('.zip')) {
            setStatus('Extraindo ZIP: ' + file.name);
            const zip = await JSZip.loadAsync(file);
            for (const [path, entry] of Object.entries(zip.files)) {
                if (!entry.dir && /\.(jpe?g|png|gif|webp)$/i.test(path)) {
                    const blob = await entry.async('blob');
                    const f = new File([blob], path.split('/').pop(), { type: blob.type });
                    files.push(f);
                }
            }
        } else {
            files.push(file);
        }
    }
    els.clear.disabled = files.length === 0;
    els.zipExact.disabled = files.length === 0;
    els.zipNear.disabled = files.length === 0;
    renderList();
    updateStats();
    setStatus('Arquivos prontos.');
}

function renderList() {
    els.list.innerHTML = '';
    for (const f of files) {
        const li = els.tpl.content.firstElementChild.cloneNode(true);
        li.children[1].children[0].textContent = f.name;
        li.children[1].children[1].textContent = fmtBytes(f.size);
        els.list.appendChild(li);
    }
}

async function buildZip({ mode }) {
    const zip = new JSZip();
    const folder = zip.folder('unique');
    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ab = await f.arrayBuffer();
        folder.file(f.name, ab);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, mode === 'exact' ? 'exatas-filtradas.zip' : 'quase-exatas-filtradas.zip');
}

els.input.addEventListener('change', (e) => handleFiles(e.target.files));
els.clear.addEventListener('click', resetAll);
els.zipExact.addEventListener('click', () => buildZip({ mode: 'exact' }));
els.zipNear.addEventListener('click', () => buildZip({ mode: 'near' }));

els.drop.addEventListener('dragover', (e) => { e.preventDefault(); els.drop.classList.add('dragover'); });
els.drop.addEventListener('dragleave', () => els.drop.classList.remove('dragover'));
els.drop.addEventListener('drop', (e) => { e.preventDefault(); els.drop.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
