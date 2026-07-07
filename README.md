# Scope // File Metadata Inspector

**Scope** is a premium, modern, browser-based digital forensics and file analysis tool. It allows users to upload images and PDF files, instantly extracting, displaying, and auditing embedded metadata while highlighting privacy and security exposure.

👉 **Live Demo / Preview**: Served locally at `http://localhost:8000`

---

## ✨ Features

### 1. 📁 File Upload & Validation
* Sleek drag-and-drop zone + file browser integrations.
* Support for images (JPG, JPEG, PNG, WEBP, GIF) and PDF documents.
* Size constraints (max 15MB) and type validations with immediate toast notifications.

### 2. 🔍 Metadata Extraction
* **Common Info**: File name, size, MIME type, extension, last modified date, analysis timestamp.
* **Image Parameters**: Resolution width/height, calculated aspect ratios (common screen ratios highlighted), orientation, and Megapixel count.
* **EXIF Data (via EXIF.js)**: Camera make/model, lens specifications, software/firmware tags, capture timestamps, exposure settings (ISO, aperture, exposure speed, focal length, flash firing modes).
* **GPS & Location Mapping**: Converts coordinate arrays to decimal format, extracts altitude and timestamp, and provides direct links to Google Maps.
* **PDF Fields (via PDF.js)**: Document title, author, subject, creator application, producer, page count, PDF format version, creation and modification dates.

### 3. 🖼️ Interactive Preview Viewport
* **Image Previews**: Native scaling and details inspection.
* **PDF Previews**: Full multi-page rendering canvas with navigation controls.
* **Zoom Controls**: Zoom in/out, fit-to-screen, and a fullscreen modal display.

### 4. 🛡️ Forensic Privacy Audit
* Automatic scanner grading security risk out of 100.
* Details privacy leakage warnings (e.g. coordinates exposed, owner names embedded in documents, camera serials).

### 5. 📂 Search, Filters & Export
* Live-search matching properties and values with visual text highlights.
* Category filtering tab bar (All, General, Technical, GPS).
* Export options to copy all JSON metadata to clipboard, download as a formatted `.json` file, or download a formal `.txt` forensic report.

### 6. 🌙 Personalization & Session History
* Theme toggle between Light and Dark modes (settings saved to `localStorage`).
* Queue lists and local history logs storing recently analyzed items for retrospective audits.

---

## 🛠️ Technology Stack

* **Front-End**: HTML5, CSS3 (Custom design system using CSS properties), JavaScript (ES6+).
* **Metadata Extractors**: [EXIF.js](https://github.com/exif-js/exif-js), [PDF.js](https://mozilla.github.io/pdf.js/).
* **Icons**: [Lucide Icons](https://lucide.dev/).
* **Typography**: Outfit & Inter via Google Fonts.

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/arvindpeddagolla-cloud/meta-file-inspector.git
cd meta-file-inspector
```

### 2. Run a Local Development Server
Since PDF.js uses workers which are restricted by CORS on local `file://` protocols, a local server is required:

**Using Python**:
```bash
python -m http.server 8000
```

**Using Node / npm**:
```bash
npx serve .
```

### 3. Open in Browser
Visit **[http://localhost:8000](http://localhost:8000)** in your web browser.
