console.log('Content script loaded!'); 

let isTranslating = false;
let translatedNodes = new Set(); // 이미 번역된 노드들을 추적
let isTranslationEnabled = false; // 번역 기능 on/off 상태

// 번역 상태 초기화
function initializeTranslationState() {
    // eslint-disable-next-line no-undef
    chrome.storage.local.get(['translation_enabled'], (result) => {
        isTranslationEnabled = result.translation_enabled || false;
        console.log('Translation enabled:', isTranslationEnabled);
        
        // 번역이 활성화되어 있으면 초기 번역 실행
        if (isTranslationEnabled) {
            handleTranslate();
        }
    });
}

const handleTranslate = () => {
    if (!isTranslationEnabled) {
        console.log('Translation is disabled.');
        return;
    }
    
    if (isTranslating) {
        console.log('Translation is already in progress.');
        return;
    }
    
    const textNodes = getMeaningfulTextNodes();
    const newTextNodes = textNodes.filter(node => !translatedNodes.has(node));
    
    if (newTextNodes.length === 0) {
        console.log('No new text to translate.');
        return;
    }
    
    const texts = newTextNodes.map(n => n.textContent.trim());
    console.log('Extracted texts:', texts);

    const inputJsonArray = JSON.stringify(texts);
  
    if (window.chrome && window.chrome.runtime) {
        // 저장된 번역 언어와 모델 가져오기
        // eslint-disable-next-line no-undef
        chrome.storage.local.get(['target_language', 'gpt_model'], (result) => {
            const targetLanguage = result.target_language || 'Korean';
            const gptModel = result.gpt_model || 'gpt-4.1';
            console.log('targetLanguage:', targetLanguage, 'gptModel:', gptModel);
            
            isTranslating = true;
            window.chrome.runtime.sendMessage(
                {
                    type: 'CHATGPT_REQUEST',
                    model: gptModel,
                    instructions:
                        `You are a professional translator. Translate each item in the following JSON array into natural ${targetLanguage}. Return the result as a JSON array in the same order. Do not include any explanations or formatting.`,
                    input: inputJsonArray,
                },
                (res) => {
                    isTranslating = false;
                    if (res?.error) {
                        console.error('에러: ' + res.error);
                    } else {
                        try {
                            const rawText = res?.data?.output?.[0]?.content?.[0]?.text ?? '';
                            console.log('AI response:', rawText);

                            // JSON parse 시도
                            const translatedArray = JSON.parse(rawText);
                            if (Array.isArray(translatedArray)) {
                                console.log('translatedArray', translatedArray);
                                // 번역된 텍스트를 실제 노드에 적용
                                applyTranslations(newTextNodes, translatedArray);
                            } else {
                                console.error('Translation parsing failed (response is not an array)');
                            }
                        } catch (err) {
                            console.error('JSON parsing failed:', err);
                        }
                    }
                }
            );
        });
    } else {
        console.error('Only works in Chrome extension environment.');
    }
};

// 메시지 리스너 추가 (팝업에서 번역 토글 시)
// eslint-disable-next-line no-undef
chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'TRANSLATION_TOGGLED') {
        isTranslationEnabled = request.enabled;
        console.log('Translation toggled:', isTranslationEnabled);
        
        if (isTranslationEnabled) {
            // 번역이 활성화되면 즉시 번역 실행
            setTimeout(() => {
                handleTranslate();
            }, 500);
        }
    }
});

// 동적 컨텐츠 감지를 위한 MutationObserver 설정
function setupDynamicContentObserver() {
    const observer = new MutationObserver((mutations) => {
        if (!isTranslationEnabled) return; // 번역이 비활성화되어 있으면 무시
        
        let hasNewContent = false;
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // 새로운 노드가 추가되었는지 확인
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.TEXT_NODE || 
                        (node.nodeType === Node.ELEMENT_NODE && node.textContent)) {
                        hasNewContent = true;
                    }
                });
            }
        });
        
        // 새로운 컨텐츠가 있으면 잠시 후 번역 실행
        if (hasNewContent) {
            console.log('New content detected, preparing translation...');
            setTimeout(() => {
                handleTranslate();
            }, 1000); // 1초 후 번역 실행 (컨텐츠 로딩 완료 대기)
        }
    });
    
    // DOM 변경 감지 시작
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
        if (!isTranslationEnabled) return; // 번역이 비활성화되어 있으면 무시
        
        if (!isTranslating) {
            const textNodes = getMeaningfulTextNodes();
            const newTextNodes = textNodes.filter(node => !translatedNodes.has(node));
            
            if (newTextNodes.length > 0) {
                console.log(`${newTextNodes.length} new text nodes found`);
                handleTranslate();
            }
        }
    }, 3000); // 3초마다 확인
}

// 번역된 텍스트를 실제 노드에 적용하는 함수
function applyTranslations(textNodes, translatedArray) {
    if (textNodes.length !== translatedArray.length) {
        console.error('Text node count and translation result count do not match');
        return;
    }

    textNodes.forEach((node, index) => {
        const translatedText = translatedArray[index];
        if (translatedText && typeof translatedText === 'string') {
            // 원본 텍스트를 번역된 텍스트로 교체
            node.textContent = translatedText;
            translatedNodes.add(node); // 번역된 노드로 표시
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

// 범용적인 메인 콘텐츠 영역 식별 함수
function isMainContent(node) {
    if (!node.parentElement) return false;
    
    const parent = node.parentElement;
    
    // 메인 콘텐츠 영역 선택자들 (보편적)
    const mainContentSelectors = [
        'main',
        '[role="main"]',
        '.main',
        '.content',
        '.post',
        '.article',
        '.entry',
        '.story',
        '.comment',
        '.reply',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p',
        'article',
        'section',
        '.text',
        '.body',
        '.description',
        '.caption'
    ];

    // 부모 요소가 메인 콘텐츠 영역에 속하는지 확인
    for (const selector of mainContentSelectors) {
        if (parent.closest(selector)) {
            return true;
        }
    }

    // 일반적인 UI 요소들 제외
    const uiSelectors = [
        'nav',
        'header',
        'footer',
        'aside',
        '.nav',
        '.header',
        '.footer',
        '.sidebar',
        '.menu',
        '.navigation',
        '.breadcrumb',
        '.pagination',
        '.social',
        '.share',
        '.ad',
        '.advertisement',
        '.banner',
        '.popup',
        '.modal',
        '.tooltip'
    ];

    // UI 요소에 속하면 제외
    for (const selector of uiSelectors) {
        if (parent.closest(selector)) {
            return false;
        }
    }

    return true;
}

// 불필요한 텍스트 필터링 (보편적)
function shouldSkipText(text) {
    const skipPatterns = [
        /^[\s\W\d]+$/, // 공백/기호/숫자만
        /^(menu|navigation|search|login|sign|register|subscribe|follow|share|like|comment|reply|edit|delete|save|cancel|close|back|next|previous|home|about|contact|privacy|terms|policy|cookie|advertisement|ad|banner|sponsored|promoted)$/i,
        /^(©|Copyright|All rights reserved|Powered by|Made with|Built with)$/i,
        /^(Loading|Please wait|Error|Success|Warning|Info|Notice)$/i,
        /^(Expand|Collapse|Show|Hide|More|Less|Read more|Read less)$/i,
        /^(Top|Bottom|Left|Right|Center|Middle)$/i,
        /^(Yes|No|OK|Cancel|Confirm|Submit|Reset|Clear)$/i,
        /^[A-Z\s]{1,3}$/, // 1-3글자 대문자만 (UI 라벨)
        /^\d+$/, // 숫자만
        /^[^\w\s]{1,3}$/, // 1-3글자 특수문자만
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
    if (text.length < 3) return false; // 최소 3글자 이상
    if (shouldSkipText(text)) return false;

    // 메인 콘텐츠인지 확인
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

// 초기화
initializeTranslationState();

// 동적 컨텐츠 감지 설정
setupDynamicContentObserver();
setupPeriodicCheck();