console.log('Content script loaded!'); 

let isTranslating = false;
let translatedNodes = new Set(); // 이미 번역된 노드들을 추적

const handleTranslate = () => {
    if (isTranslating) {
        console.log('번역이 이미 진행 중입니다.');
        return;
    }
    
    const textNodes = getMeaningfulTextNodes();
    const newTextNodes = textNodes.filter(node => !translatedNodes.has(node));
    
    if (newTextNodes.length === 0) {
        console.log('새로운 번역할 텍스트가 없습니다.');
        return;
    }
    
    const texts = newTextNodes.map(n => n.textContent.trim());
    console.log('추출된 텍스트들:', texts);

    const inputJsonArray = JSON.stringify(texts);
  
    if (window.chrome && window.chrome.runtime) {
        isTranslating = true;
        window.chrome.runtime.sendMessage(
            {
                type: 'CHATGPT_REQUEST',
                model: 'gpt-4.1-nano',
                instructions:
                    'You are a professional translator. Translate each item in the following JSON array into natural Korean. Return the result as a JSON array in the same order. Do not include any explanations or formatting.',
                input: inputJsonArray,
            },
            (res) => {
                isTranslating = false;
                if (res?.error) {
                    console.error('에러: ' + res.error);
                } else {
                    try {
                        const rawText = res?.data?.output?.[0]?.content?.[0]?.text ?? '';
                        console.log('GPT 응답:', rawText);

                        // JSON parse 시도
                        const translatedArray = JSON.parse(rawText);
                        if (Array.isArray(translatedArray)) {
                            console.log('translatedArray', translatedArray);
                            // 번역된 텍스트를 실제 노드에 적용
                            applyTranslations(newTextNodes, translatedArray);
                        } else {
                            console.error('번역 결과 파싱 실패 (응답 형식이 배열 아님)');
                        }
                    } catch (err) {
                        console.error('JSON 파싱 실패:', err);
                    }
                }
            }
        );
    } else {
        console.error('크롬 확장 환경에서만 동작합니다.');
    }
};

// 동적 컨텐츠 감지를 위한 MutationObserver 설정
function setupDynamicContentObserver() {
    const observer = new MutationObserver((mutations) => {
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
            console.log('새로운 컨텐츠 감지됨, 번역 준비 중...');
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
    
    console.log('동적 컨텐츠 감지 시작');
    return observer;
}

// 주기적으로 새로운 컨텐츠 확인
function setupPeriodicCheck() {
    setInterval(() => {
        if (!isTranslating) {
            const textNodes = getMeaningfulTextNodes();
            const newTextNodes = textNodes.filter(node => !translatedNodes.has(node));
            
            if (newTextNodes.length > 0) {
                console.log(`${newTextNodes.length}개의 새로운 텍스트 노드 발견`);
                handleTranslate();
            }
        }
    }, 3000); // 3초마다 확인
}

// 번역된 텍스트를 실제 노드에 적용하는 함수
function applyTranslations(textNodes, translatedArray) {
    if (textNodes.length !== translatedArray.length) {
        console.error('텍스트 노드 수와 번역 결과 수가 일치하지 않습니다.');
        return;
    }

    textNodes.forEach((node, index) => {
        const translatedText = translatedArray[index];
        if (translatedText && typeof translatedText === 'string') {
            // 원본 텍스트를 번역된 텍스트로 교체
            node.textContent = translatedText;
            translatedNodes.add(node); // 번역된 노드로 표시
            console.log(`번역 적용: "${node.textContent.trim()}" -> "${translatedText}"`);
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

// 초기 실행
handleTranslate();

// 동적 컨텐츠 감지 설정
setupDynamicContentObserver();
setupPeriodicCheck();