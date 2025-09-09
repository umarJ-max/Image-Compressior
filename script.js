class ImageCompressor {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.compressedImages = [];
        this.selectedFiles = [];
        this.isProcessing = false;
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
        // File input events - prevent double triggering
        this.uploadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.isProcessing) {
                this.fileInput.click();
            }
        });
        
        this.uploadArea.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.isProcessing && e.target === this.uploadArea) {
                this.fileInput.click();
            }
        });
        
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        // Quality slider with live preview
        this.qualitySlider.addEventListener('input', (e) => {
            this.qualityValue.textContent = e.target.value + '%';
            this.updateCompressionPreview();
        });

        // Format change with preview update
        this.formatSelect.addEventListener('change', () => {
            this.updateCompressionPreview();
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
        this.createImagePreviews();
    }

    async createImagePreviews() {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image-previews';
        previewContainer.innerHTML = '<h4>Selected Images:</h4>';

        for (const file of this.selectedFiles) {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';

            // Create image preview
            const img = document.createElement('img');
            img.className = 'preview-image';
            img.src = URL.createObjectURL(file);
            img.onload = () => URL.revokeObjectURL(img.src);

            const fileInfo = document.createElement('div');
            fileInfo.className = 'preview-info';
            fileInfo.innerHTML = `
                <div class="file-name">${file.name}</div>
                <div class="file-details">
                    <span class="original-size">Original: ${this.formatFileSize(file.size)}</span>
                    <span class="estimated-size" data-filename="${file.name}">Estimated: Calculating...</span>
                </div>
            `;

            previewItem.appendChild(img);
            previewItem.appendChild(fileInfo);
            previewContainer.appendChild(previewItem);
        }

        // Remove existing previews
        const existingPreviews = this.controls.querySelector('.image-previews');
        if (existingPreviews) {
            existingPreviews.remove();
        }

        // Insert after file info
        const fileInfo = this.controls.querySelector('.file-info');
        fileInfo.insertAdjacentElement('afterend', previewContainer);

        // Calculate initial estimates
        this.updateCompressionPreview();
    }

    async updateCompressionPreview() {
        if (!this.selectedFiles || this.selectedFiles.length === 0) return;

        const quality = this.qualitySlider.value / 100;
        const outputFormat = this.formatSelect.value;

        // Update estimated sizes for each image
        for (const file of this.selectedFiles) {
            const estimatedSpan = document.querySelector(`[data-filename="${file.name}"]`);
            if (estimatedSpan) {
                estimatedSpan.textContent = 'Calculating...';
                
                try {
                    // Quick estimation based on quality and format
                    let estimatedSize = file.size * quality;
                    
                    // Adjust based on format
                    switch (outputFormat) {
                        case 'jpeg':
                            estimatedSize *= 0.7; // JPEG typically smaller
                            break;
                        case 'webp':
                            estimatedSize *= 0.6; // WebP very efficient
                            break;
                        case 'png':
                            estimatedSize *= 1.1; // PNG might be larger
                            break;
                    }

                    const savedBytes = file.size - estimatedSize;
                    const savedPercentage = ((savedBytes / file.size) * 100).toFixed(1);
                    
                    estimatedSpan.innerHTML = `
                        Estimated: ${this.formatFileSize(estimatedSize)} 
                        <span class="savings">(~${savedPercentage}% saved)</span>
                    `;
                } catch (error) {
                    estimatedSpan.textContent = 'Error calculating';
                }
            }
        }
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
        this.isProcessing = false;
        this.controls.style.display = 'none';
        this.progressContainer.style.display = 'none';
        this.results.style.display = 'none';
        this.uploadArea.style.display = 'block';
        this.fileInput.value = '';
        
        // Clean up any existing previews
        const existingPreviews = this.controls.querySelector('.image-previews');
        if (existingPreviews) {
            existingPreviews.remove();
        }
    }

    async compressImages() {
        if (!this.selectedFiles || this.selectedFiles.length === 0) {
            this.showError('No files selected');
            return;
        }

        if (this.isProcessing) {
            return; // Prevent double processing
        }

        this.isProcessing = true;
        this.compressBtn.disabled = true;
        this.compressBtn.textContent = 'Compressing...';
        this.progressContainer.style.display = 'block';
        this.results.style.display = 'none';
        this.compressedImages = [];

        const quality = this.qualitySlider.value / 100;
        const outputFormat = this.formatSelect.value;

        console.log(`Starting compression with quality: ${quality}, format: ${outputFormat}`);

        try {
            for (let i = 0; i < this.selectedFiles.length; i++) {
                const file = this.selectedFiles[i];
                this.updateProgress((i / this.selectedFiles.length) * 100, `Processing ${file.name}...`);

                console.log(`Processing file ${i + 1}/${this.selectedFiles.length}: ${file.name}`);
                
                const compressedBlob = await this.compressImage(file, quality, outputFormat);
                
                const compressionRatio = file.size > 0 ? ((file.size - compressedBlob.size) / file.size * 100).toFixed(1) : 0;
                
                this.compressedImages.push({
                    original: file,
                    compressed: compressedBlob,
                    name: this.generateFileName(file.name, outputFormat),
                    originalSize: file.size,
                    compressedSize: compressedBlob.size,
                    compressionRatio: compressionRatio
                });

                console.log(`Compressed ${file.name}: ${this.formatFileSize(file.size)} → ${this.formatFileSize(compressedBlob.size)} (${compressionRatio}% saved)`);
            }

            this.updateProgress(100, 'Compression complete!');
            setTimeout(() => {
                this.progressContainer.style.display = 'none';
                this.showResults();
            }, 1000);

        } catch (error) {
            console.error('Compression error:', error);
            this.showError(`Compression failed: ${error.message}`);
        } finally {
            this.isProcessing = false;
            this.compressBtn.disabled = false;
            this.compressBtn.textContent = 'Compress Images';
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

                    // Clear canvas and draw image
                    ctx.clearRect(0, 0, width, height);
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

                    // Convert to blob with quality setting
                    canvas.toBlob((blob) => {
                        if (blob) {
                            console.log(`Compressed ${file.name}: ${file.size} → ${blob.size} bytes`);
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to compress image - blob creation failed'));
                        }
                    }, mimeType, quality);

                } catch (error) {
                    console.error('Canvas processing error:', error);
                    reject(error);
                }
            };

            img.onerror = (error) => {
                console.error('Image loading error:', error);
                reject(new Error('Failed to load image'));
            };
            
            // Create object URL safely
            try {
                const objectUrl = URL.createObjectURL(file);
                img.src = objectUrl;
                
                // Clean up after processing
                const cleanup = () => URL.revokeObjectURL(objectUrl);
                img.onload = (...args) => {
                    cleanup();
                    img.onload.call(img, ...args);
                };
                img.onerror = (...args) => {
                    cleanup();
                    img.onerror.call(img, ...args);
                };
            } catch (error) {
                reject(new Error('Failed to create object URL'));
            }
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
