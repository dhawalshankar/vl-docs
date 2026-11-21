import React, {useEffect, useState} from 'react';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import DeveloperDocsSearch from '../components/DeveloperDocsSearch';
import VartaDocsAgent from '../components/VartaDocsAgent/VartaDocsAgent';
import VartaDocHighlighter from '../components/VartaDocHighlighter/VartaDocHighlighter';
import styles from './Root.module.css';

const SESSION_KEY = 'vl-developer-docs-access-v1';
const DEVELOPER_DOCS_PATH = '/docs/development';

export default function Root({children}) {
  const {pathname} = useLocation();
  const {siteConfig} = useDocusaurusContext();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const isProtectedPath =
    pathname === DEVELOPER_DOCS_PATH ||
    pathname.startsWith(`${DEVELOPER_DOCS_PATH}/`);
  const gate = siteConfig.customFields.developerGate;

  useEffect(() => {
    if (isProtectedPath) {
      setUnlocked(window.sessionStorage.getItem(SESSION_KEY) === 'granted');
    }
    setSessionChecked(true);
  }, [isProtectedPath]);

  // Load official Sarvam Voice Agent embed script if configured
  useEffect(() => {
    const scriptSrc = siteConfig.customFields?.sarvamVoiceAgentScript;
    if (scriptSrc && typeof document !== 'undefined') {
      if (!document.querySelector(`script[src="${scriptSrc}"]`)) {
        const script = document.createElement('script');
        script.src = scriptSrc;
        script.async = true;
        document.body.appendChild(script);
      }
    }
  }, [siteConfig.customFields?.sarvamVoiceAgentScript]);

  function lockDeveloperDocs() {
    window.sessionStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
  }

  function renderInnerContent() {
    if (!isProtectedPath) {
      return children;
    }

    if (!sessionChecked) {
      return (
        <main className={styles.gatePage}>
          <p>Checking developer-doc access...</p>
        </main>
      );
    }

    if (!unlocked) {
      function handleSubmit(event) {
        event.preventDefault();
        setError('');

        if (!gate.username || !gate.password) {
          setError('The developer-doc gate is not configured for this build.');
          return;
        }

        if (username.trim() !== gate.username || password !== gate.password) {
          setError('The username or password is incorrect.');
          return;
        }

        window.sessionStorage.setItem(SESSION_KEY, 'granted');
        setPassword('');
        setUnlocked(true);
      }

      return (
        <main className={styles.gatePage}>
          <section className={styles.gateCard} aria-labelledby="gate-title">
            <p className={styles.eyebrow}>VartaLang developer docs</p>
            <h1 id="gate-title">Sign in to continue</h1>
            <p className={styles.description}>
              Enter your developer-doc username and password.
            </p>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label htmlFor="developer-username">Username</label>
              <input
                autoComplete="username"
                id="developer-username"
                onChange={(event) => setUsername(event.target.value)}
                required
                value={username}
              />
              <label htmlFor="developer-password">Password</label>
              <input
                autoComplete="current-password"
                id="developer-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <button className={styles.submitButton} type="submit">
                Sign in
              </button>
            </form>
          </section>
        </main>
      );
    }

    return (
      <>
        <div className={styles.accessBar}>
          <span>Developer docs unlocked for this tab</span>
          <DeveloperDocsSearch baseUrl={siteConfig.baseUrl} />
          <button onClick={lockDeveloperDocs} type="button">
            Lock
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <>
      <VartaDocHighlighter />
      {renderInnerContent()}
      <VartaDocsAgent />
    </>
  );
}
