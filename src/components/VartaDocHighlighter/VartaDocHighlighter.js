import React, {useEffect, useRef, useState} from 'react';
import {useLocation} from '@docusaurus/router';
import styles from './VartaDocHighlighter.module.css';

/**
 * Autonomous In-Page Document Navigator & Line Highlighter
 * Automatically scrolls through documentation pages and highlights exact lines in real time.
 */
export default function VartaDocHighlighter() {
  const location = useLocation();
  const highlightRef = useRef(null);
  const badgeRef = useRef(null);
  const [autonomousNotice, setAutonomousNotice] = useState(null);

  function clearHighlight() {
    if (badgeRef.current && badgeRef.current.parentNode) {
      badgeRef.current.parentNode.removeChild(badgeRef.current);
      badgeRef.current = null;
    }

    const activeMarks = document.querySelectorAll(`.${styles.highlightPulse}, .${styles.highlightSteady}`);
    activeMarks.forEach((el) => {
      el.classList.remove(styles.highlightPulse, styles.highlightSteady);
    });

    highlightRef.current = null;
  }

  function applyAutonomousScrollAndHighlight(targetText, lineNumber, filePath) {
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
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let node;
      const targetLower = cleanTarget.toLowerCase();
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

    // Fallback: If not found by text, try hash anchor
    if (!matchedElement && window.location.hash) {
      const id = window.location.hash.replace('#', '');
      matchedElement = document.getElementById(id);
    }

    // Fallback: Match heading or paragraph by approximate line or keyword
    if (!matchedElement && cleanTarget) {
      const words = cleanTarget.split(/\s+/).filter((w) => w.length > 3);
      if (words.length > 0) {
        const paragraphs = container.querySelectorAll('p, li, tr, blockquote, h2, h3, h4');
        let bestP = null;
        let maxMatches = 0;
        paragraphs.forEach((p) => {
          const pText = p.textContent.toLowerCase();
          let count = 0;
          words.forEach((w) => {
            if (pText.includes(w.toLowerCase())) count++;
          });
          if (count > maxMatches) {
            maxMatches = count;
            bestP = p;
          }
        });
        if (maxMatches >= 2) {
          matchedElement = bestP;
        }
      }
    }

    if (matchedElement) {
      // 1. Autonomous smooth scrolling through the page
      const rect = matchedElement.getBoundingClientRect();
      const absoluteTop = window.pageYOffset + rect.top;
      const targetTop = Math.max(0, absoluteTop - window.innerHeight / 2 + rect.height / 2);

      // Perform smooth scrolling autonomously
      window.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      });

      // 2. Apply pulsing highlight effect
      matchedElement.classList.add(styles.highlightPulse);

      // 3. Create floating beacon badge directly above the line
      const badge = document.createElement('div');
      badge.className = styles.sourceBadge;
      badge.innerHTML = `
        <span class="${styles.pulseDot}"></span>
        <span>Agent highlighted line ${lineNumber ? lineNumber : ''}: "${cleanTarget.slice(0, 50)}..."</span>
        <button class="${styles.clearBtn}" title="Dismiss highlight">×</button>
      `;

      badge.querySelector(`.${styles.clearBtn}`).onclick = () => {
        clearHighlight();
        setAutonomousNotice(null);
      };

      matchedElement.insertAdjacentElement('beforebegin', badge);
      badgeRef.current = badge;
      highlightRef.current = matchedElement;

      // 4. Show top autonomous notification bar
      setAutonomousNotice({
        filePath: filePath || location.pathname,
        line: lineNumber,
      });

      setTimeout(() => {
        setAutonomousNotice(null);
      }, 5000);

      // Keep steady highlight after pulse
      setTimeout(() => {
        if (matchedElement) {
          matchedElement.classList.remove(styles.highlightPulse);
          matchedElement.classList.add(styles.highlightSteady);
        }
      }, 3000);
    }
  }

  // Handle URL changes with ?highlight= and ?line=
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlightParam = params.get('highlight');
    const lineParam = params.get('line');

    if (highlightParam || lineParam) {
      const timer = setTimeout(() => {
        applyAutonomousScrollAndHighlight(highlightParam, lineParam);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.search, location.hash]);

  // Handle live custom event triggered autonomously by the agent
  useEffect(() => {
    function handleEvent(event) {
      const {text, line, filePath} = event.detail || {};
      setTimeout(() => {
        applyAutonomousScrollAndHighlight(text, line, filePath);
      }, 150);
    }

    window.addEventListener('varta:highlight', handleEvent);
    return () => {
      window.removeEventListener('varta:highlight', handleEvent);
      clearHighlight();
    };
  }, [location.pathname]);

  return (
    <>
      {autonomousNotice && (
        <div className={styles.autonomousTopBar} role="status">
          <span className={styles.topBarPulse}></span>
          <span>
            <strong>Samvaad:</strong> Autonomously scrolled to{' '}
            <code>{autonomousNotice.filePath}</code>{' '}
            {autonomousNotice.line ? `(Line ${autonomousNotice.line})` : ''}
          </span>
          <button
            onClick={() => setAutonomousNotice(null)}
            className={styles.topBarClose}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
