import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { t } from '@extension/i18n';
import { ToggleButton } from '@extension/ui';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import TurndownService from 'turndown';

const demoMarkdown = `# Turndown Demo

This is a demo of Turndown, a tool to convert HTML into Markdown.

## Features
- Convert HTML to Markdown
- Easy to use API
- Customizable options

## Example Usage
\`\`\`javascript
var turndownService = new TurndownService()
var markdown = turndownService.turndown('<h1>Hello world!</h1>')
\`\`\`
`;

const notificationOptions = {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icon-34.png'),
  title: 'Copy Status',
  message: '',
} as const;

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const logo = isLight ? 'popup/logo_vertical.svg' : 'popup/logo_vertical_dark.svg';
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');

  const goGithubSite = () =>
    chrome.tabs.create({ url: 'https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite' });

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
            const messageContent = gptMsg.closest('[data-testid="conversation-turn-2"]');
            if (messageContent) {
              conversation.push({
                role: 'assistant',
                html: messageContent.innerHTML,
              });
            }
          }
        });

        return conversation;
      },
    });

    if (result && result[0]?.result) {
      const conversationHtml = result[0].result.map(msg => msg.html).join('\n');
      setHtmlContent(conversationHtml);

      // Convert HTML to Markdown
      const turndownService = new TurndownService();
      const markdown = turndownService.turndown(conversationHtml);
      setMarkdownContent(markdown);
      setShowMarkdown(true);

      // Show notification
      chrome.notifications.create({
        ...notificationOptions,
        title: 'Success',
        message: 'Conversation extracted and converted to Markdown!',
      });
    }
  };

  const copyAsMarkdown = async () => {
    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(htmlContent);
    await navigator.clipboard.writeText(markdown);
    chrome.notifications.create({
      ...notificationOptions,
      message: 'Markdown copied to clipboard!',
    });
  };

  return (
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <button onClick={goGithubSite}>
          <img src={chrome.runtime.getURL(logo)} className="App-logo" alt="logo" />
        </button>
        <h1 className="text-xl font-bold mb-4">HMKRRRRR is a vite/react app</h1>
        <ToggleButton>{t('toggleTheme')}</ToggleButton>

        <div className="flex flex-col gap-4 mt-4 w-full max-w-xl">
          <button
            onClick={extractConversation}
            className={`py-2 px-4 rounded shadow hover:scale-105 ${
              isLight ? 'bg-white text-black border-black' : 'bg-black text-white border-white'
            } border-2 font-bold`}>
            Extract & Preview Conversation
          </button>

          {showMarkdown && (
            <div className={`p-4 rounded ${isLight ? 'bg-white' : 'bg-gray-700'}`}>
              <ReactMarkdown>{markdownContent || demoMarkdown}</ReactMarkdown>
              <button
                onClick={copyAsMarkdown}
                className={`mt-4 py-2 px-4 rounded shadow hover:scale-105 ${
                  isLight ? 'bg-blue-500 text-white' : 'bg-blue-400 text-black'
                } font-bold`}>
                Copy as Markdown
              </button>
            </div>
          )}
        </div>
      </header>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
