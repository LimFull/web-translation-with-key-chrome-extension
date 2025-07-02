console.log('Content script loaded!'); 

/* global chrome */

let isTranslating = false;
let translatedNodes = new Set(); // 이미 번역된 노드들을 추적
let isTranslationEnabled = false; // 번역 기능 on/off 상태
let translationQueue = [];

// 안전하게 chrome.storage.local.get을 호출하는 함수
function safeGetStorage(keys, callback) {
    try {
        chrome.storage.local.get(keys, (result) => {
            try {
                callback(result);
            } catch (e) {
                console.warn('Callback error or context invalidated:', e);
            }
        });
    } catch (e) {
        console.warn('Storage get error or context invalidated:', e);
    }
}

// 번역 상태 초기화
function initializeTranslationState() {
    safeGetStorage(['translation_enabled'], (result) => {
        isTranslationEnabled = result.translation_enabled || false;
        console.log('Translation enabled:', isTranslationEnabled);
        if (isTranslationEnabled) {
            handleNewTextNodes();
        }
    });
}

// 번역할 노드를 100개씩 묶어서 큐에 넣는 함수
function enqueueTranslationNodes(nodes) {
    for (let i = 0; i < nodes.length; i += 100) {
        const chunk = nodes.slice(i, i + 100);
        translationQueue.push(chunk);
    }
    processTranslationQueue();
}

// 큐를 감시하고 번역을 처리하는 함수
function processTranslationQueue() {
    if (isTranslating || translationQueue.length === 0) return;
    const nodesToTranslate = translationQueue[0]; // 큐의 맨 앞 묶음
    isTranslating = true;
    translateNodes(nodesToTranslate)
        .then(() => {
            // 성공 시 큐에서 제거 후 다음 작업
            translationQueue.shift();
            isTranslating = false;
            processTranslationQueue();
        })
        .catch(() => {
            // 실패 시(비활성, 중복진행 등) 큐에 그대로 두고 재시도
            isTranslating = false;
            setTimeout(processTranslationQueue, 1000); // 1초 후 재시도
        });
}

// 실제 번역을 수행하는 함수 (기존 handleTranslate의 핵심 로직)
function translateNodes(nodes) {
    return new Promise((resolve, reject) => {
        if (!isTranslationEnabled) {
            reject('Translation is disabled.');
            return;
        }
        if (!nodes || nodes.length === 0) {
            resolve();
            return;
        }
        const texts = nodes.map(n => n.textContent.trim());
        const inputJsonArray = JSON.stringify(texts);
        safeGetStorage(['target_language', 'gpt_model'], (result) => {
            const targetLanguage = result.target_language || 'Korean';
            const gptModel = result.gpt_model || 'gpt-4.1';
            window.chrome.runtime.sendMessage(
                {
                    type: 'CHATGPT_REQUEST',
                    model: gptModel,
                    instructions:
                        `You are a professional translator. Translate each item in the following JSON array into natural ${targetLanguage}. Return the result as a JSON array in the same order. Do not include any explanations or formatting.`,
                    input: inputJsonArray,
                },
                (res) => {
                    if (res?.error) {
                        console.error('에러: ' + res.error);
                        reject(res.error);
                    } else {
                        try {
                            const rawText = res?.data?.output?.[0]?.content?.[0]?.text ?? '';
                            const translatedArray = JSON.parse(rawText);
                            if (Array.isArray(translatedArray)) {
                                if (nodes.length !== translatedArray.length) {
                                    console.error('Text node count and translation result count do not match');
                                    reject('Text node count mismatch');
                                    return;
                                }
                                applyTranslations(nodes, translatedArray);
                                resolve();
                            } else {
                                console.error('Translation parsing failed (response is not an array)');
                                reject('Translation parsing failed');
                            }
                        } catch (err) {
                            console.error('JSON parsing failed:', err);
                            reject('JSON parsing failed');
                        }
                    }
                }
            );
        });
    });
}

// 번역할 노드가 생기면 enqueueTranslationNodes 호출
function handleNewTextNodes() {
    const textNodes = getMeaningfulTextNodes();
    const newTextNodes = textNodes.filter(node => !translatedNodes.has(node));
    if (newTextNodes.length > 0) {
        enqueueTranslationNodes(newTextNodes);
    }
}

// 메시지 리스너 추가 (팝업에서 번역 토글 시)
chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'TRANSLATION_TOGGLED') {
        isTranslationEnabled = request.enabled;
        console.log('Translation toggled:', isTranslationEnabled);
        if (isTranslationEnabled) {
            setTimeout(() => {
                handleNewTextNodes();
            }, 500);
        }
    }
});

// 동적 컨텐츠 감지를 위한 MutationObserver 설정
function setupDynamicContentObserver() {
    const observer = new MutationObserver((mutations) => {
        if (!isTranslationEnabled) return;
        let hasNewContent = false;
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.TEXT_NODE || 
                        (node.nodeType === Node.ELEMENT_NODE && node.textContent)) {
                        hasNewContent = true;
                    }
                });
            }
        });
        if (hasNewContent) {
            console.log('New content detected, preparing translation...');
            setTimeout(() => {
                handleNewTextNodes();
            }, 1000);
        }
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
    console.log('Dynamic content detection started');
    return observer;
}

// 주기적으로 새로운 컨텐츠 확인
function setupPeriodicCheck() {
    setInterval(() => {
        if (!isTranslationEnabled) return;
        if (!isTranslating && translationQueue.length === 0) {
            handleNewTextNodes();
        }
    }, 3000);
}

// 번역된 텍스트를 실제 노드에 적용하는 함수
function applyTranslations(textNodes, translatedArray) {
    textNodes.forEach((node, index) => {
        const translatedText = translatedArray[index];
        if (translatedText && typeof translatedText === 'string') {
            node.textContent = translatedText;
            translatedNodes.add(node);
            console.log(`Apply Translation: "${node.textContent.trim()}" -> "${translatedText}"`);
        }
    });
}

function isVisible(node) {
    const style = window.getComputedStyle(node.parentElement || node);
    return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        node.parentElement?.getAttribute('aria-hidden') !== 'true'
    );
}

function isMainContent(node) {
    if (!node.parentElement) return false;
    const parent = node.parentElement;
    const mainContentSelectors = [
        'main', '[role="main"]', '.main', '.content', '.post', '.article', '.entry', '.story', '.comment', '.reply',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'article', 'section', '.text', '.body', '.description', '.caption'
    ];
    for (const selector of mainContentSelectors) {
        if (parent.closest(selector)) {
            return true;
        }
    }
    const uiSelectors = [
        'nav', 'header', 'footer', 'aside', '.nav', '.header', '.footer', '.sidebar', '.menu', '.navigation',
        '.breadcrumb', '.pagination', '.social', '.share', '.ad', '.advertisement', '.banner', '.popup', '.modal', '.tooltip'
    ];
    for (const selector of uiSelectors) {
        if (parent.closest(selector)) {
            return false;
        }
    }
    return true;
}

function shouldSkipText(text) {
    const skipPatterns = [
        /^[\s\W\d]+$/, 
        /^(menu|navigation|search|login|sign|register|subscribe|follow|share|like|comment|reply|edit|delete|save|cancel|close|back|next|previous|home|about|contact|privacy|terms|policy|cookie|advertisement|ad|banner|sponsored|promoted)$/i,
        /^(©|Copyright|All rights reserved|Powered by|Made with|Built with)$/i,
        /^(Loading|Please wait|Error|Success|Warning|Info|Notice)$/i,
        /^(Expand|Collapse|Show|Hide|More|Less|Read more|Read less)$/i,
        /^(Top|Bottom|Left|Right|Center|Middle)$/i,
        /^(Yes|No|OK|Cancel|Confirm|Submit|Reset|Clear)$/i,
        /^[A-Z\s]{1,3}$/, 
        /^\d+$/, 
        /^[^\w\s]{1,3}$/,
    ];
    return skipPatterns.some(pattern => pattern.test(text.trim()));
}
  
function isUsefulNode(node) {
    if (!node.parentElement) return false;
    const tag = node.parentElement.tagName.toLowerCase();
    const skipTags = ['script', 'style', 'svg', 'head', 'noscript', 'meta', 'nav', 'footer', 'aside', 'header'];
    if (skipTags.includes(tag)) return false;
    if (!isVisible(node)) return false;
    const text = node.textContent.trim();
    if (!text) return false;
    if (text.length < 3) return false;
    if (shouldSkipText(text)) return false;
    if (!isMainContent(node)) return false;
    return true;
}
  
function getMeaningfulTextNodes() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
        if (isUsefulNode(node)) {
            nodes.push(node);
        }
    }
    return nodes;
}

// 번역 큐와 상태를 모두 초기화하고 현재 페이지 번역을 다시 시작하는 함수
function resetTranslationQueueAndRestart() {
    translationQueue = [];
    isTranslating = false;
    translatedNodes = new Set();
    // 현재 페이지의 번역을 다시 시작
    if (isTranslationEnabled) {
        handleNewTextNodes();
    }
}

// 새로고침 등으로 페이지가 다시 로드될 때 큐를 비우고 번역을 재시작
window.addEventListener('DOMContentLoaded', () => {
    resetTranslationQueueAndRestart();
});
// SPA 등에서 history 변경 등으로도 번역을 재시작하고 싶다면 아래도 추가 가능
window.addEventListener('popstate', () => {
    resetTranslationQueueAndRestart();
});

// 초기화
initializeTranslationState();
setupDynamicContentObserver();
setupPeriodicCheck();