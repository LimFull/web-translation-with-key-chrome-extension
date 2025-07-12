console.log('Content script loaded!'); 

/* global chrome */

let isTranslating = false;
let translatedNodes = new Set(); // 이미 번역된 노드들을 추적
let translatingNodes = new Set(); // 번역 대기/진행 중인 노드들을 추적
let isTranslationEnabled = false; // 번역 기능 on/off 상태
let translationQueue = [];
let translationCache = {};
const MAX_CACHE_ITEMS = 5000;
const CHUNK_SIZE = 25;

/**
 * Safely retrieves values from chrome.storage.local and invokes a callback with the result.
 * 
 * Handles errors both during the storage retrieval and within the callback execution to prevent uncaught exceptions.
 */
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

function getCurrentDomain() {
    return window.location.hostname;
}

// 번역 상태 초기화 (전역 + 도메인별)
function initializeTranslationState() {
    chrome.storage.local.get(['translation_enabled_global', 'translation_enabled_by_domain'], (result) => {
        const enabledGlobal = result.translation_enabled_global !== undefined ? result.translation_enabled_global : true;
        const enabledMap = result.translation_enabled_by_domain || {};
        isTranslationEnabled = enabledGlobal && !!enabledMap[getCurrentDomain()];
        if (isTranslationEnabled) {
            handleNewTextNodes();
        }
    });
}

// chrome.storage.local에서 캐시 불러오기
function loadTranslationCache(callback) {
    chrome.storage.local.get(['translationCache'], (result) => {
        translationCache = result.translationCache || {};
        if (callback) callback();
    });
}

// LRU 캐시 관리: 오래된 항목부터 삭제
function enforceCacheLimit() {
    // 언어-모델별로 모두 순회하며 전체 항목 수를 계산
    let allEntries = [];
    for (const lang in translationCache) {
        for (const model in translationCache[lang]) {
            for (const text in translationCache[lang][model]) {
                allEntries.push({ lang, model, text, value: translationCache[lang][model][text] });
            }
        }
    }
    if (allEntries.length > MAX_CACHE_ITEMS) {
        // 오래된 것부터 MAX_CACHE_ITEMS만 남기고 삭제
        // (단순히 Object 순서 기준)
        const toRemove = allEntries.length - MAX_CACHE_ITEMS;
        for (let i = 0; i < toRemove; i++) {
            const { lang, model, text } = allEntries[i];
            delete translationCache[lang][model][text];
        }
    }
}

// chrome.storage.local에 캐시 저장 (저장 전 캐시 관리)
function saveTranslationCache() {
    enforceCacheLimit();
    chrome.storage.local.set({ translationCache });
}

// 언어/모델별 캐시 접근 함수
function getCacheFor(lang, model) {
    if (!translationCache[lang]) translationCache[lang] = {};
    if (!translationCache[lang][model]) translationCache[lang][model] = {};
    return translationCache[lang][model];
}


// 번역할 노드가 생기면 enqueueTranslationNodes 호출
function handleNewTextNodes() {
    safeGetStorage(['target_language', 'gpt_model'], (result) => {
        const lang = result.target_language || 'Korean';
        const model = result.gpt_model || 'gpt-4.1';
        const cache = getCacheFor(lang, model);
        const textNodes = getMeaningfulTextNodes();
        const newTextNodes = textNodes.filter(node => !translatedNodes.has(node));
        const uncachedNodes = [];
        newTextNodes.forEach(node => {
            const text = node.textContent.trim();
            if (cache[text]) {
                node.textContent = cache[text];
                node.parentElement.setAttribute('data-translated', 'true');
                translatedNodes.add(node);
            } else {
                uncachedNodes.push(node);
            }
        });
        if (uncachedNodes.length > 0) {
            enqueueTranslationNodesWithLangModel(uncachedNodes, lang, model);
        }
    });
}

/**
 * Splits an array of text nodes into chunks and enqueues them for translation with the specified language and model.
 * 
 * Each chunk is added to the translation queue along with its associated language and model information, then the translation queue is processed.
 * 
 * @param {Node[]} nodes - The array of text nodes to be translated.
 * @param {string} lang - The target language code for translation.
 * @param {string} model - The translation model identifier to use.
 */
function enqueueTranslationNodesWithLangModel(nodes, lang, model) {
    for (let i = 0; i < nodes.length; i += CHUNK_SIZE) {
        const chunk = nodes.slice(i, i + CHUNK_SIZE);
        translationQueue.push({ nodes: chunk, lang, model });
    }
    processTranslationQueue();
}

function processTranslationQueue() {
    if (isTranslating || translationQueue.length === 0) return;
    const { nodes, lang, model } = translationQueue[0];
    isTranslating = true;
    translateNodes(nodes, lang, model)
        .then(() => {
            translationQueue.shift();
            isTranslating = false;
            processTranslationQueue();
        })
        .catch(() => {
            isTranslating = false;
            setTimeout(processTranslationQueue, 1000);
        });
}

/**
 * Translates an array of text nodes into the specified language using the selected model.
 *
 * If all node texts are already cached, applies cached translations immediately. Otherwise, sends a translation request for uncached texts and updates the nodes with the translated results. Handles caching, translation state tracking, and ensures the number of translations matches the input. Rejects the promise if translation is disabled, the translation service returns an error, or the response is invalid.
 *
 * @param {Node[]} nodes - Array of text nodes to translate.
 * @param {string} lang - Target language for translation.
 * @param {string} model - Translation model identifier.
 * @returns {Promise<void>} Resolves when translation is complete or all nodes are updated; rejects on error or mismatch.
 */
function translateNodes(nodes, lang, model) {
    return new Promise((resolve, reject) => {
        if (!isTranslationEnabled) {
            reject('Translation is disabled.');
            return;
        }
        if (!nodes || nodes.length === 0) {
            resolve();
            return;
        }
        
        // 번역 요청 시 노드들을 translatingNodes에 추가
        nodes.forEach(node => {
            translatingNodes.add(node);
        });
        
        const cache = getCacheFor(lang, model);
        const texts = nodes.map(n => n.textContent.trim());
        const uncachedTexts = texts.filter(t => !cache[t]);
        if (uncachedTexts.length === 0) {
            nodes.forEach(node => {
                const text = node.textContent.trim();
                node.textContent = cache[text];
                node.parentElement.setAttribute('data-translated', 'true');
                translatedNodes.add(node);
                translatingNodes.delete(node); // 번역 완료 시 translatingNodes에서 제거
            });
            resolve();
            return;
        }
        const inputJsonArray = JSON.stringify(uncachedTexts);
        window.chrome.runtime.sendMessage(
            {
                type: 'CHATGPT_REQUEST',
                model: model,
                instructions:
                    `You are a professional translator. Translate each item in the following JSON array into natural ${lang}. 
                    
CRITICAL REQUIREMENTS:
1. Return EXACTLY the same number of items as the input array
2. Maintain the exact same order as the input array
3. Do NOT merge, combine, or skip any items
4. Do NOT add explanations or formatting
5. Return ONLY a pure JSON array

IMPORTANT: Each array item must be translated individually, even if they seem related or could form a sentence together. Do not combine consecutive items.

Example: 
Input: ["Hello", "world", "how", "are", "you"]
Output: ["안녕하세요", "세계", "어떻게", "있어요", "당신은"]

Each item gets its own translation, regardless of context.`,
                input: inputJsonArray,
            },
            (res) => {
                if (res?.error) {
                    console.error('에러: ' + res.error);
                    // 에러 발생 시에도 translatingNodes에서 제거
                    nodes.forEach(node => {
                        translatingNodes.delete(node);
                    });
                    reject(res.error);
                } else {
                    try {
                        const rawText = res?.data?.output?.[0]?.content?.[0]?.text ?? '';
                        const translatedArray = JSON.parse(rawText);
                        if (Array.isArray(translatedArray)) {
                            if (uncachedTexts.length !== translatedArray.length) {
                                console.error('Text node count and translation result count do not match');
                                
                                // 개수 불일치 시에도 가능한 만큼 캐시에 저장
                                const minLength = Math.min(uncachedTexts.length, translatedArray.length);
                                for (let i = 0; i < minLength; i++) {
                                    addToCache(lang, model, uncachedTexts[i], translatedArray[i]);
                                }
                                
                                // 번역 결과 개수 불일치 시에도 translatingNodes에서 제거
                                nodes.forEach(node => {
                                    translatingNodes.delete(node);
                                });
                                reject('Text node count mismatch');
                                return;
                            }
                            uncachedTexts.forEach((text, idx) => {
                                addToCache(lang, model, text, translatedArray[idx]);
                            });
                            nodes.forEach(node => {
                                const text = node.textContent.trim();
                                if (cache[text]) {
                                    node.textContent = cache[text];
                                    node.parentElement.setAttribute('data-translated', 'true');
                                    translatedNodes.add(node);
                                    translatingNodes.delete(node); // 번역 완료 시 translatingNodes에서 제거
                                }
                            });
                            resolve();
                        } else {
                            console.error('Translation parsing failed (response is not an array)');
                            // 파싱 실패 시에도 translatingNodes에서 제거
                            nodes.forEach(node => {
                                translatingNodes.delete(node);
                            });
                            reject('Translation parsing failed');
                        }
                    } catch (err) {
                        console.error('JSON parsing failed:', err);
                        // JSON 파싱 실패 시에도 translatingNodes에서 제거
                        nodes.forEach(node => {
                            translatingNodes.delete(node);
                        });
                        reject('JSON parsing failed: ' + err.message);
                    }
                }
            }
        );
    });
}

// 메시지 리스너 수정: 전역 토글 메시지 처리
chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'TRANSLATION_TOGGLED') {
        isTranslationEnabled = request.enabled;
        if (isTranslationEnabled) {
            setTimeout(() => {
                handleNewTextNodes();
            }, 500);
        }
    } else if (request.type === 'TRANSLATION_TOGGLED_GLOBAL') {
        // 전역 토글 시 전체 번역 상태 재초기화
        initializeTranslationState();
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
    // 번역된 노드는 제외
    if (node.parentElement.getAttribute && node.parentElement.getAttribute('data-translated') === 'true') return false;
    // 번역 대기/진행 중인 노드는 제외
    if (translatedNodes.has(node) || translatingNodes.has(node)) return false;
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
    translatingNodes = new Set(); // 번역 대기/진행 중인 노드들도 초기화
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
loadTranslationCache(() => {
    initializeTranslationState();
    setupDynamicContentObserver();
    setupPeriodicCheck();
});

// 번역 결과를 캐시에 추가할 때도 관리
function addToCache(lang, model, text, translated) {
    const cache = getCacheFor(lang, model);
    cache[text] = translated;
    enforceCacheLimit();
    saveTranslationCache();
}