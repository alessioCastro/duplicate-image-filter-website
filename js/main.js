(async function () {
    // --- I18N (INTERNATIONALIZATION) SETUP ---
    const TRANSLATIONS = {
        'pt': {
            'status_ready': 'Pronto.',
            'status_loading_mn': 'Carregando MobileNet (TF.js)...',
            'status_loaded_mn': 'MobileNet carregado.',
            'status_error_mn': 'Erro ao carregar MobileNet.',
            'status_cleared': 'Armazenamento limpo.',
            'status_selection_cleared': 'Seleção limpa.',
            'status_error_clearing': 'Erro ao limpar.',
            'status_awaiting': 'Aguardando processamento...',
            'status_expanding_zip': 'Expandindo ZIP:',
            'status_zip_found': 'arquivos encontrados.',
            'status_no_images_selected': 'Nenhuma imagem selecionada para processar. Adicione arquivos primeiro.',
            'status_no_images_found': 'Nenhuma imagem encontrada nos arquivos selecionados.',
            'status_processing': 'Processando imagem {0} de {1}: {2}...',
            'status_building_matrix': 'Construindo matriz de similaridade e grafo de similaridade...',
            'status_no_embedding': 'Nenhuma imagem com embedding disponível para comparação.',
            'status_no_unique': 'Nenhum arquivo único restante para gerar o ZIP.',
            'status_processing_complete': 'Processamento concluído. Download do ZIP iniciado.',
            'status_error_processing_exact': 'Erro durante processamento (exact).',
            'status_error_processing_near': 'Erro durante processamento (near).',
            'status_generating_zip': 'Gerando ZIP:',
            'status_zip_generated': 'gerado e download iniciado.',
            'file_zip': 'ZIP',
            'file_file': 'ARQUIVO',
            'list_removed': 'REMOVIDA',
            'list_kept': 'MANTIDA (única)',
            'list_duplicate': 'duplicata',
            'list_phash_dup': 'pHash-duplicata',
            'list_embedding_dup': 'embedding-duplicata',
            'zip_exact_filename': 'Imagens-Unicas-Exatas.zip',
            'zip_near_filename': 'Imagens-Unicas-Proximas.zip',
            'label_phash': 'N/A',
            'label_img': 'img'
        },
        'en': {
            'status_ready': 'Ready.',
            'status_loading_mn': 'Loading MobileNet (TF.js)...',
            'status_loaded_mn': 'MobileNet loaded.',
            'status_error_mn': 'Error loading MobileNet.',
            'status_cleared': 'Storage cleared.',
            'status_selection_cleared': 'Selection cleared.',
            'status_error_clearing': 'Error clearing.',
            'status_awaiting': 'Awaiting processing...',
            'status_expanding_zip': 'Expanding ZIP:',
            'status_zip_found': 'files found.',
            'status_no_images_selected': 'No images selected for processing. Please add files first.',
            'status_no_images_found': 'No images found in the selected files.',
            'status_processing': 'Processing image {0} of {1}: {2}...',
            'status_building_matrix': 'Building similarity matrix and similarity graph...',
            'status_no_embedding': 'No images with embedding available for comparison.',
            'status_no_unique': 'No unique files remaining to generate the ZIP.',
            'status_processing_complete': 'Processing complete. ZIP download started.',
            'status_error_processing_exact': 'Error during processing (exact).',
            'status_error_processing_near': 'Error during processing (near).',
            'status_generating_zip': 'Generating ZIP:',
            'status_zip_generated': 'generated and download started.',
            'file_zip': 'ZIP',
            'file_file': 'FILE',
            'list_removed': 'REMOVED',
            'list_kept': 'KEPT (unique)',
            'list_duplicate': 'duplicate',
            'list_phash_dup': 'pHash-duplicate',
            'list_embedding_dup': 'embedding-duplicate',
            'zip_exact_filename': 'Unique-Images-Exact.zip',
            'zip_near_filename': 'Unique-Images-Near.zip',
            'label_phash': 'N/A',
            'label_img': 'img'
        }
    };

    // Detect language from HTML lang attribute, default to 'pt'
    const userLang = document.documentElement.lang.substring(0, 2) || 'pt';
    const T = TRANSLATIONS[userLang] || TRANSLATIONS['pt'];

    /**
     * Retrieves translation for a given key.
     * @param {string} key - The key of the translation string.
     * @param {...any} args - Arguments for string interpolation (e.g., {0}, {1}).
     * @returns {string} The translated string.
     */
    function getTranslation(key, ...args) {
        let str = T[key] || TRANSLATIONS['pt'][key] || `[MISSING_T:${key}]`;
        args.forEach((arg, index) => {
            str = str.replace(`{${index}}`, arg);
        });
        return str;
    }
    // --- END I18N SETUP ---


    let fileStore = {}; 
    let selectedFiles = []; 

    // DOM Elements
    const fileInput = document.getElementById('fileInput');
    const dropzone = document.getElementById('dropzone');
    const btnClear = document.getElementById('btnClear');
    const btnZipExact = document.getElementById('btnZipExact');
    const btnZipNear = document.getElementById('btnZipNear');
    const fileListEl = document.getElementById('fileList');
    const statTotal = document.getElementById('statTotal');
    const statUnique = document.getElementById('statUnique');
    const statDupes = document.getElementById('statDupes');
    const statBytes = document.getElementById('statBytes');
    const statusEl = document.getElementById('status');
    const fileItemTpl = document.getElementById('fileItemTpl');

    function logStatus(text) { statusEl.textContent = text; }

    function bytesToHuman(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = 2;
        const sizes = [getTranslation('byte_unit_bytes'), getTranslation('byte_unit_kb'), getTranslation('byte_unit_mb'), getTranslation('byte_unit_gb'), getTranslation('byte_unit_tb')]; // Strings now localized
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    async function updateStats() {
        const allMeta = await getAllMeta();
        
        const uniqueMeta = allMeta.filter(m => !m.removed);
        const dupesMeta = allMeta.filter(m => m.removed);

        let totalBytes = 0;
        uniqueMeta.forEach(meta => {
            const file = fileStore[meta.id];
            if (file) {
                totalBytes += file.size;
            }
        });

        const queueBytes = selectedFiles.reduce((s, f) => s + (f.size || 0), 0);
        
        statTotal.textContent = allMeta.length + selectedFiles.length; 
        statUnique.textContent = allMeta.length > 0 ? uniqueMeta.length : '—';
        statDupes.textContent = allMeta.length > 0 ? dupesMeta.length : '—';
        statBytes.textContent = bytesToHuman(allMeta.length > 0 ? totalBytes : queueBytes);

        const hasProcessedFiles = allMeta.length > 0;
        const hasSelectedFiles = selectedFiles.length > 0;
        
        btnClear.disabled = !hasProcessedFiles && !hasSelectedFiles; 
        btnZipExact.disabled = !hasProcessedFiles && !hasSelectedFiles;
        btnZipNear.disabled = !hasProcessedFiles && !hasSelectedFiles;
    }
    
    async function createAndDownloadZip(uniqueMeta, filename) {
        logStatus(getTranslation('status_generating_zip') + ` ${filename}...`);
        const zip = new JSZip();
        
        for (const meta of uniqueMeta) {
            const originalFile = fileStore[meta.id];
            if (originalFile) {
                zip.file(meta.name, originalFile);
            }
        }
        
        const content = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 },
            onUpdate: (metadata) => {
                logStatus(getTranslation('status_generating_zip') + ` ${metadata.percent.toFixed(2)}%...`);
            }
        });
        
        saveAs(content, filename);
        
        logStatus(`ZIP (${filename}) ${getTranslation('status_zip_generated')}.`);
    }

    // IndexedDB helpers (no translation needed here)
    const DB_NAME = 'img-filter-db';
    const STORE = 'images';
    let _cachedDB = null;
    function openDB() {
        if (_cachedDB) return Promise.resolve(_cachedDB);
        return new Promise((res, rej) => {
            const r = indexedDB.open(DB_NAME, 1);
            r.onupgradeneeded = () => {
                if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' });
            };
            r.onsuccess = () => {
                _cachedDB = r.result;
                _cachedDB.onversionchange = () => { try { _cachedDB.close(); } catch (e) { } _cachedDB = null; };
                res(_cachedDB);
            };
            r.onerror = e => rej(e);
        });
    }
    async function saveMeta(meta) {
        const db = await openDB();
        return new Promise((res, rej) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(meta);
            tx.oncomplete = () => res();
            tx.onerror = e => rej(e);
        });
    }
    async function getAllMeta() {
        const db = await openDB();
        return new Promise((res, rej) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).getAll();
            req.onsuccess = () => res(req.result);
            req.onerror = e => rej(e);
        });
    }
    async function clearDB() {
        const db = await openDB();
        return new Promise((res, rej) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).clear();
            tx.oncomplete = async () => {
                fileStore = {}; 
                selectedFiles = []; 
                fileListEl.innerHTML = ''; 
                await updateStats(); 
                res();
            };
            tx.onerror = e => rej(e);
        });
    }

    // blockhash must be present
    if (!window.__blockhash) {
        logStatus(getTranslation('status_error_blockhash'));
        console.error('blockhash not available');
        throw new Error('blockhash not available');
    }

    // Load MobileNet
    logStatus(getTranslation('status_loading_mn'));
    let mobilenetModel;
    (async () => {
        try {
            mobilenetModel = await mobilenet.load({ version: 2, alpha: 1.0 });
            logStatus(getTranslation('status_loaded_mn'));
            await updateStats(); 
        } catch (err) {
            console.error(err);
            logStatus(getTranslation('status_error_mn'));
            throw err;
        }
    })();

    // ... (utility functions like readImageAsImageElement, getResolution, extractEmbedding, cosineSim remain the same) ...

    function readImageAsImageElement(file) {
        return new Promise((res, rej) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => { URL.revokeObjectURL(url); res(img); };
            img.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
            img.src = url;
        });
    }
    function getResolution(img) { return { w: img.naturalWidth, h: img.naturalHeight }; }

    async function extractEmbedding(img) {
        let embeddingTensor;
        try {
            embeddingTensor = tf.tidy(() => {
                const tensor = tf.browser.fromPixels(img).toFloat();
                const resized = tf.image.resizeBilinear(tensor, [224, 224]);
                const expanded = resized.expandDims(0).div(127.5).sub(1);
                try { return mobilenetModel.infer(expanded, 'conv_preds'); }
                catch (e) { return mobilenetModel.infer(expanded, true); }
            });
        } catch (err) {
            throw new Error('Error creating embedding tensor: ' + (err && err.message));
        }

        try {
            const arr = await embeddingTensor.data();
            try { embeddingTensor.dispose(); } catch (e) { }
            if (!arr || arr.length < 8) throw new Error('Invalid embedding (small length)');

            let mean = 0;
            for (const v of arr) mean += v;
            mean /= arr.length;
            let varsum = 0;
            for (const v of arr) varsum += (v - mean) * (v - mean);
            const variance = varsum / arr.length;
            if (variance < 1e-8) throw new Error('Embedding with very low variance (near-constant vector)');

            let norm = 0;
            for (const v of arr) norm += v * v;
            norm = Math.sqrt(norm) || 1;
            return Array.from(arr, v => v / norm);
        } catch (err) {
            try { if (embeddingTensor) embeddingTensor.dispose(); } catch (e) { }
            throw err;
        }
    }

    function cosineSim(a, b) {
        if (!a || !b || a.length !== b.length) return -1;
        let s = 0;
        for (let i = 0; i < a.length; i++) s += a[i] * b[i];
        return s;
    }

    const SIM_THRESHOLD = 0.999;
    const PHASH_THRESHOLD = 10;
    const ALPHA = 1.0;
    const BETA = 0.000001;


    function renderFileList() {
        fileListEl.innerHTML = '';
        
        selectedFiles.forEach((f) => {
            const node = fileItemTpl.content.cloneNode(true);
            const li = node.querySelector('li');
            const thumb = li.querySelector('div');
            const nameEl = li.querySelector('.font-medium');
            const mono = li.querySelector('.mono');
            const extra = li.querySelector('.text-xs.mt-1');

            nameEl.textContent = f.name;
            mono.textContent = `${f.type || 'image/*'} • ${bytesToHuman(f.size || 0)}`; 
            extra.textContent = getTranslation('status_awaiting');
            
            if (f.type && f.type.startsWith('image/')) {
                const url = URL.createObjectURL(f);
                const img = new Image();
                img.onload = () => {
                    thumb.innerHTML = '';
                    img.width = 48; img.height = 48; img.style.objectFit = 'cover';
                    thumb.appendChild(img);
                    URL.revokeObjectURL(url);
                };
                img.onerror = () => { thumb.textContent = getTranslation('label_img'); URL.revokeObjectURL(url); };
                img.src = url;
            } else {
                thumb.textContent = f.name.toLowerCase().endsWith('.zip') ? getTranslation('file_zip') : getTranslation('file_file');
            }

            fileListEl.appendChild(li);
        });
        
        updateStats(); 
    }

    // Drag & Drop
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('ring-2'); });
    dropzone.addEventListener('dragleave', (e) => { dropzone.classList.remove('ring-2'); });
    dropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropzone.classList.remove('ring-2');
        const items = Array.from(e.dataTransfer.items || []);
        if (!items.length) return;
        const files = [];
        for (const it of items) {
            if (it.kind === 'file') files.push(it.getAsFile());
        }
        if (files.length) {
            selectedFiles = selectedFiles.concat(files);
            renderFileList();
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length) {
            selectedFiles = selectedFiles.concat(files);
            renderFileList();
        }
    });

    // Clear selection/DB
    btnClear.addEventListener('click', async () => {
        try {
            if(selectedFiles.length > 0) {
                selectedFiles = [];
                renderFileList();
                logStatus(getTranslation('status_selection_cleared'));
            } else {
                await clearDB();
                logStatus(getTranslation('status_cleared'));
            }
        } catch (e) {
            console.error(e);
            logStatus(getTranslation('status_error_clearing'));
        }
    });

    async function expandZipsIfAny(files) {
        const out = [];
        for (const f of files) {
            if (f.type === 'application/zip' || f.name.toLowerCase().endsWith('.zip')) {
                if (window.JSZip) {
                    try {
                        logStatus(getTranslation('status_expanding_zip') + ` ${f.name}...`);
                        const data = await f.arrayBuffer();
                        const zip = await JSZip.loadAsync(data);
                        let fileCount = 0;
                        for (const name of Object.keys(zip.files)) {
                            const entry = zip.files[name];
                            if (!entry.dir) {
                                const mime = (name.match(/\.(jpe?g|png|gif|webp|bmp|svg|tiff)$/i)) ? `image/${RegExp.$1}` : '';
                                const blob = await entry.async('blob');
                                const file = new File([blob], name, { type: blob.type || mime });
                                out.push(file);
                                fileCount++;
                            }
                        }
                        logStatus(`ZIP ${f.name} expandido. ${fileCount} ${getTranslation('status_zip_found')}`);
                    } catch (e) {
                        console.warn('Error expanding zip', f.name, e);
                        out.push(f); 
                    }
                } else {
                    out.push(f); 
                }
            } else {
                out.push(f);
            }
        }
        return out;
    }

    async function processAndFilter(mode = 'near') {
        
        if (selectedFiles.length === 0) {
             const existingMeta = await getAllMeta();
             if (existingMeta.length === 0) {
                 logStatus(getTranslation('status_no_images_selected'));
                 return;
             }
             const uniqueMeta = existingMeta.filter(m => !m.removed);
             const filename = mode === 'exact' ? getTranslation('zip_exact_filename') : getTranslation('zip_near_filename');
             await createAndDownloadZip(uniqueMeta, filename);
             await updateStats(); 
             renderProcessedList(existingMeta);
             return;
        }

        const filesToProcess = selectedFiles.slice(); 
        await clearDB(); 

        logStatus(getTranslation('status_preparing'));
        const expanded = await expandZipsIfAny(filesToProcess);
        const imageFiles = expanded.filter(f => (f.type && f.type.startsWith('image/')) || /\.(jpe?g|png|gif|webp|bmp|tiff)$/i.test(f.name));
        
        if (!imageFiles.length) { 
            logStatus(getTranslation('status_no_images_found')); 
            await updateStats();
            return; 
        }
        
        logStatus(`Processando ${imageFiles.length} imagens...`);
        const metas = await getAllMeta(); 
        let filesProcessed = 0;

        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            
            logStatus(getTranslation('status_processing', i + 1, imageFiles.length, file.name));
            
            try {
                const img = await readImageAsImageElement(file);
                const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; 
                const res = getResolution(img);
                
                fileStore[id] = file; 

                const phash = await window.__blockhash.computePHash(img);
                let isDup = false;
                for (const m of metas) {
                    if (!m.phash) continue;
                    const d = window.__blockhash.hammingDistanceHex(phash, m.phash);
                    if (d <= 5) { isDup = true; console.log(`Exact duplicate detected (pHash hamming ${d}): ${file.name}`); break; }
                }
                
                if (isDup && mode === 'exact') {
                    await saveMeta({ id, name: file.name, removed: true, reason: 'phash-dup', phash, width: res.w, height: res.h, ts: Date.now() });
                    metas.push({ id, name: file.name, removed: true, phash, width: res.w, height: res.h });
                    delete fileStore[id]; 
                    try { img.src = ''; } catch (e) { }
                    filesProcessed++;
                    await updateStats(); 
                    continue;
                }

                let embedding = null;
                if (mode === 'near') {
                    try {
                        embedding = await extractEmbedding(img);
                    } catch (err) {
                        console.warn(`Error extracting embedding for ${file.name}:`, err);
                        await saveMeta({ id, name: file.name, phash, width: res.w, height: res.h, dataUrl: null, removed: false, ts: Date.now() });
                        metas.push({ id, name: file.name, phash, width: res.w, height: res.h });
                        try { img.src = ''; } catch (e) { }
                        filesProcessed++;
                        await updateStats(); 
                        continue;
                    }
                }

                const fr = new FileReader();
                const dataUrl = await new Promise((res, rej) => {
                    fr.onload = () => res(fr.result);
                    fr.onerror = rej;
                    fr.readAsDataURL(file);
                });

                const meta = {
                    id, name: file.name, phash, embedding, width: res.w, height: res.h, dataUrl, removed: false, ts: Date.now()
                };
                
                await saveMeta(meta);
                metas.push(meta);
                try { img.src = ''; } catch (e) { }
            } catch (err) {
                console.error(err);
                delete fileStore[id]; 
            }
            filesProcessed++;
            await updateStats(); 
        }
        
        let updated = await getAllMeta(); 
        
        if (mode === 'near') {
            logStatus(getTranslation('status_building_matrix'));
            
            const live = updated.filter(m => !m.removed && m.embedding); 
            const n = live.length;
            
            if (n > 0) {
                const simMat = Array.from({ length: n }, () => new Float32Array(n));
                for (let i = 0; i < n; i++) {
                    simMat[i][i] = 1.0;
                    for (let j = i + 1; j < n; j++) {
                        const s = cosineSim(live[i].embedding, live[j].embedding);
                        simMat[i][j] = simMat[j][i] = s;
                    }
                }

                const adj = Array.from({ length: n }, () => []);
                for (let i = 0; i < n; i++) {
                    for (let j = i + 1; j < n; j++) {
                        if (simMat[i][j] >= SIM_THRESHOLD) {
                            adj[i].push(j);
                            adj[j].push(i);
                        }
                    }
                }

                const visited = new Array(n).fill(false);
                const components = [];
                for (let i = 0; i < n; i++) {
                    if (visited[i]) continue;
                    const queue = [i];
                    const comp = [];
                    visited[i] = true;
                    while (queue.length) {
                        const u = queue.shift();
                        comp.push(u);
                        for (const v of adj[u]) {
                            if (!visited[v]) { visited[v] = true; queue.push(v); }
                        }
                    }
                    components.push(comp);
                }
                
                for (const comp of components) {
                    if (comp.length <= 1) continue;

                    const scores = comp.map(i => {
                        const img = live[i];
                        const resScore = (img.width || 0) * (img.height || 0);
                        return { idx: i, score: resScore, sumSim: 0, resScore }; 
                    });

                    scores.sort((a, b) => b.score - a.score);
                    
                    for (const entry of scores.slice(1)) {
                        const remImg = live[entry.idx];
                        try {
                            const updatedMeta = { ...remImg, removed: true, reason: 'embedding-dup' };
                            await saveMeta(updatedMeta);
                            
                            delete fileStore[remImg.id]; 
                            await updateStats();
                        } catch (e) {
                            console.error('Error marking for removal', remImg.id, e);
                        }
                    }
                }
                
                updated = await getAllMeta();
            } else {
                 logStatus(getTranslation('status_no_embedding'));
            }
        }
        
        const uniqueMeta = updated.filter(m => !m.removed);
        
        if (uniqueMeta.length === 0) {
             logStatus(getTranslation('status_no_unique'));
             renderProcessedList(updated);
             return;
        }

        const filename = mode === 'exact' ? getTranslation('zip_exact_filename') : getTranslation('zip_near_filename');
        await createAndDownloadZip(uniqueMeta, filename);
        
        await updateStats(); 
        
        renderProcessedList(updated);

        logStatus(getTranslation('status_processing_complete'));
    }
    
    function renderProcessedList(allMeta) {
        fileListEl.innerHTML = '';
        allMeta.sort((a, b) => (a.removed === b.removed) ? (a.name.localeCompare(b.name)) : (a.removed ? 1 : -1));
        
        allMeta.forEach((meta) => {
            const node = fileItemTpl.content.cloneNode(true);
            const li = node.querySelector('li');
            const thumb = li.querySelector('div');
            const nameEl = li.querySelector('.font-medium');
            const mono = li.querySelector('.mono');
            const extra = li.querySelector('.text-xs.mt-1');
            
            const originalFile = fileStore[meta.id];

            nameEl.textContent = meta.name;
            mono.textContent = `${meta.phash ? meta.phash.substring(0, 10) + '...' : getTranslation('label_phash')} • ${meta.width || '?'}x${meta.height || '?'}`;
            
            if (meta.removed) {
                li.classList.add('opacity-50', 'line-through', 'bg-red-50');
                
                let reason = getTranslation('list_duplicate');
                if(meta.reason === 'phash-dup') reason = getTranslation('list_phash_dup');
                if(meta.reason === 'embedding-dup') reason = getTranslation('list_embedding_dup');
                
                extra.textContent = `${getTranslation('list_removed')} (${reason})`;
                extra.classList.add('text-red-600');
            } else {
                extra.textContent = getTranslation('list_kept');
                extra.classList.add('text-green-600');
            }

            if (meta.dataUrl) {
                const img = new Image();
                img.onload = () => {
                    thumb.innerHTML = '';
                    img.width = 48; img.height = 48; img.style.objectFit = 'cover';
                    thumb.appendChild(img);
                };
                img.onerror = () => { thumb.textContent = getTranslation('label_img'); };
                img.src = meta.dataUrl;
            } else {
                 thumb.textContent = getTranslation('label_img');
            }
            
            if (originalFile) {
                 mono.textContent += ` • ${bytesToHuman(originalFile.size)}`;
            }

            fileListEl.appendChild(li);
        });
    }

    // Wire buttons (keep functionality mapped)
    btnZipExact.addEventListener('click', async () => {
        try {
            await processAndFilter('exact');
        } catch (e) {
            console.error(e);
            logStatus(getTranslation('status_error_processing_exact'));
        }
    });
    btnZipNear.addEventListener('click', async () => {
        try {
            await processAndFilter('near');
        } catch (e) {
            console.error(e);
            logStatus(getTranslation('status_error_processing_near'));
        }
    });
    
    // Start rendering and statistics update
    //logStatus(getTranslation('status_ready'));
    updateStats();
})();