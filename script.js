// PDF.JS INITIALIZATION
const pdfjsLib = window.pdfjsLib;
if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

// STATE MANAGEMENT
const STATE = {
    currentQueue: [], // Array of { id, file, name, size, type, metadata, timestamp, isHistory }
    historyQueue: [], // Loaded from localStorage
    selectedFileId: null,
    currentTab: 'all',
    searchQuery: '',
    previewZoom: 100,
    pdfDoc: null,
    pdfCurrentPage: 1,
    pdfTotalPages: 1
};

// CONSTANTS
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = {
    'image/jpeg': 'JPG',
    'image/jpg': 'JPG',
    'image/png': 'PNG',
    'image/webp': 'WEBP',
    'image/gif': 'GIF',
    'application/pdf': 'PDF'
};

// UI SELECTORS
const DOM = {
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    browseBtn: document.getElementById('browse-btn'),
    queueList: document.getElementById('queue-list'),
    queueCount: document.getElementById('queue-count'),
    clearQueueBtn: document.getElementById('clear-queue-btn'),
    historyList: document.getElementById('history-list'),
    historyCount: document.getElementById('history-count'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),
    
    noFileSelected: document.getElementById('no-file-selected'),
    dashboardActive: document.getElementById('dashboard-active'),
    
    activeFileName: document.getElementById('active-file-name'),
    activeFileSize: document.getElementById('active-file-size'),
    activeFileType: document.getElementById('active-file-type'),
    activeFileIcon: document.getElementById('active-file-icon'),
    activeFileIconBg: document.getElementById('active-file-icon-bg'),
    
    zoomInBtn: document.getElementById('zoom-in-btn'),
    zoomOutBtn: document.getElementById('zoom-out-btn'),
    zoomFitBtn: document.getElementById('zoom-fit-btn'),
    zoomPercentage: document.getElementById('zoom-percentage'),
    fullscreenBtn: document.getElementById('fullscreen-btn'),
    
    previewViewport: document.getElementById('preview-viewport'),
    imagePreview: document.getElementById('image-preview'),
    pdfPreviewCanvas: document.getElementById('pdf-preview-canvas'),
    pdfNav: document.getElementById('pdf-nav'),
    pdfPrev: document.getElementById('pdf-prev'),
    pdfNext: document.getElementById('pdf-next'),
    pdfCurrentPageSpan: document.getElementById('pdf-current-page'),
    pdfTotalPagesSpan: document.getElementById('pdf-total-pages'),
    
    insightCompression: document.getElementById('insight-compression'),
    insightFieldsCount: document.getElementById('insight-fields-count'),
    insightPrivacyScore: document.getElementById('insight-privacy-score'),
    auditList: document.getElementById('audit-list'),
    
    tabBtns: document.querySelectorAll('.tab-btn'),
    metadataSearch: document.getElementById('metadata-search'),
    clearSearch: document.getElementById('clear-search'),
    metadataTableBody: document.getElementById('metadata-table-body'),
    noSearchResults: document.getElementById('no-search-results'),
    
    btnCopyAll: document.getElementById('btn-copy-all'),
    btnExportDropdown: document.getElementById('btn-export-dropdown'),
    exportJson: document.getElementById('export-json'),
    exportTxt: document.getElementById('export-txt'),
    
    themeToggle: document.getElementById('theme-toggle'),
    toastContainer: document.getElementById('toast-container'),
    
    fullscreenOverlay: document.getElementById('fullscreen-overlay'),
    closeFullscreenBtn: document.getElementById('close-fullscreen-btn'),
    fullscreenContent: document.getElementById('fullscreen-content-viewport')
};

// INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadHistory();
    setupEventListeners();
    updateUI();
    lucide.createIcons();
});

// THEME SYSTEM
function initTheme() {
    const savedTheme = localStorage.getItem('scope-theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
    }
}

DOM.themeToggle.addEventListener('click', () => {
    if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        localStorage.setItem('scope-theme', 'light');
        showToast('Switched to Light Theme', 'info');
    } else {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
        localStorage.setItem('scope-theme', 'dark');
        showToast('Switched to Dark Theme', 'info');
    }
});

// EVENT LISTENERS SETUP
function setupEventListeners() {
    // Browse File triggers
    DOM.browseBtn.addEventListener('click', () => DOM.fileInput.click());
    DOM.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processFiles(e.target.files);
            DOM.fileInput.value = ''; // reset
        }
    });

    // Drag and drop dropzone
    ['dragenter', 'dragover'].forEach(eventName => {
        DOM.dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            DOM.dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        DOM.dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            DOM.dropzone.classList.remove('dragover');
        }, false);
    });

    DOM.dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            processFiles(files);
        }
    });

    // Queue actions
    DOM.clearQueueBtn.addEventListener('click', () => {
        STATE.currentQueue = [];
        STATE.selectedFileId = null;
        updateUI();
        showToast('Active queue cleared', 'success');
    });

    // History actions
    DOM.clearHistoryBtn.addEventListener('click', () => {
        STATE.historyQueue = [];
        localStorage.setItem('scope-history', JSON.stringify([]));
        if (STATE.currentQueue.length === 0) {
            STATE.selectedFileId = null;
        } else {
            // If the selected file is from history, select first active instead
            const currentSelected = getSelectedFile();
            if (currentSelected && currentSelected.isHistory) {
                STATE.selectedFileId = STATE.currentQueue[0].id;
            }
        }
        updateUI();
        showToast('Forensics history cleared', 'success');
    });

    // Metadata Tabs switching
    DOM.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            STATE.currentTab = btn.getAttribute('data-tab');
            renderMetadataTable();
        });
    });

    // Search bar functionality
    DOM.metadataSearch.addEventListener('input', (e) => {
        STATE.searchQuery = e.target.value.toLowerCase().trim();
        DOM.clearSearch.style.display = STATE.searchQuery ? 'block' : 'none';
        renderMetadataTable();
    });

    DOM.clearSearch.addEventListener('click', () => {
        DOM.metadataSearch.value = '';
        STATE.searchQuery = '';
        DOM.clearSearch.style.display = 'none';
        renderMetadataTable();
        DOM.metadataSearch.focus();
    });

    // Zoom Controls
    DOM.zoomInBtn.addEventListener('click', () => adjustZoom(20));
    DOM.zoomOutBtn.addEventListener('click', () => adjustZoom(-20));
    DOM.zoomFitBtn.addEventListener('click', () => resetZoom());
    DOM.fullscreenBtn.addEventListener('click', () => openFullscreen());
    DOM.closeFullscreenBtn.addEventListener('click', () => closeFullscreen());
    DOM.fullscreenOverlay.addEventListener('click', (e) => {
        if (e.target === DOM.fullscreenOverlay) closeFullscreen();
    });

    // PDF Pagination Controls
    DOM.pdfPrev.addEventListener('click', () => changePDFPage(-1));
    DOM.pdfNext.addEventListener('click', () => changePDFPage(1));

    // Export & Clipboard actions
    DOM.btnCopyAll.addEventListener('click', () => copyActiveMetadataToClipboard());
    DOM.exportJson.addEventListener('click', () => exportActiveMetadata('json'));
    DOM.exportTxt.addEventListener('click', () => exportActiveMetadata('txt'));

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeFullscreen();
        }
    });
}

// FILE PROCESSING AND QUEUING
async function processFiles(files) {
    let validCount = 0;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (validateFile(file)) {
            const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Add temp pending item to list
            const queueItem = {
                id: fileId,
                file: file,
                name: file.name,
                size: file.size,
                type: file.type,
                metadata: null,
                timestamp: Date.now(),
                isHistory: false,
                progress: 0
            };
            
            STATE.currentQueue.push(queueItem);
            updateUI();
            
            // Extract metadata asynchronously
            extractMetadata(queueItem).then(() => {
                // If it is the only active file, select it instantly
                if (STATE.currentQueue.length === 1 || !STATE.selectedFileId) {
                    selectFile(fileId);
                }
                saveToHistory(queueItem);
                updateUI();
            }).catch(err => {
                showToast(`Forensic extraction failed for ${file.name}: ${err.message}`, 'error');
                // Remove from queue on complete failure
                STATE.currentQueue = STATE.currentQueue.filter(item => item.id !== fileId);
                updateUI();
            });
            validCount++;
        }
    }
    if (validCount > 0) {
        showToast(`Imported ${validCount} files. Running metadata analysis...`, 'info');
    }
}

function validateFile(file) {
    if (!ALLOWED_TYPES[file.type] && !file.name.toLowerCase().endsWith('.pdf')) {
        showToast(`Unsupported format: ${file.name}. Only JPG, PNG, WEBP, GIF, and PDF allowed.`, 'error');
        return false;
    }
    if (file.size > MAX_FILE_SIZE) {
        showToast(`File too large: ${file.name} (Max size: 15MB)`, 'error');
        return false;
    }
    return true;
}

// METADATA EXTRACTION ENGINE
async function extractMetadata(queueItem) {
    const file = queueItem.file;
    const type = file.type;
    
    // Create categories
    const metadata = {
        general: {},
        technical: {},
        gps: {}
    };

    // 1. Core Common Properties
    const extension = file.name.substring(file.name.lastIndexOf('.') + 1).toUpperCase();
    metadata.general['File Name'] = file.name;
    metadata.general['File Size'] = formatBytes(file.size);
    metadata.general['MIME Type'] = file.type || 'application/octet-stream';
    metadata.general['File Extension'] = extension;
    metadata.general['Last Modified'] = new Date(file.lastModified).toISOString().replace('T', ' ').substring(0, 19);
    metadata.general['Upload Timestamp'] = new Date(queueItem.timestamp).toISOString().replace('T', ' ').substring(0, 19);

    try {
        if (type === 'application/pdf' || extension === 'PDF') {
            await extractPDF(file, metadata);
        } else {
            // It is an image file
            await extractImage(file, metadata);
        }
        queueItem.metadata = metadata;
    } catch (e) {
        console.error('Extraction Error:', e);
        throw e;
    }
}

// IMAGE METADATA EXTRACTOR
function extractImage(file, metadata) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        img.onload = function() {
            const width = img.naturalWidth;
            const height = img.naturalHeight;
            const megapixels = ((width * height) / 1000000).toFixed(2);
            
            metadata.technical['Width'] = `${width} px`;
            metadata.technical['Height'] = `${height} px`;
            metadata.technical['Megapixels'] = `${megapixels} MP`;
            metadata.technical['Aspect Ratio'] = getAspectRatio(width, height);
            metadata.technical['Orientation'] = height > width ? 'Portrait' : (width > height ? 'Landscape' : 'Square');
            
            // Clean up Object URL
            URL.revokeObjectURL(img.src);
            
            // Now extract EXIF via EXIF.js
            EXIF.getData(file, function() {
                const allExif = EXIF.getAllTags(this);
                if (allExif && Object.keys(allExif).length > 0) {
                    // Extract technical settings
                    if (allExif.Make) metadata.technical['Camera Manufacturer'] = allExif.Make.trim();
                    if (allExif.Model) metadata.technical['Camera Model'] = allExif.Model.trim();
                    if (allExif.LensModel) metadata.technical['Lens Model'] = allExif.LensModel.trim();
                    if (allExif.Software) metadata.technical['Software/Firmware'] = allExif.Software.trim();
                    if (allExif.DateTimeOriginal || allExif.DateTime) {
                        metadata.technical['Date Captured'] = (allExif.DateTimeOriginal || allExif.DateTime).trim();
                    }
                    if (allExif.ISOSpeedRatings) metadata.technical['ISO Speed'] = String(allExif.ISOSpeedRatings);
                    
                    if (allExif.FNumber) {
                        metadata.technical['Aperture'] = `f/${getNumber(allExif.FNumber)}`;
                    }
                    if (allExif.ExposureTime) {
                        metadata.technical['Exposure Time'] = formatExposure(allExif.ExposureTime);
                    }
                    if (allExif.FocalLength) {
                        metadata.technical['Focal Length'] = `${getNumber(allExif.FocalLength)} mm`;
                    }
                    if (allExif.Flash !== undefined) {
                        metadata.technical['Flash Mode'] = formatFlash(allExif.Flash);
                    }
                    if (allExif.ExposureProgram) {
                        const programs = ["Undefined", "Manual", "Normal program", "Aperture priority", "Shutter priority", "Creative program", "Action program", "Portrait mode", "Landscape mode"];
                        metadata.technical['Exposure Program'] = programs[allExif.ExposureProgram] || `Unknown (${allExif.ExposureProgram})`;
                    }
                    if (allExif.MeteringMode) {
                        const modes = { 0: "Unknown", 1: "Average", 2: "CenterWeightedAverage", 3: "Spot", 4: "MultiSpot", 5: "Pattern", 6: "Partial", 255: "Other" };
                        metadata.technical['Metering Mode'] = modes[allExif.MeteringMode] || `Unknown (${allExif.MeteringMode})`;
                    }

                    // Extract GPS details
                    const latArray = EXIF.getTag(this, "GPSLatitude");
                    const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                    const lonArray = EXIF.getTag(this, "GPSLongitude");
                    const lonRef = EXIF.getTag(this, "GPSLongitudeRef");
                    
                    if (latArray && latRef && lonArray && lonRef) {
                        const lat = convertGPS(latRef, latArray);
                        const lon = convertGPS(lonRef, lonArray);
                        
                        metadata.gps['GPS Latitude'] = `${lat.toFixed(6)}° ${latRef}`;
                        metadata.gps['GPS Longitude'] = `${lon.toFixed(6)}° ${lonRef}`;
                        
                        const alt = EXIF.getTag(this, "GPSAltitude");
                        const altRef = EXIF.getTag(this, "GPSAltitudeRef");
                        if (alt !== undefined) {
                            const altVal = getNumber(alt);
                            const refSymbol = altRef === 1 ? '-' : '';
                            metadata.gps['GPS Altitude'] = `${refSymbol}${altVal.toFixed(1)} meters`;
                        }
                        
                        const gpsTime = EXIF.getTag(this, "GPSTimeStamp");
                        const gpsDate = EXIF.getTag(this, "GPSDateStamp");
                        if (gpsDate && gpsTime) {
                            metadata.gps['GPS Timestamp'] = `${gpsDate} ${gpsTime[0]}:${gpsTime[1]}:${gpsTime[2]} UTC`;
                        }

                        // Map integration link
                        metadata.gps['Geoposition Map Link'] = `https://www.google.com/maps/place/${lat},${lon}`;
                    }
                }
                resolve();
            });
        };

        img.onerror = function() {
            reject(new Error('Failed to load image for extraction'));
        };
    });
}

// PDF METADATA EXTRACTOR
function extractPDF(file, metadata) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const arrayBuffer = e.target.result;
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                
                metadata.technical['Page Count'] = String(pdf.numPages);
                
                // Get PDF Metadata info
                const pdfMeta = await pdf.getMetadata();
                const info = pdfMeta.info;
                
                if (info) {
                    if (info.Title) metadata.technical['Title'] = info.Title.trim();
                    if (info.Author) metadata.technical['Author'] = info.Author.trim();
                    if (info.Subject) metadata.technical['Subject'] = info.Subject.trim();
                    if (info.Creator) metadata.technical['Creator/Application'] = info.Creator.trim();
                    if (info.Producer) metadata.technical['Producer'] = info.Producer.trim();
                    if (info.CreationDate) {
                        metadata.technical['Creation Date'] = parsePDFDate(info.CreationDate);
                    }
                    if (info.ModDate) {
                        metadata.technical['Modification Date'] = parsePDFDate(info.ModDate);
                    }
                    if (info.PDFFormatVersion) {
                        metadata.technical['PDF Version'] = info.PDFFormatVersion;
                    }
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = function() {
            reject(new Error('Failed to read PDF buffer'));
        };
        reader.readAsArrayBuffer(file);
    });
}

// HISTORICAL REPORT PERSISTENCE
function saveToHistory(queueItem) {
    // Avoid saving the actual File object because standard files cannot be serialized.
    // Instead we construct a light-weight JSON dump.
    const record = {
        id: queueItem.id,
        name: queueItem.name,
        size: queueItem.size,
        type: queueItem.type,
        metadata: queueItem.metadata,
        timestamp: queueItem.timestamp,
        isHistory: true
    };
    
    // De-duplicate if file has exact same name and size
    STATE.historyQueue = STATE.historyQueue.filter(item => !(item.name === record.name && item.size === record.size));
    
    STATE.historyQueue.unshift(record);
    // Limit history entries to 30 items
    if (STATE.historyQueue.length > 30) {
        STATE.historyQueue.pop();
    }
    
    localStorage.setItem('scope-history', JSON.stringify(STATE.historyQueue));
}

function loadHistory() {
    try {
        const stored = localStorage.getItem('scope-history');
        if (stored) {
            STATE.historyQueue = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to parse inspection history', e);
        STATE.historyQueue = [];
    }
}

// ACTIVE RECORD SWITCHING
function selectFile(fileId) {
    STATE.selectedFileId = fileId;
    
    // Reset view state
    STATE.previewZoom = 100;
    STATE.pdfCurrentPage = 1;
    STATE.pdfDoc = null;
    
    updateActiveSidebarStyles();
    
    const activeFile = getSelectedFile();
    if (activeFile) {
        // Display dashboard
        DOM.noFileSelected.style.display = 'none';
        DOM.dashboardActive.style.display = 'grid';
        
        // Header detail card updates
        DOM.activeFileName.innerText = activeFile.name;
        DOM.activeFileSize.innerText = formatBytes(activeFile.size);
        DOM.activeFileType.innerText = activeFile.type || 'Unknown MIME';
        
        // Icon type styling
        const isPdf = activeFile.type === 'application/pdf' || activeFile.name.toLowerCase().endsWith('.pdf');
        DOM.activeFileIconBg.className = 'file-type-icon-wrapper ' + (isPdf ? 'pdf-theme' : 'img-theme');
        DOM.activeFileIcon.setAttribute('data-lucide', isPdf ? 'file-text' : 'image');
        
        lucide.createIcons();
        
        // Load metadata categories
        renderMetadataTable();
        renderPreview();
        renderInsights();
        
        showToast(`Loaded metadata for ${activeFile.name}`, 'success');
    } else {
        // Reset to empty dashboard
        DOM.noFileSelected.style.display = 'flex';
        DOM.dashboardActive.style.display = 'none';
    }
}

function getSelectedFile() {
    let file = STATE.currentQueue.find(item => item.id === STATE.selectedFileId);
    if (!file) {
        file = STATE.historyQueue.find(item => item.id === STATE.selectedFileId);
    }
    return file;
}

// METADATA DASHBOARD VIEW RENDERER
function renderMetadataTable() {
    const file = getSelectedFile();
    DOM.metadataTableBody.innerHTML = '';
    
    if (!file || !file.metadata) {
        return;
    }
    
    let rowsHtml = '';
    let matchCount = 0;
    
    // Gather matching parameters depending on tab
    const categories = ['general', 'technical', 'gps'];
    const activeTab = STATE.currentTab;
    
    categories.forEach(category => {
        // Skip if we are filtering categories
        if (activeTab !== 'all' && activeTab !== category) {
            return;
        }
        
        const data = file.metadata[category];
        for (const [key, val] of Object.entries(data)) {
            // Apply text query search if present
            const matchesSearch = !STATE.searchQuery || 
                                  key.toLowerCase().includes(STATE.searchQuery) || 
                                  String(val).toLowerCase().includes(STATE.searchQuery);
                                  
            if (matchesSearch) {
                matchCount++;
                let displayVal = String(val);
                let displayKey = key;
                
                // Highlight matches
                if (STATE.searchQuery) {
                    displayVal = highlightMatch(displayVal, STATE.searchQuery);
                    displayKey = highlightMatch(displayKey, STATE.searchQuery);
                }
                
                // Geo coordinate logic (make GPS link clickable)
                if (key === 'Geoposition Map Link') {
                    displayVal = `<a href="${val}" target="_blank" class="map-anchor">${displayVal} <i data-lucide="external-link" class="icon-small inline-icon"></i></a>`;
                }
                
                rowsHtml += `
                    <tr>
                        <td class="prop-name">${displayKey}</td>
                        <td class="prop-val">${displayVal}</td>
                        <td>
                            <button class="btn-row-action" onclick="copyText('${String(val).replace(/'/g, "\\'")}')" title="Copy property value">
                                <i data-lucide="copy"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
        }
    });

    if (matchCount === 0) {
        DOM.metadataTableBody.innerHTML = '';
        DOM.noSearchResults.style.display = 'flex';
    } else {
        DOM.metadataTableBody.innerHTML = rowsHtml;
        DOM.noSearchResults.style.display = 'none';
        lucide.createIcons();
    }
}

function highlightMatch(text, query) {
    const index = text.toLowerCase().indexOf(query);
    if (index >= 0) {
        return text.substring(0, index) + 
               `<span class="highlight-match">${text.substring(index, index + query.length)}</span>` + 
               text.substring(index + query.length);
    }
    return text;
}

// FORENSIC AUDITING AND SCORECARD
function renderInsights() {
    const file = getSelectedFile();
    if (!file || !file.metadata) return;

    // Calculate score
    let score = 100;
    const auditChecks = [];

    const hasGPS = Object.keys(file.metadata.gps).length > 0;
    const hasExif = Object.keys(file.metadata.technical).some(key => [
        'Camera Manufacturer', 'Camera Model', 'ISO Speed', 'Aperture'
    ].includes(key));
    
    // File Size audit
    if (file.size > 5 * 1024 * 1024) {
        score -= 10;
        auditChecks.push({
            icon: 'alert-triangle',
            status: 'text-warning',
            text: 'Large file payload (>5MB). Can leak high-resolution data nodes.'
        });
    } else {
        auditChecks.push({
            icon: 'check-circle',
            status: 'text-success',
            text: 'Optimized file sizing (<5MB).'
        });
    }

    // GPS Audit
    if (hasGPS) {
        score -= 40;
        auditChecks.push({
            icon: 'map-pin',
            status: 'text-danger',
            text: 'GPS metadata exposed. Exact physical location can be traced.'
        });
    } else {
        auditChecks.push({
            icon: 'check-circle',
            status: 'text-success',
            text: 'Privacy-safe: No GPS coordinates embedded.'
        });
    }

    // EXIF details audit
    if (hasExif) {
        score -= 20;
        auditChecks.push({
            icon: 'camera',
            status: 'text-warning',
            text: 'Device specifications exposed (Camera Make, Model, or Lens details).'
        });
    }

    // PDF specific security scans
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
        const creator = file.metadata.technical['Creator/Application'] || file.metadata.technical['Producer'];
        const author = file.metadata.technical['Author'];
        
        if (author) {
            score -= 15;
            auditChecks.push({
                icon: 'user-check',
                status: 'text-warning',
                text: `Author tag exposed: "${author}". Leaks document owner details.`
            });
        }
        if (creator) {
            score -= 10;
            auditChecks.push({
                icon: 'file-cog',
                status: 'text-warning',
                text: `Producer / Creator history logged (${creator}).`
            });
        }
    }

    // Ensure score bounded
    score = Math.max(0, score);
    
    // Set UI indicators
    DOM.insightFieldsCount.innerText = 
        Object.keys(file.metadata.general).length + 
        Object.keys(file.metadata.technical).length + 
        Object.keys(file.metadata.gps).length;

    // Estimate compression ratio
    if (!isPdf && file.metadata.technical['Width'] && file.metadata.technical['Height']) {
        const w = parseInt(file.metadata.technical['Width']);
        const h = parseInt(file.metadata.technical['Height']);
        const uncompressedBytes = w * h * 3; // roughly RGB 24-bit
        const compPercent = Math.max(0, Math.round((1 - (file.size / uncompressedBytes)) * 100));
        DOM.insightCompression.innerText = `${compPercent}%`;
    } else if (isPdf) {
        DOM.insightCompression.innerText = 'PDF Layer';
    } else {
        DOM.insightCompression.innerText = 'N/A';
    }

    // Privacy Score
    const scoreValEl = DOM.insightPrivacyScore;
    scoreValEl.className = 'metric-value score';
    if (score >= 80) {
        scoreValEl.innerText = `${score}/100 (Safe)`;
        scoreValEl.classList.add('safe');
    } else if (score >= 50) {
        scoreValEl.innerText = `${score}/100 (Medium)`;
        scoreValEl.classList.add('caution');
    } else {
        scoreValEl.innerText = `${score}/100 (High Risk)`;
        scoreValEl.classList.add('danger');
    }

    // Inject list items
    DOM.auditList.innerHTML = auditChecks.map(item => `
        <li>
            <i data-lucide="${item.icon}" class="audit-icon ${item.status}"></i>
            <span>${item.text}</span>
        </li>
    `).join('');
    
    lucide.createIcons();
}

// RENDERING MEDIA PREVIEW CANVAS
async function renderPreview() {
    const file = getSelectedFile();
    if (!file) return;

    // Reset layout
    DOM.imagePreview.style.display = 'none';
    DOM.pdfPreviewCanvas.style.display = 'none';
    DOM.pdfNav.style.display = 'none';
    DOM.previewViewport.querySelectorAll('.history-preview-warning').forEach(el => el.remove());
    
    // Reset Zoom layout
    resetZoom();

    // Check if it is a history record with no local file reference
    if (file.isHistory && !file.file) {
        const warnBox = document.createElement('div');
        warnBox.className = 'history-preview-warning';
        warnBox.innerHTML = `
            <i data-lucide="eye-off" class="warning-prev-icon"></i>
            <h3>Preview Stored in History</h3>
            <p>To inspect media previews and interact with details, re-upload this file in the workspace.</p>
        `;
        DOM.previewViewport.appendChild(warnBox);
        lucide.createIcons();
        return;
    }

    const fileObj = file.file;
    const isPdf = fileObj.type === 'application/pdf' || fileObj.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
        // Setup PDF rendering
        try {
            const reader = new FileReader();
            reader.onload = async function(e) {
                const arrayBuffer = e.target.result;
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                STATE.pdfDoc = await loadingTask.promise;
                STATE.pdfTotalPages = STATE.pdfDoc.numPages;
                
                DOM.pdfTotalPagesSpan.innerText = STATE.pdfTotalPages;
                DOM.pdfNav.style.display = STATE.pdfTotalPages > 1 ? 'flex' : 'none';
                
                renderPDFPage(1);
            };
            reader.readAsArrayBuffer(fileObj);
        } catch (err) {
            console.error('PDF preview render error:', err);
            showToast('Could not load PDF document preview', 'error');
        }
    } else {
        // Image preview
        DOM.imagePreview.src = URL.createObjectURL(fileObj);
        DOM.imagePreview.style.display = 'block';
    }
}

// PDF PAGE RENDER CONTROLLER
async function renderPDFPage(pageNum) {
    if (!STATE.pdfDoc) return;
    
    STATE.pdfCurrentPage = pageNum;
    DOM.pdfCurrentPageSpan.innerText = pageNum;
    DOM.pdfPreviewCanvas.style.display = 'block';

    try {
        const page = await STATE.pdfDoc.getPage(pageNum);
        const canvas = DOM.pdfPreviewCanvas;
        const context = canvas.getContext('2d');
        
        // Retrieve desired scale relative to canvas wrapper
        const viewport = page.getViewport({ scale: 1.0 });
        const containerWidth = DOM.previewViewport.clientWidth - 40;
        const scale = containerWidth / viewport.width;
        
        const scaledViewport = page.getViewport({ scale: scale });
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: scaledViewport
        };
        await page.render(renderContext).promise;
    } catch (err) {
        console.error('PDF page load error', err);
    }
}

function changePDFPage(direction) {
    if (!STATE.pdfDoc) return;
    const targetPage = STATE.pdfCurrentPage + direction;
    if (targetPage >= 1 && targetPage <= STATE.pdfTotalPages) {
        renderPDFPage(targetPage);
    }
}

// PREVIEW ZOOM & FULLSCREEN CONTROL
function adjustZoom(delta) {
    const activeFile = getSelectedFile();
    if (!activeFile || (activeFile.isHistory && !activeFile.file)) return;
    
    STATE.previewZoom = Math.min(300, Math.max(20, STATE.previewZoom + delta));
    DOM.zoomPercentage.innerText = `${STATE.previewZoom}%`;
    
    const targetEl = activeFile.type === 'application/pdf' ? DOM.pdfPreviewCanvas : DOM.imagePreview;
    if (targetEl) {
        targetEl.style.transform = `scale(${STATE.previewZoom / 100})`;
    }
}

function resetZoom() {
    STATE.previewZoom = 100;
    DOM.zoomPercentage.innerText = '100%';
    
    DOM.imagePreview.style.transform = 'scale(1)';
    DOM.pdfPreviewCanvas.style.transform = 'scale(1)';
}

function openFullscreen() {
    const activeFile = getSelectedFile();
    if (!activeFile || (activeFile.isHistory && !activeFile.file)) return;

    DOM.fullscreenContent.innerHTML = '';
    
    const isPdf = activeFile.type === 'application/pdf' || activeFile.name.toLowerCase().endsWith('.pdf');
    let clone;
    
    if (isPdf) {
        clone = document.createElement('canvas');
        const sourceCanvas = DOM.pdfPreviewCanvas;
        clone.width = sourceCanvas.width;
        clone.height = sourceCanvas.height;
        const ctx = clone.getContext('2d');
        ctx.drawImage(sourceCanvas, 0, 0);
    } else {
        clone = document.createElement('img');
        clone.src = DOM.imagePreview.src;
    }
    
    DOM.fullscreenContent.appendChild(clone);
    DOM.fullscreenOverlay.style.display = 'flex';
}

function closeFullscreen() {
    DOM.fullscreenOverlay.style.display = 'none';
}

// SIDEBAR LIST UPDATES
function updateUI() {
    // Current Queue Panel
    DOM.queueCount.innerText = STATE.currentQueue.length;
    DOM.queueList.innerHTML = '';
    
    if (STATE.currentQueue.length === 0) {
        DOM.queueList.className = 'queue-list empty';
        DOM.queueList.innerHTML = `
            <div class="empty-state-list">
                <p>No active files loaded</p>
            </div>
        `;
    } else {
        DOM.queueList.className = 'queue-list';
        STATE.currentQueue.forEach(item => {
            const isSelected = item.id === STATE.selectedFileId;
            const fileItem = document.createElement('div');
            fileItem.className = `file-item ${isSelected ? 'active' : ''}`;
            fileItem.setAttribute('onclick', `selectFile('${item.id}')`);
            
            const isPdf = item.type === 'application/pdf' || item.name.toLowerCase().endsWith('.pdf');
            const iconType = isPdf ? 'file-text' : 'image';
            
            // Build item content
            fileItem.innerHTML = `
                <div class="file-item-info">
                    <div class="file-item-icon">
                        <i data-lucide="${iconType}"></i>
                    </div>
                    <div class="file-name-meta">
                        <span class="file-name" title="${item.name}">${item.name}</span>
                        <span class="file-meta-sub">${formatBytes(item.size)}</span>
                        ${item.metadata === null ? `
                            <div class="progress-bar-container">
                                <div class="progress-fill"></div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn-remove-item" onclick="removeQueueItem('${item.id}', event)" title="Remove file from session">
                        <i data-lucide="x"></i>
                    </button>
                </div>
            `;
            DOM.queueList.appendChild(fileItem);
        });
    }

    // History Panel
    DOM.historyCount.innerText = STATE.historyQueue.length;
    DOM.historyList.innerHTML = '';
    
    if (STATE.historyQueue.length === 0) {
        DOM.historyList.className = 'history-list empty';
        DOM.historyList.innerHTML = `
            <div class="empty-state-list">
                <p>No history found</p>
            </div>
        `;
    } else {
        DOM.historyList.className = 'history-list';
        STATE.historyQueue.forEach(item => {
            const isSelected = item.id === STATE.selectedFileId;
            const fileItem = document.createElement('div');
            fileItem.className = `file-item ${isSelected ? 'active' : ''}`;
            fileItem.setAttribute('onclick', `selectFile('${item.id}')`);
            
            const isPdf = item.type === 'application/pdf' || item.name.toLowerCase().endsWith('.pdf');
            const iconType = isPdf ? 'file-text' : 'image';
            
            fileItem.innerHTML = `
                <div class="file-item-info">
                    <div class="file-item-icon">
                        <i data-lucide="${iconType}"></i>
                    </div>
                    <div class="file-name-meta">
                        <span class="file-name" title="${item.name}">${item.name}</span>
                        <span class="file-meta-sub">${formatBytes(item.size)} // History</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn-remove-item" onclick="removeHistoryItem('${item.id}', event)" title="Remove item from history">
                        <i data-lucide="x"></i>
                    </button>
                </div>
            `;
            DOM.historyList.appendChild(fileItem);
        });
    }

    updateActiveSidebarStyles();
    lucide.createIcons();
}

function updateActiveSidebarStyles() {
    const items = document.querySelectorAll('.file-item');
    items.forEach(el => {
        el.classList.remove('active');
    });
    
    if (STATE.selectedFileId) {
        const activeItems = document.querySelectorAll(`[onclick="selectFile('${STATE.selectedFileId}')"]`);
        activeItems.forEach(el => el.classList.add('active'));
    }
}

function removeQueueItem(id, event) {
    if (event) event.stopPropagation();
    
    STATE.currentQueue = STATE.currentQueue.filter(item => item.id !== id);
    if (STATE.selectedFileId === id) {
        STATE.selectedFileId = STATE.currentQueue.length > 0 ? STATE.currentQueue[0].id : null;
    }
    
    updateUI();
    selectFile(STATE.selectedFileId);
    showToast('File removed from queue', 'info');
}

function removeHistoryItem(id, event) {
    if (event) event.stopPropagation();
    
    STATE.historyQueue = STATE.historyQueue.filter(item => item.id !== id);
    localStorage.setItem('scope-history', JSON.stringify(STATE.historyQueue));
    
    if (STATE.selectedFileId === id) {
        if (STATE.currentQueue.length > 0) {
            STATE.selectedFileId = STATE.currentQueue[0].id;
        } else {
            STATE.selectedFileId = STATE.historyQueue.length > 0 ? STATE.historyQueue[0].id : null;
        }
    }
    
    updateUI();
    selectFile(STATE.selectedFileId);
    showToast('Item removed from history', 'info');
}

// EXPORT ACTION SCRIPTS
function copyActiveMetadataToClipboard() {
    const file = getSelectedFile();
    if (!file || !file.metadata) return;
    
    const jsonStr = JSON.stringify(file.metadata, null, 4);
    copyText(jsonStr);
}

function exportActiveMetadata(format) {
    const file = getSelectedFile();
    if (!file || !file.metadata) return;
    
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    
    if (format === 'json') {
        const jsonStr = JSON.stringify(file.metadata, null, 4);
        downloadBlob(jsonStr, `${baseName}_metadata.json`, 'application/json');
        showToast('JSON metadata report downloaded', 'success');
    } else if (format === 'txt') {
        const txtReport = generateTxtReport(file);
        downloadBlob(txtReport, `${baseName}_metadata_report.txt`, 'text/plain');
        showToast('Text metadata report downloaded', 'success');
    }
}

function generateTxtReport(file) {
    let r = `====================================================\n`;
    r += `       SCOPE FILE METADATA INSPECTOR REPORT         \n`;
    r += `====================================================\n`;
    r += `Report Date: ${new Date().toISOString()}\n\n`;
    
    const categories = ['general', 'technical', 'gps'];
    categories.forEach(cat => {
        const title = cat.toUpperCase() + ' METADATA';
        r += `[${title}]\n`;
        r += `-`.repeat(title.length + 2) + `\n`;
        
        const data = file.metadata[cat];
        for (const [k, v] of Object.entries(data)) {
            r += `${k.padEnd(25)}: ${v}\n`;
        }
        r += `\n`;
    });
    
    r += `====================================================\n`;
    r += `              FORENSIC PRIVACY RISK                 \n`;
    r += `====================================================\n`;
    
    // Quick audit summary
    const hasGPS = Object.keys(file.metadata.gps).length > 0;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    
    r += `Analysis: `;
    if (hasGPS) {
        r += `HIGH RISK (GPS tags exposed)\n`;
    } else if (isPdf && (file.metadata.technical['Author'] || file.metadata.technical['Creator/Application'])) {
        r += `MEDIUM RISK (Owner credentials embedded)\n`;
    } else {
        r += `LOW RISK / SAFE\n`;
    }
    
    return r;
}

// HELPER UTILITIES
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getNumber(num) {
    if (num && typeof num === 'object' && 'numerator' in num) {
        return num.numerator / num.denominator;
    }
    return Number(num);
}

function convertGPS(ref, coordArray) {
    const d = getNumber(coordArray[0]);
    const m = getNumber(coordArray[1]);
    const s = getNumber(coordArray[2]);
    let val = d + (m / 60) + (s / 3600);
    if (ref === 'S' || ref === 'W') {
        val = -val;
    }
    return val;
}

function getAspectRatio(width, height) {
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const divisor = gcd(width, height);
    const wRatio = width / divisor;
    const hRatio = height / divisor;
    
    // Filter common display ratios
    const common = [[16, 9], [16, 10], [4, 3], [3, 2], [1, 1], [21, 9]];
    for (const [w, h] of common) {
        if (Math.abs((width / height) - (w / h)) < 0.01) {
            return `${w}:${h} (${wRatio}:${hRatio})`;
        }
    }
    return `${wRatio}:${hRatio} (${(width/height).toFixed(2)}:1)`;
}

function parsePDFDate(pdfDate) {
    if (!pdfDate) return null;
    if (pdfDate.startsWith('D:')) {
        pdfDate = pdfDate.substring(2);
    }
    // D:YYYYMMDDHHmmSS
    const year = pdfDate.substring(0, 4);
    const month = pdfDate.substring(4, 6);
    const day = pdfDate.substring(6, 8);
    const hour = pdfDate.substring(8, 10);
    const min = pdfDate.substring(10, 12);
    const sec = pdfDate.substring(12, 14);
    
    if (year && month && day) {
        let dateStr = `${year}-${month}-${day}`;
        if (hour && min) {
            dateStr += ` ${hour}:${min}`;
            if (sec) {
                dateStr += `:${sec}`;
            }
        }
        return dateStr;
    }
    return pdfDate;
}

function formatExposure(exposure) {
    if (!exposure) return null;
    if (typeof exposure === 'object') {
        const num = getNumber(exposure);
        if (exposure.numerator && exposure.denominator) {
            return `${exposure.numerator}/${exposure.denominator}s (${num.toFixed(4)}s)`;
        }
        return `${num}s`;
    }
    const val = Number(exposure);
    if (val < 1) {
        const reciprocal = Math.round(1 / val);
        return `1/${reciprocal}s (${val.toFixed(4)}s)`;
    }
    return `${val}s`;
}

function formatFlash(flashValue) {
    if (flashValue === undefined || flashValue === null) return null;
    const val = Number(flashValue);
    // Bit 0 indicates fired
    const fired = (val & 1) !== 0;
    // Bit 3-4 indicates mode
    const mode = (val >> 3) & 3;
    let modeText = "";
    if (mode === 1) modeText = " (Compulsory Flash Firing)";
    if (mode === 2) modeText = " (Compulsory Flash Suppression)";
    if (mode === 3) modeText = " (Auto Mode)";
    
    return fired ? `Fired${modeText}` : `Did not fire${modeText}`;
}

// TOAST SYSTEMS
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-octagon';
    if (type === 'info') iconName = 'info';
    if (type === 'warning') iconName = 'alert-triangle';
    
    toast.innerHTML = `
        <i data-lucide="${iconName}" class="toast-icon"></i>
        <span class="toast-text">${message}</span>
    `;
    
    DOM.toastContainer.appendChild(toast);
    lucide.createIcons();
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}

// CLIPBOARD UTILITY
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Clipboard copy failed:', err);
        showToast('Failed to copy to clipboard', 'error');
    });
}

// BLOB DOWNLOAD UTILITY
function downloadBlob(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // cleanup
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}
