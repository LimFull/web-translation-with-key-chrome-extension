/* global chrome */
console.log('Background service worker loaded!', chrome.runtime.id); 

 
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('onMessage', request, sender, sendResponse);
  if (request.type === 'CHATGPT_REQUEST') {
     
    chrome.storage.local.get(['chatgpt_token'], (result) => {
      const token = result.chatgpt_token;
      if (!token) {
        sendResponse({ error: 'No token found' });
        return;
      }
      const {type, ...rest} = request;

      if (type === 'CHATGPT_REQUEST') {
        fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ...rest })
          })
            .then(res => res.json())
            .then(data => sendResponse({ data }))
            .catch(err => sendResponse({ error: err.message }));
      }

      
    });
    // 비동기 응답을 위해 true 반환
    return true;
  }
}); 