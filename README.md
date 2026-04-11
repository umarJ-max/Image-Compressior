# Squish — Image Compressor

A client-side image compression tool. Drop in images, adjust quality and format, download compressed versions. Nothing leaves your device.

## What it does

- Compress JPEG, PNG, WebP, and GIF files (up to 50 MB each)
- Adjustable quality slider (10–100%)
- Output format selection — keep original, convert to JPEG, PNG, or WebP
- Live size estimates before compressing
- Batch support — multiple files at once
- Individual or bulk download

## Stack

Plain HTML, CSS, JavaScript. No libraries, no backend. Deployed as a static site on Vercel.

## Files

```
index.html    — markup
styles.css    — all styling
script.js     — compression logic (Canvas API)
vercel.json   — static deployment config
```

## How compression works

Images are drawn onto an HTML5 Canvas element and exported via `canvas.toBlob()` with the specified quality value and MIME type. All processing happens in the browser — no server upload at any point.

## Local dev

Just open `index.html` in a browser. No build step needed.

## Deployment

Push to GitHub. Connect repo to Vercel. It deploys automatically as a static site.

## Notes

- PNG output may sometimes be larger than the original (lossless format)
- WebP gives the best compression ratio in most cases
- Max canvas dimension is capped at 4096×4096 to prevent memory issues on large images
