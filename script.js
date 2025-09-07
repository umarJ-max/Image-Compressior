class ImageCompressor {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.compressedImages = [];
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.controls = document.getElementById('controls');
        this.qualitySlider = document.getElementById('qualitySlider');
        this.qualityValue = document.getElementById('qualityValue');
        this.formatSelect = document.getElementById('formatSelect');
        this.compressBtn = document.getElementById('compressBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.results = document.getElementById('results');
        this.resultsGrid = document.getElementById('resultsGrid');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
    }

    setupEventListeners() {
        // File input events
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        // Quality slider
        this.qualitySlider.addEventListener('input', (e) => {
            this.qualityValue.textContent = e.target.value + '%';
        });

        // Compress button
        this.compressBtn.addEventListener('click', () => this.compressImages());

        // Download all button
        this.downloadAllBtn.addEventListener('click', () => this.downloadAll());

        // Prevent default drag behaviors on document
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        if (files.length > 0) {
            this.processFiles(files);
        }
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
        if (files.length > 0) {
            this.processFiles(files);
        }
    }

    processFiles(files) {
        // Security: Validate file types and sizes
        const validFiles = files.filter(file => {
            // Check file type
            const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                this.showError(`Invalid file type: ${file.name}. Only JPEG, PNG, WebP, and GIF are supported.`);
                return false;
            }

            // Check file size (max 50MB per file)
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxSize) {
                this.showError(`File too large: ${file.name}. Maximum size is 50MB.`);
                return false;
            }

            return true;
        });

        if (validFiles.length === 0) {
            return;
        }

        this.selectedFiles = validFiles;
        this.showControls();
        this.updateFileInfo();
    }

    showControls() {
        this.controls.style.display = 'block';
        this.uploadArea.style.display = 'none';
    }

    updateFileInfo() {
        const fileCount = this.selectedFiles.length;
        const totalSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
        
        // Update UI to show selected files info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'file-info';
        infoDiv.innerHTML = `
            <p><strong>${fileCount}</strong> file(s) selected</p>
            <p>Total size: <strong>${this.formatFileSize(totalSize)}</strong></p>
            <button type="button" class="change-files-btn" onclick="imageCompressor.resetUpload()">Change Files</button>
        `;
        
        // Remove existing info if present
        const existingInfo = this.controls.querySelector('.file-info');
        if (existingInfo) {
            existingInfo.remove();
        }
        
        this.controls.insertBefore(infoDiv, this.controls.firstChild);
    }

    resetUpload() {
        this.selectedFiles = [];
        this.compressedImages = [];
        this.controls.style.display = 'none';
        this.progressContainer.style.display = 'none';
        this.results.style.display = 'none';
        this.uploadArea.style.display = 'block';
        this.fileInput.value = '';
    }

    async compressImages() {
        if (!this.selectedFiles || this.selectedFiles.length === 0) {
            this.showError('No files selected');
            return;
        }

        this.compressBtn.disabled = true;
        this.progressContainer.style.display = 'block';
        this.results.style.display = 'none';
        this.compressedImages = [];

        const quality = this.qualitySlider.value / 100;
        const outputFormat = this.formatSelect.value;

        try {
            for (let i = 0; i < this.selectedFiles.length; i++) {
                const file = this.selectedFiles[i];
                this.updateProgress((i / this.selectedFiles.length) * 100, `Processing ${file.name}...`);

                const compressedBlob = await this.compressImage(file, quality, outputFormat);
                
                this.compressedImages.push({
                    original: file,
                    compressed: compressedBlob,
                    name: this.generateFileName(file.name, outputFormat),
                    originalSize: file.size,
                    compressedSize: compressedBlob.size,
                    compressionRatio: ((file.size - compressedBlob.size) / file.size * 100).toFixed(1)
                });
            }

            this.updateProgress(100, 'Compression complete!');
            setTimeout(() => {
                this.progressContainer.style.display = 'none';
                this.showResults();
            }, 1000);

        } catch (error) {
            console.error('Compression error:', error);
            this.showError('An error occurred during compression. Please try again.');
        } finally {
            this.compressBtn.disabled = false;
        }
    }

    async compressImage(file, quality, outputFormat) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                try {
                    // Security: Limit canvas size to prevent memory issues
                    const maxDimension = 4096;
                    let { width, height } = img;

                    if (width > maxDimension || height > maxDimension) {
                        const aspectRatio = width / height;
                        if (width > height) {
                            width = maxDimension;
                            height = maxDimension / aspectRatio;
                        } else {
                            height = maxDimension;
                            width = maxDimension * aspectRatio;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // Draw image on canvas
                    ctx.drawImage(img, 0, 0, width, height);

                    // Determine output format
                    let mimeType;
                    switch (outputFormat) {
                        case 'jpeg':
                            mimeType = 'image/jpeg';
                            break;
                        case 'png':
                            mimeType = 'image/png';
                            break;
                        case 'webp':
                            mimeType = 'image/webp';
                            break;
                        default:
                            mimeType = file.type;
                    }

                    // Convert to blob
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to compress image'));
                        }
                    }, mimeType, quality);

                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            
            // Security: Create object URL safely
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;
            
            // Clean up object URL after image loads or fails
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                img.onload(); // Call the original onload
            };
            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                img.onerror(); // Call the original onerror
            };
        });
    }

    generateFileName(originalName, outputFormat) {
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
        let extension;

        switch (outputFormat) {
            case 'jpeg':
                extension = '.jpg';
                break;
            case 'png':
                extension = '.png';
                break;
            case 'webp':
                extension = '.webp';
                break;
            default:
                extension = originalName.match(/\.[^/.]+$/)?.[0] || '.jpg';
        }

        return nameWithoutExt + '_compressed' + extension;
    }

    updateProgress(percentage, text) {
        this.progressFill.style.width = percentage + '%';
        this.progressText.textContent = text;
    }

    showResults() {
        this.results.style.display = 'block';
        this.resultsGrid.innerHTML = '';

        this.compressedImages.forEach((item, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';

            const compressionPercentage = parseFloat(item.compressionRatio);
            let compressionClass, compressionText;

            if (compressionPercentage >= 30) {
                compressionClass = 'compression-excellent';
                compressionText = 'Excellent';
            } else if (compressionPercentage >= 10) {
                compressionClass = 'compression-good';
                compressionText = 'Good';
            } else {
                compressionClass = 'compression-minimal';
                compressionText = 'Minimal';
            }

            resultItem.innerHTML = `
                <div class="result-info">
                    <div class="result-name">${item.name}</div>
                    <div class="result-stats">
                        ${this.formatFileSize(item.originalSize)} → ${this.formatFileSize(item.compressedSize)}
                        <span class="compression-badge ${compressionClass}">${compressionText} (${item.compressionRatio}% saved)</span>
                    </div>
                </div>
                <button class="download-btn" onclick="imageCompressor.downloadSingle(${index})">Download</button>
            `;

            this.resultsGrid.appendChild(resultItem);
        });
    }

    downloadSingle(index) {
        const item = this.compressedImages[index];
        const url = URL.createObjectURL(item.compressed);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async downloadAll() {
        if (this.compressedImages.length === 0) return;

        // For multiple files, create a ZIP (simplified approach - download individually)
        for (let i = 0; i < this.compressedImages.length; i++) {
            await new Promise(resolve => {
                setTimeout(() => {
                    this.downloadSingle(i);
                    resolve();
                }, i * 100); // Small delay between downloads
            });
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        // Create and show error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        errorDiv.textContent = message;

        document.body.appendChild(errorDiv);

        // Remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
}

// Security: Content Security Policy helpers
const CSP = {
    // Sanitize user input (though we don't accept text input in this app)
    sanitizeString: (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // Validate file types
    isValidImageType: (type) => {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        return validTypes.includes(type);
    },

    // Rate limiting for API calls (if needed)
    rateLimiter: {
        calls: 0,
        lastReset: Date.now(),
        limit: 100, // 100 operations per minute
        
        canProceed: function() {
            const now = Date.now();
            if (now - this.lastReset > 60000) { // Reset every minute
                this.calls = 0;
                this.lastReset = now;
            }
            
            if (this.calls >= this.limit) {
                return false;
            }
            
            this.calls++;
            return true;
        }
    }
};

// Add CSS animation for error notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .file-info {
        background: #f0f9ff;
        border: 1px solid #0ea5e9;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1.5rem;
    }
    
    .file-info p {
        margin: 0.25rem 0;
        color: #0c4a6e;
    }
    
    .change-files-btn {
        background: #0ea5e9;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        margin-top: 0.5rem;
        transition: background-color 0.2s;
    }
    
    .change-files-btn:hover {
        background: #0284c7;
    }
    
    .error-notification {
        font-weight: 500;
        line-height: 1.4;
    }
`;
document.head.appendChild(style);

// Initialize the application when DOM is loaded
let imageCompressor;

document.addEventListener('DOMContentLoaded', () => {
    imageCompressor = new ImageCompressor();
});

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Note: Service worker implementation would go here for offline capabilities
        // This is commented out as it requires additional setup
        // navigator.serviceWorker.register('/sw.js');
    });
}
