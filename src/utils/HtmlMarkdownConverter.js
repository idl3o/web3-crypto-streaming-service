/**
 * HTML-Markdown Converter
 * 
 * Utility for converting between HTML and Markdown formats
 * in the Web3 Crypto Streaming Service.
 */

import TurndownService from 'turndown';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure turndown (HTML to Markdown)
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  bulletListMarker: '-',
  strongDelimiter: '**'
});

// Add custom rules for Web3/crypto specific elements
turndownService.addRule('blockquote', {
  filter: ['blockquote'],
  replacement: function(content, node) {
    return '> ' + content.trim().replace(/\n/g, '\n> ') + '\n\n';
  }
});

// Support for code blocks with syntax highlighting
turndownService.addRule('pre', {
  filter: function(node) {
    return node.nodeName === 'PRE' && 
           node.firstChild &&
           node.firstChild.nodeName === 'CODE';
  },
  replacement: function(content, node) {
    const language = node.firstChild.getAttribute('class') || '';
    const langMatch = language.match(/language-(\w+)/);
    const lang = langMatch ? langMatch[1] : '';
    
    return '\n```' + lang + '\n' + 
           node.firstChild.textContent.trim() + 
           '\n