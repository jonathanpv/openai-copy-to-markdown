import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { t } from '@extension/i18n';
import { ToggleButton } from '@extension/ui';

const notificationOptions = {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icon-34.png'),
  title: 'Injecting content script error',
  message: 'You cannot inject script here!',
} as const;

const extractConversation = async () => {
  // Get the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;

  // Execute script to extract conversation
  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const userMessages = document.querySelectorAll('h5.sr-only');
      const gptMessages = document.querySelectorAll('h6.sr-only');
      const conversation = [];

      userMessages.forEach(userMsg => {
        if (userMsg.textContent === 'You said:') {
          // Get the next sibling element containing the message content
          const messageContent = userMsg.closest('[data-testid="conversation-turn-1"]');
          if (messageContent) {
            conversation.push({
              role: 'user',
              html: messageContent.innerHTML,
            });
          }
        }
      });

      gptMessages.forEach(gptMsg => {
        if (gptMsg.textContent === 'ChatGPT said:') {
          // Get the next sibling element containing the message content
          const messageContent = gptMsg.closest('[data-testid="conversation-turn-2"]');
          if (messageContent) {
            conversation.push({
              role: 'assistant',
              html: messageContent.innerHTML,
            });
          }
        }
      });

      console.log('Extracted conversation:', conversation);
      return conversation;
    },
  });

  if (result && result[0]?.result) {
    // Copy to clipboard
    const conversationHtml = result[0].result.map(msg => msg.html).join('\n');
    console.log('Conversation HTML:', conversationHtml);
    await navigator.clipboard.writeText(conversationHtml);
    // Show notification
    chrome.notifications.create({
      ...notificationOptions,
      title: 'Success',
      message: 'Conversation HTML copied to clipboard!',
    });
  }
};

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const logo = isLight ? 'popup/logo_vertical.svg' : 'popup/logo_vertical_dark.svg';
  const goGithubSite = () =>
    chrome.tabs.create({ url: 'https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite' });

  return (
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <button onClick={goGithubSite}>
          <img src={chrome.runtime.getURL(logo)} className="App-logo" alt="logo" />
        </button>
        <h1 className="text-xl font-bold mb-4">HMKRRRRR is a vite/react app</h1>
        <ToggleButton>{t('toggleTheme')}</ToggleButton>
        <button
          onClick={extractConversation}
          className={`mt-4 py-2 px-4 rounded shadow hover:scale-105 ${
            isLight ? 'bg-white text-black border-black' : 'bg-black text-white border-white'
          } border-2 font-bold`}>
          Extract Conversation
        </button>
      </header>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
