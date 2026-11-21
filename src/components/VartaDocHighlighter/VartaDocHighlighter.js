import React, {useEffect, useRef} from 'react';
import {useLocation} from '@docusaurus/router';
import styles from './VartaDocHighlighter.module.css';

/**
 * In-Page Document Line & Text Highlighter
 * Automatically scrolls to and highlights lines/sentences in the documentation.
 */
export default function VartaDocHighlighter() {
  const location = useLocation();
  const highlightRef = useRef(null);
  const badgeRef = useRef(null);

  function clearHighlight() {
    if (badgeRef.current && badgeRef.current.parentNode) {
      badgeRef.current.parentNode.removeChild(badgeRef.current);
      badgeRef.current = null;
    }

    const marks = document.querySelectorAll('.varta-doc-highlight-active');
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
        parent.normalize();
      }
    });

    highlightRef.current = null;
  }

  function applyHighlight(targetText, lineNumber) {
    clearHighlight();

    if (!targetText && !lineNumber) return;

    const container =
      document.querySelector('article') ||
      document.querySelector('.theme-doc-markdown') ||
      document.querySelector('.markdown') ||
      document.querySelector('main');

    if (!container) return;

    const cleanTarget = (targetText || '')
      .replace(/^["'`]|["'`]$/g, '')
      .trim();

    let matchedNode = null;
    let matchedElement = null;

    if (cleanTarget.length > 5) {
      // Find element with text content
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let node;
      const targetLower = cleanTarget.toLowerCase();
      // Try first with 40-character phrases if long
      const phrases = [
        targetLower,
        cleanTarget.slice(0, 45).toLowerCase().trim(),
        cleanTarget.slice(0, 25).toLowerCase().trim(),
      ].filter((p) => p.length >= 6);

      while ((node = walker.nextNode())) {
        const textLower = node.textContent.toLowerCase();
        for (const phrase of phrases) {
          const idx = textLower.indexOf(phrase);
          if (idx !== -1) {
            matchedNode = node;
            matchedElement = node.parentElement;
            break;
          }
        }
        if (matchedNode) break;
      }
    }

    // Fallback: If not found by exact text and hash exists
    if (!matchedElement && window.location.hash) {
      const id = window.location.hash.replace('#', '');
      matchedElement = document.getElementById(id);
    }

    if (matchedElement) {
      // Highlight element or text
      matchedElement.classList.add(styles.highlightPulse);

      // Create floating source badge
      const badge = document.createElement('div');
      badge.className = styles.sourceBadge;
      badge.innerHTML = `
        <span class="${styles.pulseDot}"></span>
        <span>📍 Varta Docs Agent: ${lineNumber ? `Line ${lineNumber}` : 'Source located here'}</span>
        <button class="${styles.clearBtn}" title="Dismiss highlight">✕</button>
      `;

      badge.querySelector(`.${styles.clearBtn}`).onclick = () => {
        clearHighlight();
      };

      matchedElement.insertAdjacentElement('beforebegin', badge);
      badgeRef.current = badge;
      highlightRef.current = matchedElement;

      // Scroll smoothly to center
      setTimeout(() => {
        matchedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 150);

      // Clean pulse class after animation
      setTimeout(() => {
        matchedElement.classList.add(styles.highlightSteady);
      }, 2500);
    }
  }

  useEffect(() => {
    // Check URL parameters
    const params = new URLSearchParams(window.location.search);
    const highlightParam = params.get('highlight');
    const lineParam = params.get('line');

    if (highlightParam || lineParam) {
      // Allow DOM to settle
      const timer = setTimeout(() => {
        applyHighlight(highlightParam, lineParam);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    // Custom event listener for instant in-tab triggers from the agent widget
    function handleEvent(event) {
      const {text, line} = event.detail || {};
      applyHighlight(text, line);
    }

    window.addEventListener('varta:highlight', handleEvent);
    return () => {
      window.removeEventListener('varta:highlight', handleEvent);
      clearHighlight();
    };
  }, []);

  return null;
}
