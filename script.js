class ImageCompressor {
  constructor() {
    this.selectedFiles = [];
    this.compressedImages = [];
    this.isProcessing = false;

    this.uploadArea   = document.getElementById('uploadArea');
    this.dropZone     = document.getElementById('dropZone');
    this.fileInput    = document.getElementById('fileInput');
    this.uploadBtn    = document.getElementById('uploadBtn');
    this.controlsCard = document.getElementById('controlsCard');
    this.fileInfoBadge= document.getElementById('fileInfoBadge');
    this.previewList  = document.getElementById('previewList');
    this.resetBtn     = document.getElementById('resetBtn');
    this.qualitySlider= document.getElementById('qualitySlider');
    this.qualityValue = document.getElementById('qualityValue');
    this.sliderFill   = document.getElementById('sliderFill');
    this.formatSelect = document.getElementById('formatSelect');
    this.compressBtn  = document.getElementById('compressBtn');
    this.progressCard = document.getElementById('progressCard');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.resultsCard  = document.getElementById('resultsCard');
    this.resultsGrid  = document.getElementById('resultsGrid');
    this.downloadAllBtn = document.getElementById('downloadAllBtn');
    this.newBatchBtn  = document.getElementById('newBatchBtn');

    this.bindEvents();
  }

  bindEvents() {
    this.uploadBtn.addEventListener('click', e => { e.stopPropagation(); this.fileInput.click(); });
    this.dropZone.addEventListener('click', e => { if (e.target === this.dropZone) this.fileInput.click(); });
    this.fileInput.addEventListener('change', e => this.handleFiles(Array.from(e.target.files)));

    this.dropZone.addEventListener('dragover', e => { e.preventDefault(); this.dropZone.classList.add('drag-over'); });
    this.dropZone.addEventListener('dragleave', () => this.dropZone.classList.remove('drag-over'));
    this.dropZone.addEventListener('drop', e => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
      this.handleFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
    });

    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', e => e.preventDefault());

    this.qualitySlider.addEventListener('input', () => {
      const v = this.qualitySlider.value;
      this.qualityValue.textContent = v + '%';
      const pct = ((v - 10) / 90) * 100;
      this.sliderFill.style.width = pct + '%';
      this.updateEstimates();
    });
    this.formatSelect.addEventListener('change', () => this.updateEstimates());

    this.compressBtn.addEventListener('click', () => this.compress());
    this.resetBtn.addEventListener('click', () => this.reset());
    this.downloadAllBtn.addEventListener('click', () => this.downloadAll());
    this.newBatchBtn.addEventListener('click', () => this.reset());
  }

  handleFiles(files) {
    const valid = files.filter(f => {
      const ok = ['image/jpeg','image/png','image/webp','image/gif'].includes(f.type);
      const size = f.size <= 50 * 1024 * 1024;
      if (!ok)   this.toast(`Unsupported type: ${f.name}`);
      if (!size) this.toast(`Too large (max 50MB): ${f.name}`);
      return ok && size;
    });
    if (!valid.length) return;

    this.selectedFiles = valid;
    this.show(this.controlsCard);
    this.hide(this.uploadArea);
    this.hide(this.progressCard);
    this.hide(this.resultsCard);

    const total = valid.reduce((s, f) => s + f.size, 0);
    this.fileInfoBadge.textContent = `${valid.length} file${valid.length > 1 ? 's' : ''} · ${this.fmt(total)} total`;

    this.previewList.innerHTML = '';
    valid.forEach(f => {
      const item = document.createElement('div');
      item.className = 'preview-item';
      const img = document.createElement('img');
      img.className = 'preview-thumb';
      img.src = URL.createObjectURL(f);
      img.onload = () => URL.revokeObjectURL(img.src);

      item.innerHTML = `
        <div class="preview-meta">
          <div class="preview-name">${f.name}</div>
          <div class="preview-size">${this.fmt(f.size)}</div>
          <div class="preview-est" data-fname="${f.name}">Estimating…</div>
        </div>
      `;
      item.prepend(img);
      this.previewList.appendChild(item);
    });

    this.updateEstimates();
  }

  updateEstimates() {
    if (!this.selectedFiles.length) return;
    const q = this.qualitySlider.value / 100;
    const fmt = this.formatSelect.value;
    this.selectedFiles.forEach(f => {
      const el = document.querySelector(`[data-fname="${f.name}"]`);
      if (!el) return;
      let est = f.size * q;
      if (fmt === 'jpeg') est *= 0.7;
      else if (fmt === 'webp') est *= 0.6;
      else if (fmt === 'png') est *= 1.1;
      const saved = ((f.size - est) / f.size * 100).toFixed(0);
      el.textContent = `≈ ${this.fmt(est)} · ${saved}% saved`;
    });
  }

  async compress() {
    if (!this.selectedFiles.length || this.isProcessing) return;
    this.isProcessing = true;
    this.compressBtn.disabled = true;
    this.compressBtn.textContent = 'Compressing…';
    this.hide(this.resultsCard);
    this.show(this.progressCard);
    this.compressedImages = [];

    const q = this.qualitySlider.value / 100;
    const fmt = this.formatSelect.value;

    try {
      for (let i = 0; i < this.selectedFiles.length; i++) {
        const f = this.selectedFiles[i];
        const pct = (i / this.selectedFiles.length) * 100;
        this.updateProgress(pct, `Compressing ${f.name}…`);
        const blob = await this.compressOne(f, q, fmt);
        const ratio = ((f.size - blob.size) / f.size * 100).toFixed(1);
        this.compressedImages.push({
          original: f,
          compressed: blob,
          name: this.newName(f.name, fmt),
          originalSize: f.size,
          compressedSize: blob.size,
          ratio
        });
      }
      this.updateProgress(100, 'Done!');
      setTimeout(() => {
        this.hide(this.progressCard);
        this.showResults();
      }, 700);
    } catch (err) {
      this.toast('Compression failed: ' + err.message);
    } finally {
      this.isProcessing = false;
      this.compressBtn.disabled = false;
      this.compressBtn.textContent = 'Compress Images';
    }
  }

  compressOne(file, quality, outputFormat) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let { naturalWidth: w, naturalHeight: h } = img;
        const MAX = 4096;
        if (w > MAX || h > MAX) {
          const r = Math.min(MAX / w, MAX / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const mime = outputFormat === 'jpeg' ? 'image/jpeg'
                   : outputFormat === 'png'  ? 'image/png'
                   : outputFormat === 'webp' ? 'image/webp'
                   : file.type;
        canvas.toBlob(blob => {
          if (blob && blob.size > 0) resolve(blob);
          else reject(new Error('Empty blob'));
        }, mime, quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Failed to load ${file.name}`)); };
      img.src = url;
    });
  }

  showResults() {
    this.resultsGrid.innerHTML = '';
    this.compressedImages.forEach((item, i) => {
      const r = parseFloat(item.ratio);
      const [cls, label] = r >= 30 ? ['badge-great','Great'] : r >= 10 ? ['badge-ok','Good'] : ['badge-low','Minimal'];
      const div = document.createElement('div');
      div.className = 'result-item';
      div.innerHTML = `
        <div class="result-info">
          <div class="result-name">${item.name}</div>
          <div class="result-stats">${this.fmt(item.originalSize)} → ${this.fmt(item.compressedSize)}</div>
        </div>
        <span class="result-badge ${cls}">${label} −${item.ratio}%</span>
        <button class="btn-dl-single" data-index="${i}">↓ Save</button>
      `;
      this.resultsGrid.appendChild(div);
    });
    this.resultsGrid.querySelectorAll('.btn-dl-single').forEach(btn => {
      btn.addEventListener('click', () => this.downloadOne(+btn.dataset.index));
    });
    this.show(this.resultsCard);
  }

  downloadOne(i) {
    const { compressed, name } = this.compressedImages[i];
    const url = URL.createObjectURL(compressed);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  downloadAll() {
    this.compressedImages.forEach((_, i) => setTimeout(() => this.downloadOne(i), i * 120));
  }

  reset() {
    this.selectedFiles = [];
    this.compressedImages = [];
    this.isProcessing = false;
    this.fileInput.value = '';
    this.show(this.uploadArea);
    this.hide(this.controlsCard);
    this.hide(this.progressCard);
    this.hide(this.resultsCard);
  }

  updateProgress(pct, text) {
    this.progressFill.style.width = pct + '%';
    this.progressText.textContent = text;
  }

  show(el) { el.classList.remove('hidden'); }
  hide(el) { el.classList.add('hidden'); }

  fmt(bytes) {
    if (!bytes) return '0 B';
    const u = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + u[i];
  }

  newName(name, fmt) {
    const base = name.replace(/\.[^/.]+$/, '');
    const ext = fmt === 'jpeg' ? '.jpg' : fmt === 'png' ? '.png' : fmt === 'webp' ? '.webp'
              : name.match(/\.[^/.]+$/)?.[0] || '.jpg';
    return base + '_squished' + ext;
  }

  toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4500);
  }
}

document.addEventListener('DOMContentLoaded', () => { new ImageCompressor(); });
