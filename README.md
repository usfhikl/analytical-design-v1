# 🔮 Analytical Design • Prompt Engineering Extension

An advanced, lightweight Chromium extension designed for digital creators, prompt engineers, and graphic designers. This tool bridges the gap between visual inspiration and generative AI by decoding the underlying design strategies, color composition, and metadata of any visual asset across major creative platforms with a single click.

---

## 🚀 Core Features

* **Multi-Platform Scraping:** Seamlessly extracts titles, creators, and high-resolution thumbnails from **YouTube**, **Behance**, **Pinterest**, and **Dribbble**.
* **Smart HEX Color Palette Extractor:** Processes image data locally via HTML5 Canvas to instantly build a 5-color dominant palette with instant click-to-copy functionality.
* **Dual-Strategy Prompt Engineering:** * *Conceptual Design / Illustration:* Performs a semiotic read, analyzing metaphors, visual hierarchy, lighting, and textures.
    * *Vector Logo / Brand Identity:* Enforces clean paths, precise negative space, typography alignment, and monochrome scalability constraints.
* **One-Click AI Ecosystem Redirection:** Seamlessly copies the structurally engineered prompt and direct-links to **ChatGPT** or **Gemini Web** for zero-friction analysis.
* **Local History Log:** Saves recent analyses locally using `chrome.storage` for rapid cross-referencing.
* **Data Portability:** Export your complete visual and engineered analysis payload as a structured `JSON` file.

---

## 🛠️ Tech Stack & Architecture

This extension is built completely on vanilla web technologies with **zero external dependencies**, ensuring maximum performance, data privacy, and security.

* **Frontend:** Semantic HTML5, CSS3 Custom Properties (Modern Dark Theme architecture), Inter & JetBrains Mono typography systems.
* **Core Logic:** Vanilla JavaScript (ES6+), Execution Scripting API (`chrome.scripting`), Asynchronous Data Flow.
* **Image Processing:** Client-side HTML5 Canvas pixel extraction (RGB-to-HEX color bucket categorization).
* **Data Storage:** Native Chromium Local Storage API (`chrome.storage.local`).

---

## 📦 Installation (Developer Mode)

Since this extension is optimized for private deployment and local execution, you can load it directly into any Chromium-based browser (Chrome, Edge, Brave, Opera):

1. **Download/Clone** this repository to your local machine.
2. Open your browser and navigate to the extensions management page: `chrome://extensions/`.
3. Enable **Developer Mode** by toggling the switch in the top-right corner.
4. Click on the **Load unpacked** button in the top-left corner.
5. Select the root folder containing the extension's files (where `manifest.json` resides).

---

## 📂 Project Structure

```text
├── manifest.json         # Extension configuration & permission scopes
├── popup.html            # UI Structure & Layout
├── popup.css             # Architecture Styles & Color Themes
├── popup.js              # State engine, scraping logic & palette extraction
└── README.md             # Documentation



🔒 Security & Privacy
100% Client-Side: All prompt generation, scraping, and color extraction take place entirely inside your browser. No data is sent to external servers.

No API Keys Required: By migrating to local prompting and manual web-redirection, your private API tokens are never exposed.

📄 License
This project is open-source and available under the MIT License.
