let currentData = null;
let currentPrompt = "";
let currentPalette = [];

const PLATFORM_LABELS = {
    youtube: "YOUTUBE",
    behance: "BEHANCE",
    pinterest: "PINTEREST",
    dribbble: "DRIBBBLE"
};

const PLATFORM_DISPLAY_NAMES = {
    youtube: "YouTube Thumbnail",
    behance: "Behance Project",
    pinterest: "Pinterest Pin",
    dribbble: "Dribbble Shot"
};

document.addEventListener("DOMContentLoaded", () => {

    // Main Actions
    document
        .getElementById("analyzeBtn")
        .addEventListener("click", analyzeCurrentPage);

    document
        .getElementById("downloadBtn")
        .addEventListener("click", downloadThumbnail);

    document
        .getElementById("chatgptBtn")
        .addEventListener("click", openChatGPT);

    document
        .getElementById("geminiBtn")
        .addEventListener("click", openGemini);

    document
        .getElementById("copyBtn")
        .addEventListener("click", copyPrompt);

    document
        .getElementById("exportBtn")
        .addEventListener("click", exportJSON);

    document
        .getElementById("clearHistoryBtn")
        .addEventListener("click", clearHistory);

    document
        .getElementById("promptType")
        .addEventListener("change", () => {
            if (currentData) generatePrompt();
        });

    // Initialization
    loadSavedData();
    renderHistory();

    // Disclaimer Handling
    chrome.storage.local.get(["acceptedDisclaimer"], (data) => {
        const modal = document.getElementById("disclaimerModal");
        if (!data.acceptedDisclaimer) {
            modal.classList.remove("hidden");
            modal.style.display = "flex";
        } else {
            modal.style.display = "none";
        }
    });

    document
        .getElementById("acceptDisclaimer")
        .addEventListener("click", () => {
            chrome.storage.local.set({ acceptedDisclaimer: true });
            document.getElementById("disclaimerModal").style.display = "none";
        });
});

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.style.display = "block";

    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
        toast.style.display = "none";
    }, 2200);
}

/* ---------------------------------------------------------
   PLATFORM DETECTION + SCRAPING
--------------------------------------------------------- */

function detectPlatform(url) {
    if (!url) return null;
    if (/youtube\.com\/watch/.test(url)) return "youtube";
    if (/behance\.net\/gallery/.test(url)) return "behance";
    if (/pinterest\.[a-z.]+\/pin\//.test(url)) return "pinterest";
    if (/dribbble\.com\/shots\//.test(url)) return "dribbble";
    return null;
}

function scrapePage(platform) {
    if (platform === "youtube") {
        const title = document.querySelector("h1.ytd-watch-metadata")?.innerText ||
                      document.querySelector('meta[property="og:title"]')?.content || "";

        const channel = document.querySelector("#channel-name a")?.innerText || "";
        const videoId = new URLSearchParams(window.location.search).get("v");

        return {
            title,
            creator: channel,
            thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : (document.querySelector('meta[property="og:image"]')?.content || "")
        };
    }

    if (platform === "behance") {
        const title = document.querySelector('h1[class*="Project"]')?.innerText ||
                      document.querySelector("h1")?.innerText ||
                      document.querySelector('meta[property="og:title"]')?.content || "";

        const creator = document.querySelector('a[class*="OwnerInfo"]')?.innerText ||
                        document.querySelector('[data-creator-name]')?.getAttribute("data-creator-name") ||
                        document.querySelector('a[href*="/user/"], a[href*="/profile/"]')?.innerText || "";

        const thumbnail = document.querySelector('meta[property="og:image"]')?.content ||
                          document.querySelector('img[class*="ImageElement"]')?.src ||
                          document.querySelector("article img")?.src || "";

        return { title: title.trim(), creator: creator.trim(), thumbnail };
    }

    if (platform === "pinterest") {
        const title = document.querySelector('[data-test-id="pinTitle"]')?.innerText ||
                      document.querySelector('h1')?.innerText ||
                      document.querySelector('meta[property="og:title"]')?.content || "";

        const creator = document.querySelector('[data-test-id="creator-profile-name"]')?.innerText ||
                        document.querySelector('a[data-test-id="creator-link"]')?.innerText || "";

        const thumbnail = document.querySelector('div[data-test-id="pin-closeup-image"] img')?.src ||
                          document.querySelector('meta[property="og:image"]')?.content || "";

        return { title: title.trim(), creator: creator.trim(), thumbnail };
    }

    if (platform === "dribbble") {
        const title = document.querySelector('h1')?.innerText ||
                      document.querySelector('meta[property="og:title"]')?.content || "";

        const creator = document.querySelector('.shot-header a[href*="/"]')?.innerText ||
                        document.querySelector('[class*="user"] a')?.innerText || "";

        const thumbnail = document.querySelector('#screenshot img')?.src ||
                          document.querySelector('.detail-shot img')?.src ||
                          document.querySelector('meta[property="og:image"]')?.content || "";

        return { title: title.trim(), creator: creator.trim(), thumbnail };
    }
    return null;
}

async function analyzeCurrentPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const platform = detectPlatform(tab.url);

    if (!platform) {
        alert("افتح فيديو يوتيوب، مشروع Behance، Pin من Pinterest أو Shot من Dribbble أولاً");
        return;
    }

    let result;
    try {
        result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: scrapePage,
            args: [platform]
        });
    } catch (err) {
        console.error(err);
        alert("تعذر الوصول إلى محتوى الصفحة");
        return;
    }

    const scraped = result?.[0]?.result;
    if (!scraped || !scraped.thumbnail) {
        alert("لم يتم العثور على صورة في هذه الصفحة");
        return;
    }

    currentData = {
        platform,
        title: scraped.title || "Untitled",
        creator: scraped.creator || "Unknown",
        thumbnail: scraped.thumbnail
    };

    chrome.storage.local.set({ lastAnalysis: currentData });

    document.getElementById("platformBadge").textContent = PLATFORM_LABELS[platform];
    document.getElementById("videoTitle").textContent = currentData.title;
    document.getElementById("channelName").textContent = currentData.creator;
    document.getElementById("thumbnail").src = currentData.thumbnail;
    document.getElementById("resolutionText").textContent = "Loading...";

    loadImageResolution(currentData.thumbnail);

    // Random Mock Metrics Progress Bars
    document.getElementById("ctrBar").style.width = Math.floor(Math.random() * 40 + 60) + "%";
    document.getElementById("colorBar").style.width = Math.floor(Math.random() * 40 + 60) + "%";
    document.getElementById("qualityBar").style.width = Math.floor(Math.random() * 40 + 60) + "%";

    extractPaletteFromImage(currentData.thumbnail);
    await generatePrompt();
    saveHistoryEntry();

    showToast("Analysis Complete");
}

function loadImageResolution(url) {
    const img = new Image();
    img.onload = () => {
        document.getElementById("resolutionText").textContent = `${img.naturalWidth}x${img.naturalHeight}`;
    };
    img.onerror = () => {
        document.getElementById("resolutionText").textContent = "N/A";
    };
    img.src = url;
}

/* ---------------------------------------------------------
   HEX PALETTE EXTRACTOR
--------------------------------------------------------- */

function extractPaletteFromImage(url) {
    const container = document.getElementById("paletteContainer");
    container.innerHTML = '<span class="palette-empty">جاري استخراج الألوان...</span>';

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
        try {
            const size = 80;
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, size, size);

            const { data } = ctx.getImageData(0, 0, size, size);
            const buckets = {};

            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                if (alpha < 125) continue;

                const r = Math.round(data[i] / 32) * 32;
                const g = Math.round(data[i + 1] / 32) * 32;
                const b = Math.round(data[i + 2] / 32) * 32;

                const key = `${r},${g},${b}`;
                buckets[key] = (buckets[key] || 0) + 1;
            }

            const sorted = Object.entries(buckets)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            currentPalette = sorted.map(([key]) => {
                const [r, g, b] = key.split(",").map(Number);
                return rgbToHex(r, g, b);
            });

            renderPalette(currentPalette);

        } catch (err) {
            console.error(err);
            currentPalette = [];
            container.innerHTML = '<span class="palette-empty">🔒 تعذر استخراج الألوان (قيود CORS لهذه الصورة)</span>';
        }
    };

    img.onerror = () => {
        currentPalette = [];
        container.innerHTML = '<span class="palette-empty">تعذر تحميل الصورة لاستخراج الألوان</span>';
    };
    img.src = url;
}

function rgbToHex(r, g, b) {
    return "#" + [r, g, b]
        .map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
}

function renderPalette(hexColors) {
    const container = document.getElementById("paletteContainer");
    if (!hexColors.length) {
        container.innerHTML = '<span class="palette-empty">لا توجد ألوان مستخرجة</span>';
        return;
    }
    container.innerHTML = "";

    hexColors.forEach(hex => {
        const chip = document.createElement("div");
        chip.className = "palette-chip";

        const swatch = document.createElement("span");
        swatch.className = "palette-swatch";
        swatch.style.background = hex;

        const label = document.createElement("span");
        label.textContent = hex;

        chip.appendChild(swatch);
        chip.appendChild(label);

        chip.addEventListener("click", () => {
            navigator.clipboard.writeText(hex);
            showToast(`${hex} تم النسخ`);
        });
        container.appendChild(chip);
    });
}

/* ---------------------------------------------------------
   PROMPT GENERATION STRATEGIES
--------------------------------------------------------- */

async function generatePrompt() {
    if (!currentData) {
        alert("حلل المحتوى أولاً");
        return false;
    }

    const promptType = document.getElementById("promptType").value;
    const platformLabel = PLATFORM_DISPLAY_NAMES[currentData.platform] || "Visual Asset";
    let strategyBlock;

    if (promptType === "vector-logo") {
        strategyBlock = `STRATEGY: VECTOR LOGO / BRAND IDENTITY
- Treat the subject strictly as a flat, scalable vector mark.
- Enforce clean geometry: precise paths, balanced negative space, no gradients, no photorealistic shading, no bevels or drop shadows unless explicitly part of the brand system.
- Classify the mark type (literal mark, abstract mark, lettermark, combination mark, emblem) and explain why the shape encodes the brand meaning.
- Describe the typography pairing (weight, x-height, geometric vs humanist) and how it balances against the symbol.
- Note color theory choices (primary/secondary palette, contrast ratio, monochrome viability).
- The result must remain legible at 16px favicon scale and reproducible at billboard scale with zero detail loss.`;
    } else {
        strategyBlock = `STRATEGY: CONCEPTUAL DESIGN / ILLUSTRATION
- Perform a semiotic read of the image: identify the core metaphor and the visual philosophy driving the composition.
- Map element synergy: how layered elements (editorial layers, texture, typography, negative space) interact to create tension or harmony.
- Describe textural tension (smooth vs grain, organic vs geometric, flat vs dimensional) and the emotional register it produces.
- Identify the narrative arc the viewer's eye follows (entry point, focal hierarchy, exit point).
- Capture mood, lighting philosophy, and any cultural or art-historical references implied by the style.`;
    }

    const paletteLine = currentPalette.length ? `Detected Dominant Colors: ${currentPalette.join(", ")}` : "Detected Dominant Colors: not extracted";

    currentPrompt = `Analyze this ${platformLabel}.

Title: ${currentData.title}
Creator: ${currentData.creator}
Platform: ${platformLabel}
Image URL: ${currentData.thumbnail}
${paletteLine}

${strategyBlock}

Generate ONLY valid JSON with this exact schema:
{
  "subject": "",
  "core_concept": "",
  "visual_philosophy": "",
  "composition": "",
  "element_synergy": "",
  "lighting": "",
  "camera_angle": "",
  "color_palette": [],
  "typography": "",
  "style": "",
  "mood": "",
  "negative_prompt": "",
  "generation_prompt": ""
}

Return JSON only. No markdown fences, no commentary.`;

    document.getElementById("promptOutput").value = currentPrompt;
    chrome.storage.local.set({ lastPrompt: currentPrompt });
    return true;
}

/* ---------------------------------------------------------
   HISTORY LOG
--------------------------------------------------------- */

function saveHistoryEntry() {
    if (!currentData) return;

    chrome.storage.local.get(["history"], (data) => {
        const history = Array.isArray(data.history) ? data.history : [];
        const entry = {
            title: currentData.title,
            creator: currentData.creator,
            platform: currentData.platform,
            thumbnail: currentData.thumbnail,
            timestamp: Date.now()
        };

        history.unshift(entry);
        const trimmed = history.slice(0, 15);

        chrome.storage.local.set({ history: trimmed }, () => {
            renderHistory();
        });
    });
}

function clearHistory() {
    chrome.storage.local.set({ history: [] }, () => {
        renderHistory();
        showToast("تم مسح السجل");
    });
}

function renderHistory() {
    chrome.storage.local.get(["history"], (data) => {
        const history = Array.isArray(data.history) ? data.history : [];
        const list = document.getElementById("historyList");

        if (!history.length) {
            list.innerHTML = '<span class="history-empty">No analyses yet</span>';
            return;
        }
        list.innerHTML = "";

        history.forEach((entry) => {
            const item = document.createElement("div");
            item.className = "history-item";

            const img = document.createElement("img");
            img.src = entry.thumbnail;
            img.alt = entry.title;

            const meta = document.createElement("div");
            meta.className = "history-meta";

            const titleEl = document.createElement("div");
            titleEl.className = "h-title";
            titleEl.textContent = entry.title;

            const subEl = document.createElement("div");
            subEl.className = "h-sub";

            const tag = document.createElement("span");
            tag.className = "history-platform-tag";
            tag.textContent = PLATFORM_LABELS[entry.platform] || entry.platform;

            const date = document.createElement("span");
            date.textContent = new Date(entry.timestamp).toLocaleDateString();

            subEl.appendChild(tag);
            subEl.appendChild(date);
            meta.appendChild(titleEl);
            meta.appendChild(subEl);
            item.appendChild(img);
            item.appendChild(meta);

            item.addEventListener("click", () => {
                loadHistoryEntry(entry);
            });
            list.appendChild(item);
        });
    });
}

function loadHistoryEntry(entry) {
    currentData = {
        platform: entry.platform,
        title: entry.title,
        creator: entry.creator,
        thumbnail: entry.thumbnail
    };

    document.getElementById("platformBadge").textContent = PLATFORM_LABELS[entry.platform] || "ALL PLATFORMS";
    document.getElementById("videoTitle").textContent = currentData.title;
    document.getElementById("channelName").textContent = currentData.creator;
    document.getElementById("thumbnail").src = currentData.thumbnail;
    document.getElementById("resolutionText").textContent = "Loading...";

    loadImageResolution(currentData.thumbnail);
    extractPaletteFromImage(currentData.thumbnail);
    generatePrompt();

    showToast("تم تحميل العنصر من السجل");
}

/* ---------------------------------------------------------
   PERSISTED STATE
--------------------------------------------------------- */

function loadSavedData() {
    chrome.storage.local.get(["lastAnalysis", "lastPrompt"], (data) => {
        if (data.lastAnalysis) {
            currentData = data.lastAnalysis;
            document.getElementById("platformBadge").textContent = PLATFORM_LABELS[currentData.platform] || "ALL PLATFORMS";
            document.getElementById("videoTitle").textContent = currentData.title || "";
            document.getElementById("channelName").textContent = currentData.creator || "";
            document.getElementById("thumbnail").src = currentData.thumbnail || "";

            if (currentData.thumbnail) {
                loadImageResolution(currentData.thumbnail);
                extractPaletteFromImage(currentData.thumbnail);
            }
        }

        if (data.lastPrompt) {
            currentPrompt = data.lastPrompt;
            document.getElementById("promptOutput").value = currentPrompt;
        }
    });
}

/* ---------------------------------------------------------
   ACTIONS EXPORT / COPY / DOWNLOAD
--------------------------------------------------------- */

async function downloadThumbnail() {
    if (!currentData) {
        alert("حلل المحتوى أولاً");
        return;
    }

    try {
        const response = await fetch(currentData.thumbnail);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentData.platform || "analytical-design"}-image.jpg`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast("Image Downloaded");
    } catch (error) {
        console.error(error);
        alert("فشل تحميل الصورة");
    }
}

async function openChatGPT() {
    const ok = await generatePrompt();
    if (!ok) return;

    await navigator.clipboard.writeText(currentPrompt);
    chrome.tabs.create({ url: "https://chatgpt.com" });
    showToast("تم نسخ البرومبت ونقلك إلى ChatGPT");
}

async function openGemini() {
    const ok = await generatePrompt();
    if (!ok) return;

    await navigator.clipboard.writeText(currentPrompt);
    chrome.tabs.create({ url: "https://gemini.google.com" });
    showToast("تم نسخ البرومبت ونقلك إلى Gemini");
}

async function copyPrompt() {
    if (!currentPrompt) {
        const ok = await generatePrompt();
        if (!ok) return;
    }

    await navigator.clipboard.writeText(currentPrompt);
    showToast("Prompt Copied");
}

function exportJSON() {
    if (!currentPrompt) {
        alert("لا يوجد Prompt لتصديره");
        return;
    }

    const exportPayload = {
        platform: currentData?.platform || null,
        title: currentData?.title || null,
        creator: currentData?.creator || null,
        thumbnail: currentData?.thumbnail || null,
        palette: currentPalette,
        prompt: currentPrompt
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "analytical-design-analysis.json";
    a.click();

    URL.revokeObjectURL(url);
    showToast("JSON Exported");
}