import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { t } from '@extension/i18n';
import { ToggleButton } from '@extension/ui';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import TurndownService from 'turndown';

// Function to process syntax-highlighted HTML code blocks with enhanced logging
function htmlToMarkdown(highlightedHTML: string) {
  console.log(
    '%c--- HTML TO MARKDOWN CONVERSION STARTED ---',
    'background: #4a0082; color: white; font-size: 14px; padding: 5px;',
  );

  // State machine states
  const STATE = {
    INITIAL: 'INITIAL',
    HTML_BEFORE_STYLE: 'HTML_BEFORE_STYLE',
    IN_STYLE: 'IN_STYLE',
    HTML_BETWEEN_STYLE_SCRIPT: 'HTML_BETWEEN_STYLE_SCRIPT',
    IN_SCRIPT: 'IN_SCRIPT',
    HTML_AFTER_SCRIPT: 'HTML_AFTER_SCRIPT',
  };

  let currentState = STATE.INITIAL;
  console.log(`%cSTATE: ${currentState}`, 'color: #ff9800; font-weight: bold;');

  // Log input
  console.log('%cInput HTML (first 300 chars):', 'color: #2196f3; font-weight: bold;');
  console.log(highlightedHTML.substring(0, 300) + '...');

  // Helper function to decode HTML entities
  function decodeHtmlEntities(text: string) {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
  }

  // Extract code blocks from both simple and complex structures
  function extractCodeBlocks(html: string) {
    console.log('%cAttempting to extract code blocks...', 'color: #9c27b0; font-weight: bold;');

    const codeBlocks = [];

    // Try to match pre blocks with nested structure (newer ChatGPT format)
    const preRegex = /<pre[^>]*>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/g;
    let match;
    let languageFound = false;

    // First try to find modern code blocks with language headers
    while ((match = preRegex.exec(html)) !== null) {
      console.log('%cFound a pre/code block', 'color: #4caf50;');

      // Try to extract language from the pre block
      const preBlock = match[0];
      const codeContent = match[1];

      // Look for language identifier in a div before the code
      const langMatch = preBlock.match(/<div[^>]*text-token-text-secondary[^>]*>(\w+)<\/div>/);
      const language = langMatch ? langMatch[1] : 'plaintext';

      console.log(`%cCode block language: ${language}`, 'color: #2196f3;');
      codeBlocks.push({
        language,
        content: decodeHtmlEntities(codeContent.trim()),
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });

      languageFound = true;
    }

    // If we didn't find any pre blocks, try for simple code blocks
    if (codeBlocks.length === 0) {
      console.log('%cNo pre/code blocks found, trying simple code tags', 'color: #ff9800;');

      // Try to match simple code tags
      const codeRegex = /<code[^>]*class="!whitespace-pre language-(\w+)"[^>]*>([\s\S]*?)<\/code>/g;

      while ((match = codeRegex.exec(html)) !== null) {
        console.log('%cFound a simple code block with language class', 'color: #4caf50;');
        codeBlocks.push({
          language: match[1],
          content: decodeHtmlEntities(match[2].trim()),
          position: {
            start: match.index,
            end: match.index + match[0].length,
          },
        });
        languageFound = true;
      }
    }

    // If we still haven't found any code blocks with language, try generic code tags
    if (codeBlocks.length === 0) {
      console.log('%cNo language-specific code blocks found, trying generic code tags', 'color: #ff9800;');

      const genericCodeRegex = /<code[^>]*>([\s\S]*?)<\/code>/g;

      while ((match = genericCodeRegex.exec(html)) !== null) {
        console.log('%cFound a generic code block', 'color: #4caf50;');
        codeBlocks.push({
          language: 'plaintext',
          content: decodeHtmlEntities(match[1].trim()),
          position: {
            start: match.index,
            end: match.index + match[0].length,
          },
        });
      }
    }

    console.log(`%cExtracted ${codeBlocks.length} code blocks`, 'color: #4caf50;');
    return codeBlocks;
  }

  try {
    // Check for style or script tags to determine processing method
    if (highlightedHTML.includes('<style>') || highlightedHTML.includes('<script>')) {
      // Use original state machine logic for cases with style or script tags
      let cleanedHTML = highlightedHTML.replace(/<\/?span[^>]*>/g, '');
      console.log('%cAfter span removal (first 300 chars):', 'color: #2196f3;');
      console.log(cleanedHTML.substring(0, 300) + '...');

      const codeBlocks = extractCodeBlocks(cleanedHTML);

      if (codeBlocks.length > 0) {
        console.log('%cGenerating markdown from extracted code blocks', 'color: #4caf50; font-weight: bold;');
        let markdown = '';
        codeBlocks.forEach((block, index) => {
          console.log(
            `%cProcessing code block ${index + 1}/${codeBlocks.length} (${block.language})`,
            'color: #2196f3;',
          );
          markdown += `\`\`\`${block.language}\n${block.content}\n\`\`\`\n\n`;
        });
        console.log('%cSuccessfully generated markdown from code blocks', 'color: #4caf50; font-weight: bold;');
        return markdown.trim();
      }

      console.log('%cNo code blocks found, using structured extraction approach', 'color: #ff9800; font-weight: bold;');

      // Extract the actual code content from within the code tags if present
      const codeRegex = /<code[^>]*>([\s\S]*?)<\/code>/;
      const codeMatch = cleanedHTML.match(codeRegex);

      if (codeMatch) {
        cleanedHTML = codeMatch[1];
        console.log('%cExtracted code content (first 300 chars):', 'color: #2196f3;');
        console.log(cleanedHTML.substring(0, 300) + '...');
      } else {
        console.log('%cNo code tags found!', 'color: #f44336; font-weight: bold;');
      }

      // Output markdown container
      let markdown = '';

      // Check if we have style tag
      const hasStyleTag = cleanedHTML.includes('<style>');
      console.log(`%cHas style tag: ${hasStyleTag}`, 'color: #4caf50;');

      // Check if we have script tag
      const hasScriptTag = cleanedHTML.includes('<script>');
      console.log(`%cHas script tag: ${hasScriptTag}`, 'color: #4caf50;');

      // State machine for parsing
      // Extract HTML before style tag
      if (hasStyleTag) {
        currentState = STATE.HTML_BEFORE_STYLE;
        console.log(`%cSTATE: ${currentState}`, 'color: #ff9800; font-weight: bold;');

        const htmlBeforeStyle = cleanedHTML.match(/^([\s\S]*?)<style>/);
        if (htmlBeforeStyle) {
          const beforeStyleContent = htmlBeforeStyle[1].trim();
          console.log('%cHTML before style:', 'color: #2196f3;');
          console.log(beforeStyleContent.substring(0, 300) + (beforeStyleContent.length > 300 ? '...' : ''));

          markdown += '```html\n' + decodeHtmlEntities(beforeStyleContent) + '\n```\n\n';
        } else {
          console.log('%cFailed to extract HTML before style!', 'color: #f44336; font-weight: bold;');
        }
      }

      // Extract CSS content
      if (hasStyleTag) {
        currentState = STATE.IN_STYLE;
        console.log(`%cSTATE: ${currentState}`, 'color: #ff9800; font-weight: bold;');

        const cssRegex = /<style>([\s\S]*?)<\/style>/;
        const cssMatch = cleanedHTML.match(cssRegex);

        if (cssMatch) {
          const cssContent = cssMatch[1].trim();
          console.log('%cCSS content:', 'color: #2196f3;');
          console.log(cssContent.substring(0, 300) + (cssContent.length > 300 ? '...' : ''));

          markdown += '```css\n' + decodeHtmlEntities(cssContent) + '\n```\n\n';
        } else {
          console.log(
            '%cFailed to extract CSS content despite having style tag!',
            'color: #f44336; font-weight: bold;',
          );
        }
      }

      // Extract HTML between style and script
      if (hasStyleTag && hasScriptTag) {
        currentState = STATE.HTML_BETWEEN_STYLE_SCRIPT;
        console.log(`%cSTATE: ${currentState}`, 'color: #ff9800; font-weight: bold;');

        const htmlBetween = cleanedHTML.match(/<\/style>([\s\S]*?)<script>/);
        if (htmlBetween) {
          const betweenContent = htmlBetween[1].trim();
          console.log('%cHTML between style and script:', 'color: #2196f3;');
          console.log(betweenContent.substring(0, 300) + (betweenContent.length > 300 ? '...' : ''));

          markdown += '```html\n' + decodeHtmlEntities(betweenContent) + '\n```\n\n';
        } else {
          console.log('%cFailed to extract HTML between style and script!', 'color: #f44336; font-weight: bold;');
        }
      } else if (hasStyleTag && !hasScriptTag) {
        // If we have style but no script, extract HTML after style
        currentState = STATE.HTML_AFTER_SCRIPT;
        console.log(`%cSTATE: ${currentState} (no script)`, 'color: #ff9800; font-weight: bold;');

        const htmlAfterStyle = cleanedHTML.match(/<\/style>([\s\S]*?)$/);
        if (htmlAfterStyle && htmlAfterStyle[1].trim()) {
          const afterStyleContent = htmlAfterStyle[1].trim();
          console.log('%cHTML after style (no script):', 'color: #2196f3;');
          console.log(afterStyleContent.substring(0, 300) + (afterStyleContent.length > 300 ? '...' : ''));

          markdown += '```html\n' + decodeHtmlEntities(afterStyleContent) + '\n```\n\n';
        }
      } else if (!hasStyleTag && !hasScriptTag) {
        // If we have neither style nor script, treat everything as HTML
        currentState = STATE.INITIAL;
        console.log(`%cSTATE: ${currentState} (plain HTML)`, 'color: #ff9800; font-weight: bold;');

        console.log('%cProcessing as plain HTML:', 'color: #2196f3;');
        console.log(cleanedHTML.substring(0, 300) + (cleanedHTML.length > 300 ? '...' : ''));

        markdown += '```html\n' + decodeHtmlEntities(cleanedHTML) + '\n```\n\n';
      }

      // Extract JavaScript content
      if (hasScriptTag) {
        currentState = STATE.IN_SCRIPT;
        console.log(`%cSTATE: ${currentState}`, 'color: #ff9800; font-weight: bold;');

        const jsRegex = /<script>([\s\S]*?)<\/script>/;
        const jsMatch = cleanedHTML.match(jsRegex);

        if (jsMatch) {
          const jsContent = jsMatch[1].trim();
          console.log('%cJavaScript content:', 'color: #2196f3;');
          console.log(jsContent.substring(0, 300) + (jsContent.length > 300 ? '...' : ''));

          markdown += '```javascript\n' + decodeHtmlEntities(jsContent) + '\n```\n\n';
        } else {
          console.log(
            '%cFailed to extract JavaScript content despite having script tag!',
            'color: #f44336; font-weight: bold;',
          );
        }
      }

      // Extract HTML after script
      if (hasScriptTag) {
        currentState = STATE.HTML_AFTER_SCRIPT;
        console.log(`%cSTATE: ${currentState}`, 'color: #ff9800; font-weight: bold;');

        const htmlAfterScript = cleanedHTML.match(/<\/script>([\s\S]*?)$/);
        if (htmlAfterScript && htmlAfterScript[1].trim()) {
          const afterScriptContent = htmlAfterScript[1].trim();
          console.log('%cHTML after script:', 'color: #2196f3;');
          console.log(afterScriptContent.substring(0, 300) + (afterScriptContent.length > 300 ? '...' : ''));

          markdown += '```html\n' + decodeHtmlEntities(afterScriptContent) + '\n```';
        } else {
          console.log('%cNo content after script tag or extraction failed', 'color: #ff9800;');
        }
      }

      console.log('%cFinal Markdown:', 'background: #4CAF50; color: white; font-size: 14px; padding: 5px;');
      console.log(markdown);

      console.log(
        '%c--- HTML TO MARKDOWN CONVERSION COMPLETED ---',
        'background: #4a0082; color: white; font-size: 14px; padding: 5px;',
      );

      return markdown;
    } else {
      // For HTML without style/script tags, use a direct approach with Turndown
      console.log(
        '%cUsing direct Turndown approach for content without style/script tags',
        'background: #673ab7; color: white; padding: 3px;',
      );

      // Create a temporary div to work with the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = highlightedHTML;

      // Process the code blocks in the DOM before running Turndown
      // This handles ChatGPT's specific code block structure
      const preElements = tempDiv.querySelectorAll('pre');
      preElements.forEach(pre => {
        // Try to find the container that has the code structure
        const codeContainer = pre.closest('.contain-inline-size') || pre;

        // Extract language from the header if present
        let language = 'plaintext';
        const languageDiv = codeContainer.querySelector('.flex.items-center.text-token-text-secondary');
        if (languageDiv && languageDiv.textContent) {
          language = languageDiv.textContent.trim();
        }

        // Try to get code content from the code element
        let codeContent = '';
        const codeElement = codeContainer.querySelector('code');
        if (codeElement) {
          // Create a clone to work with
          const codeClone = codeElement.cloneNode(true) as HTMLElement;

          // Remove all spans while preserving line breaks
          codeClone.querySelectorAll('span').forEach(span => {
            // Check if the span contains a line break
            const hasLineBreak =
              span.innerHTML.includes('\n') || span.textContent?.includes('\n') || span.nextSibling === null;

            const text = span.textContent || '';
            const textNode = document.createTextNode(text);

            if (span.parentNode) {
              span.parentNode.replaceChild(textNode, span);
              // Ensure line breaks are preserved
              if (hasLineBreak && span.nextSibling) {
                span.parentNode.insertBefore(document.createTextNode('\n'), span.nextSibling);
              }
            }
          });

          // Get the raw text content including whitespace
          codeContent = codeClone.textContent || '';

          // Decode HTML entities but preserve line breaks
          codeContent = decodeHtmlEntities(codeContent);

          // Ensure proper line breaks are maintained
          codeContent = codeContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        } else {
          // If no code element, try to get content from overflow-y-auto div
          const codeDiv = codeContainer.querySelector('.overflow-y-auto');
          if (codeDiv) {
            const clone = codeDiv.cloneNode(true) as HTMLElement;
            // Process spans to preserve line breaks
            clone.querySelectorAll('span').forEach(span => {
              const text = span.textContent || '';
              const textNode = document.createTextNode(text);
              if (span.parentNode) {
                span.parentNode.replaceChild(textNode, span);
              }
            });
            codeContent = decodeHtmlEntities(clone.textContent || '');
            // Ensure proper line breaks
            codeContent = codeContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          } else {
            codeContent = decodeHtmlEntities(pre.textContent || '');
          }
        }

        // Ensure code content is properly formatted with line breaks
        codeContent = codeContent.trim();

        console.log(`%cExtracted code block with language: ${language}`, 'color: #4caf50;');
        console.log(`%cCode content sample:\n${codeContent.substring(0, 100)}...`, 'color: #2196f3;');

        // Create a replacement element with preserved formatting
        const codeBlockDiv = document.createElement('div');
        codeBlockDiv.setAttribute('data-markdown-codeblock', 'true');
        codeBlockDiv.setAttribute('data-language', language);

        // Use pre to preserve whitespace
        const preElement = document.createElement('pre');
        preElement.textContent = codeContent;
        codeBlockDiv.appendChild(preElement);

        // Replace the pre element or its containing structure
        if (codeContainer !== pre && codeContainer.parentNode) {
          codeContainer.parentNode.replaceChild(codeBlockDiv, codeContainer);
        } else if (pre.parentNode) {
          pre.parentNode.replaceChild(codeBlockDiv, pre);
        }
      });

      // Use Turndown for the rest of the content
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
      });

      // Add a custom rule for our marked code blocks
      turndownService.addRule('customCodeBlocks', {
        filter: function (node: any) {
          return node.nodeType === 1 && node.nodeName === 'DIV' && node.hasAttribute('data-markdown-codeblock');
        },
        replacement: function (content: any, node: any) {
          const language = node.getAttribute('data-language') || 'plaintext';

          // Extract the preserved content from the pre element
          const preElement = node.querySelector('pre');
          const codeContent = preElement ? preElement.textContent : content.trim();

          // Special handling for bash/shell commands
          const lines = codeContent.split('\n');
          if (lines.length === 1 && codeContent.length < 50 && (language === 'bash' || language === 'sh')) {
            return '`' + codeContent + '`';
          }

          // For multi-line code, preserve the formatting exactly
          return '\n\n```' + language + '\n' + codeContent + '\n```\n\n';
        },
      });

      // Apply Turndown to the modified DOM
      const markdown = turndownService.turndown(tempDiv);

      // Selective post-processing to fix Turndown's escaping issues
      // Only fix specific patterns without over-processing
      let processedMarkdown = markdown;

      // Fix triple backticks without removing necessary escapes
      processedMarkdown = processedMarkdown.replace(/\\`\\`\\`/g, '```');

      // Fix double backslashes in code blocks (careful not to break proper escaping)
      processedMarkdown = processedMarkdown.replace(/```([^\n]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        // Only fix specific escape patterns inside code blocks
        const fixedCode = code
          .replace(/\\#/g, '#') // Fix escaped hash/comment characters
          .replace(/\\\\/g, '\\') // Fix double backslashes
          .replace(/\\`/g, '`'); // Fix escaped backticks

        return '```' + lang + '\n' + fixedCode + '```';
      });

      console.log('%cFinal Markdown:', 'background: #4CAF50; color: white; font-size: 14px; padding: 5px;');
      console.log(processedMarkdown);

      console.log(
        '%c--- HTML TO MARKDOWN CONVERSION COMPLETED ---',
        'background: #4a0082; color: white; font-size: 14px; padding: 5px;',
      );

      return processedMarkdown.trim();
    }
  } catch (error: unknown) {
    console.log(
      '%c!!! ERROR DURING CONVERSION !!!',
      'background: #f44336; color: white; font-size: 14px; padding: 5px;',
    );
    console.error(error);
    return `Error converting HTML to Markdown: ${error instanceof Error ? error.message : String(error)}`;
  }
}

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
    console.log('%c--- EXTRACTION STARTED ---', 'background: #007bff; color: white; font-size: 14px; padding: 5px;');

    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      console.log('%cNo active tab found!', 'color: #f44336; font-weight: bold;');
      return;
    }

    console.log('%cActive tab:', 'color: #2196f3;', tab);

    // Execute script to extract conversation
    console.log('%cExecuting content script...', 'color: #ff9800; font-weight: bold;');
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        console.log('%cExtraction script running in page context', 'color: #4caf50; font-weight: bold;');

        // Find all conversation turns rather than just looking for h5/h6 elements
        const conversationTurns = document.querySelectorAll('[data-testid^="conversation-turn-"]');
        console.log(`Found ${conversationTurns.length} conversation turns`);

        const conversation: Array<{ role: string; html: string; hasCodeBlock?: boolean }> = [];

        // Process each turn to determine if it's user or assistant
        conversationTurns.forEach(turn => {
          // Check if this is a user message
          const userSrOnly = turn.querySelector('h5.sr-only');
          // Check if this is an assistant message
          const assistantSrOnly = turn.querySelector('h6.sr-only');

          if (userSrOnly && userSrOnly.textContent === 'You said:') {
            console.log('Found user message');
            conversation.push({
              role: 'user',
              html: turn.innerHTML,
            });
          } else if (assistantSrOnly && assistantSrOnly.textContent === 'ChatGPT said:') {
            console.log('Found assistant message');
            // Check if this message contains code blocks
            const hasCodeBlock =
              turn.innerHTML.includes('<pre') || turn.innerHTML.includes('<code class="!whitespace-pre language-');

            console.log(`Assistant message has code block: ${hasCodeBlock}`);

            conversation.push({
              role: 'assistant',
              html: turn.innerHTML,
              hasCodeBlock: hasCodeBlock,
            });
          } else {
            console.log('Skipping unrecognized conversation turn');
          }
        });

        console.log(`Returning conversation with ${conversation.length} messages`);
        return conversation;
      },
    });

    console.log('%cScript execution result:', 'color: #2196f3;', result);

    if (result && result[0]?.result) {
      const conversation = result[0].result;
      console.log(`%cProcessing ${conversation.length} messages`, 'color: #4caf50; font-weight: bold;');

      // Process each message individually
      const processedMessages = conversation.map((msg, index) => {
        console.log(`%cProcessing message ${index} (${msg.role})`, 'color: #ff9800; font-weight: bold;');
        const messageHtml = msg.html;

        // For all messages (with or without code blocks), we will use the enhanced html-to-markdown
        // converter to preserve both text and code formatting
        try {
          if (msg.role === 'assistant' && msg.hasCodeBlock) {
            console.log(
              '%cDetected code block in GPT message, using enhanced htmlToMarkdown',
              'background: #673ab7; color: white; padding: 3px;',
            );
            const markdown = htmlToMarkdown(messageHtml);
            return {
              role: msg.role,
              content: markdown,
            };
          } else {
            console.log('%cUsing standard Turndown conversion', 'color: #2196f3;');
            const turndownService = new TurndownService();
            const markdown = turndownService.turndown(messageHtml);
            console.log(`%cTurndown conversion successful (${markdown.length} chars)`, 'color: #4caf50;');
            return {
              role: msg.role,
              content: markdown,
            };
          }
        } catch (error) {
          console.log('%cConversion error!', 'color: #f44336; font-weight: bold;', error);
          return {
            role: msg.role,
            content: `Error converting message: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      });

      // Format messages as a conversation with clear separators and role labels
      console.log('%cFormatting conversation...', 'color: #ff9800; font-weight: bold;');

      const combinedMarkdown = processedMessages
        .map((msg, index) => {
          const roleLabel = msg.role === 'user' ? '## You' : '## ChatGPT';
          return `${roleLabel}\n\n${msg.content}`;
        })
        .join('\n\n---\n\n');

      // Store the original HTML for later use if needed
      setHtmlContent(conversation.map(msg => msg.html).join('\n'));
      setMarkdownContent(combinedMarkdown);
      setShowMarkdown(true);

      console.log(
        '%cFinal markdown created and displayed',
        'background: #4CAF50; color: white; font-size: 14px; padding: 5px;',
      );

      // Show notification
      chrome.notifications.create({
        ...notificationOptions,
        title: 'Success',
        message: 'Conversation extracted and converted to Markdown!',
      });
    } else {
      console.log(
        '%cNo results returned from script execution!',
        'background: #f44336; color: white; font-size: 14px; padding: 5px;',
      );
      chrome.notifications.create({
        ...notificationOptions,
        title: 'Error',
        message: 'Failed to extract conversation. Please try again.',
      });
    }

    console.log('%c--- EXTRACTION COMPLETED ---', 'background: #007bff; color: white; font-size: 14px; padding: 5px;');
  };

  const copyAsMarkdown = async () => {
    await navigator.clipboard.writeText(markdownContent);
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
