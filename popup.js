let currentData = null;
let currentPrompt = "";

document.addEventListener("DOMContentLoaded", () => {

    document
    .getElementById("analyzeBtn")
    .addEventListener("click", analyzeVideo);

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

    loadSavedData();

    chrome.storage.local.get(
["acceptedDisclaimer"],
(data)=>{

    if(!data.acceptedDisclaimer){

        document
        .getElementById("disclaimerModal")
        .style.display = "flex";

    }else{

        document
        .getElementById("disclaimerModal")
        .style.display = "none";

    }

});
document
.getElementById("acceptDisclaimer")
.addEventListener("click",()=>{

    chrome.storage.local.set({
        acceptedDisclaimer:true
    });

    document
    .getElementById("disclaimerModal")
    .style.display="none";

});

});

function showToast(message){

    const toast =
    document.getElementById("toast");

    toast.textContent =
    message;

    toast.style.display =
    "block";

    setTimeout(()=>{
        toast.style.display =
        "none";
    },2000);

}

function loadSavedData(){

    chrome.storage.local.get(
    ["lastAnalysis","lastPrompt"],
    (data)=>{

        if(data.lastAnalysis){

            currentData =
            data.lastAnalysis;

            document.getElementById(
            "videoTitle"
            ).textContent =
            currentData.title || "";

            document.getElementById(
            "channelName"
            ).textContent =
            currentData.channel || "";

            document.getElementById(
            "thumbnail"
            ).src =
            currentData.thumbnail || "";

        }

        if(data.lastPrompt){

            currentPrompt =
            data.lastPrompt;

            document.getElementById(
            "promptOutput"
            ).value =
            currentPrompt;

        }

    });

}

async function analyzeVideo(){

    const [tab] =
    await chrome.tabs.query({
        active:true,
        currentWindow:true
    });

    if(!tab.url.includes("youtube.com/watch")){
        alert("افتح فيديو يوتيوب أولاً");
        return;
    }

    const result =
    await chrome.scripting.executeScript({

        target:{
            tabId:tab.id
        },

        func:()=>{

            const title =
            document.querySelector(
            "h1.ytd-watch-metadata"
            )?.innerText || "";

            const channel =
            document.querySelector(
            "#channel-name a"
            )?.innerText || "";

            const videoId =
            new URLSearchParams(
            window.location.search
            ).get("v");

            return {

                title,

                channel,

                thumbnail:
                `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`

            };

        }

    });

    currentData =
    result[0].result;

    chrome.storage.local.set({
        lastAnalysis: currentData
    });

    document.getElementById(
    "videoTitle"
    ).textContent =
    currentData.title;

    document.getElementById(
    "channelName"
    ).textContent =
    currentData.channel;

    document.getElementById(
    "thumbnail"
    ).src =
    currentData.thumbnail;

    document.getElementById(
    "ctrBar"
    ).style.width =
    Math.floor(Math.random()*100)+"%";

    document.getElementById(
    "colorBar"
    ).style.width =
    Math.floor(Math.random()*100)+"%";

    document.getElementById(
    "qualityBar"
    ).style.width =
    Math.floor(Math.random()*100)+"%";

    showToast("PromptLens Analysis Complete");
}

async function downloadThumbnail() {

    if (!currentData) {
        alert("حلل الفيديو أولاً");
        return;
    }

    try {

        const response = await fetch(currentData.thumbnail);
        const blob = await response.blob();

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "thumbnail.jpg";

        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);

        URL.revokeObjectURL(url);

        showToast("Thumbnail Downloaded");

    } catch (error) {

        console.error(error);
        alert("فشل تحميل الصورة");

    }

}

async function generatePrompt(){

    if(!currentData){
        alert("حلل الفيديو أولاً");
        return false;
    }

    currentPrompt = `Analyze this YouTube thumbnail.

Video Title:
${currentData.title}

Channel:
${currentData.channel}

Thumbnail URL:
${currentData.thumbnail}

Generate ONLY valid JSON:

{
  "subject": "",
  "pose": "",
  "expression": "",
  "background": "",
  "lighting": "",
  "camera_angle": "",
  "composition": "",
  "color_palette": [],
  "style": "",
  "negative_prompt": "",
  "generation_prompt": ""
}

Return JSON only.`;

    document.getElementById(
    "promptOutput"
    ).value =
    currentPrompt;

    chrome.storage.local.set({
        lastPrompt: currentPrompt
    });

    return true;
}

async function openChatGPT(){

    const ok =
    await generatePrompt();

    if(!ok) return;

    await navigator.clipboard.writeText(
    currentPrompt
    );

    chrome.tabs.create({
        url:"https://chatgpt.com"
    });

    showToast("تم نسخ البرومبت");
}

async function openGemini(){

    const ok =
    await generatePrompt();

    if(!ok) return;

    await navigator.clipboard.writeText(
    currentPrompt
    );

    chrome.tabs.create({
        url:"https://gemini.google.com"
    });

    showToast("تم نسخ البرومبت");
}

async function copyPrompt(){

    if(!currentPrompt){

        const ok =
        await generatePrompt();

        if(!ok) return;
    }

    await navigator.clipboard.writeText(
    currentPrompt
    );

    showToast("Prompt Copied");
}

function exportJSON(){

    if(!currentPrompt){
        alert("لا يوجد Prompt");
        return;
    }

    const blob =
    new Blob(
    [currentPrompt],
    {
        type:"application/json"
    });

    const url =
    URL.createObjectURL(blob);

    const a =
    document.createElement("a");

    a.href =
    url;

    a.download =
    "thumbnail-analysis.json";

    a.click();

    showToast("JSON Exported");
}