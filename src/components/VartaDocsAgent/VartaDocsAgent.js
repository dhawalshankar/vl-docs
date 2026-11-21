import React, {useState, useEffect, useRef} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import SarvamLogo from './SarvamLogo';
import {loadDocsCorpus, askSarvamDocsAgent} from '../../utils/vartaAgentService';
import styles from './VartaDocsAgent.module.css';

const STORAGE_KEY_API_KEY = 'varta_sarvam_api_key';
const STORAGE_KEY_MODEL = 'varta_sarvam_model';

export default function VartaDocsAgent() {
  const {siteConfig} = useDocusaurusContext();
  const defaultApiKey = siteConfig.customFields?.sarvamApiKey || '';
  const defaultModel = siteConfig.customFields?.sarvamModel || 'sarvam-105b';

  const [isOpen, setIsOpen] = useState(false);
  const [isDockVisible, setIsDockVisible] = useState(true);
  const [inCall, setInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatusText, setCallStatusText] = useState('Call ended · 0:00');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [corpus, setCorpus] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(defaultApiKey);
  const [model, setModel] = useState(defaultModel);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechActive, setSpeechActive] = useState(false);

  const messagesEndRef = useRef(null);
  const callTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

  // Load saved API key & model
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = window.localStorage.getItem(STORAGE_KEY_API_KEY);
      if (savedKey) setApiKey(savedKey);
      const savedModel = window.localStorage.getItem(STORAGE_KEY_MODEL);
      if (savedModel) setModel(savedModel);
    }
  }, []);

  // Preload corpus
  useEffect(() => {
    loadDocsCorpus(siteConfig.baseUrl)
      .then((data) => setCorpus(data))
      .catch((err) => console.warn('Could not load corpus:', err));
  }, [siteConfig.baseUrl]);

  // Scroll messages to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({behavior: 'smooth'});
    }
  }, [messages, loading]);

  // Call duration counter
  useEffect(() => {
    if (inCall) {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [inCall]);

  const formattedCallTime = `${Math.floor(callDuration / 60)}:${(callDuration % 60)
    .toString()
    .padStart(2, '0')}`;

  // Initialize Speech Recognition if supported
  function startListening() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your question.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN'; // Indian English, also recognizes Hindi keywords

      recognition.onstart = () => {
        setSpeechActive(true);
        setCallStatusText(`Listening... · ${formattedCallTime}`);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          handleSendMessage(transcript);
        }
      };

      recognition.onerror = (e) => {
        console.warn('Speech error:', e);
        setSpeechActive(false);
      };

      recognition.onend = () => {
        setSpeechActive(false);
        if (inCall) {
          setCallStatusText(`Live Call · ${formattedCallTime}`);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech Recognition init error:', e);
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setSpeechActive(false);
  }

  function speakText(text) {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    window.speechSynthesis.cancel();
    // Clean markdown before speaking
    const clean = text
      .replace(/\[\[.*?\]\]/g, '')
      .replace(/[*_#`>]/g, '')
      .replace(/docs\/[a-z0-9\-_./]+/gi, 'documentation')
      .slice(0, 300);

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-IN';
    window.speechSynthesis.speak(utterance);
  }

  function toggleCall() {
    if (inCall) {
      setInCall(false);
      stopListening();
      if (synthRef.current) synthRef.current.cancel();
      setCallStatusText(`Call ended · ${formattedCallTime}`);
    } else {
      setIsOpen(true);
      setInCall(true);
      setCallStatusText('Connecting to Sarvam...');
      setTimeout(() => {
        setCallStatusText('Live Call · 0:00');
        startListening();
      }, 600);
    }
  }

  // Handle location highlight navigation
  function navigateAndHighlight(citation) {
    if (!citation) return;
    const targetUrl = `${citation.docPath}?highlight=${encodeURIComponent(
      citation.quote || ''
    )}&line=${citation.targetLine || citation.startLine}${citation.anchor || ''}`;

    // Dispatches custom event for immediate highlight if already on page
    window.dispatchEvent(
      new CustomEvent('varta:highlight', {
        detail: {
          text: citation.quote,
          line: citation.targetLine || citation.startLine,
        },
      })
    );

    // Navigate to page
    if (window.location.pathname !== citation.docPath) {
      window.location.href = targetUrl;
    } else {
      // Just update hash and search if on same page
      window.history.pushState(null, '', targetUrl);
    }
  }

  async function handleSendMessage(queryText) {
    const query = (queryText || inputValue).trim();
    if (!query) return;

    setInputValue('');
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      timestamp: formattedCallTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const activeCorpus = corpus || (await loadDocsCorpus(siteConfig.baseUrl));
      const historyForAgent = messages.slice(-4).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const result = await askSarvamDocsAgent({
        query,
        apiKey,
        model,
        corpus: activeCorpus,
        history: historyForAgent,
      });

      const assistantMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: result.answer,
        citations: result.citations || [],
        timestamp: formattedCallTime,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speakText(result.answer);

      // Auto-trigger highlight if user explicitly asked "where is it located/highlight"
      const lowerQ = query.toLowerCase();
      if (
        (lowerQ.includes('where') || lowerQ.includes('highlight') || lowerQ.includes('locate')) &&
        result.citations &&
        result.citations.length > 0
      ) {
        // Automatically highlight the primary citation after answering
        setTimeout(() => {
          navigateAndHighlight(result.citations[0]);
        }, 1200);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: `Error contacting Sarvam Docs Agent: ${err.message}. Please check your network or API key in settings.`,
          timestamp: formattedCallTime,
        },
      ]);
    } finally {
      setLoading(false);
      if (inCall) {
        // Re-listen in voice call mode
        setTimeout(() => {
          startListening();
        }, 1500);
      }
    }
  }

  function copyTranscript() {
    const transcript = messages
      .map((m) => `${m.sender === 'user' ? 'User' : 'Sarvam'} (${m.timestamp}): ${m.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(transcript);
    alert('Conversation transcript copied to clipboard!');
  }

  function saveSettings(e) {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
      window.localStorage.setItem(STORAGE_KEY_MODEL, model);
    }
    setShowSettings(false);
  }

  if (!isDockVisible) {
    return (
      <button
        className={styles.reopenButton}
        onClick={() => setIsDockVisible(true)}
        title="Open Docs Assistant"
      >
        <SarvamLogo size={22} />
        <span>Docs Assistant</span>
      </button>
    );
  }

  return (
    <div className={styles.container}>
      {/* Expanded Modal Window */}
      {isOpen && (
        <div className={styles.modalWindow} role="dialog" aria-label="Docs Assistant">
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerTitleGroup}>
              <div className={styles.logoWrapper}>
                <SarvamLogo size={26} />
              </div>
              <div>
                <h3 className={styles.title}>Docs Assistant</h3>
                <p className={styles.subtitle}>
                  {inCall ? `Live Call · ${formattedCallTime}` : callStatusText}
                </p>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button
                className={styles.iconBtn}
                onClick={() => setShowSettings(!showSettings)}
                title="Sarvam API Settings"
              >
                ⚙️
              </button>
              {messages.length > 0 && (
                <button
                  className={styles.iconBtn}
                  onClick={copyTranscript}
                  title="Copy Transcript"
                >
                  📋
                </button>
              )}
              <button
                className={styles.iconBtn}
                onClick={() => setIsOpen(false)}
                title="Minimize"
              >
                —
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => {
                  setIsOpen(false);
                  if (inCall) toggleCall();
                }}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Settings Drawer */}
          {showSettings && (
            <form className={styles.settingsPanel} onSubmit={saveSettings}>
              <h4>Sarvam AI Settings</h4>
              <label>Sarvam Subscription Key</label>
              <input
                type="password"
                placeholder="Enter Sarvam API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <label>Model</label>
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="sarvam-105b">sarvam-105b (Reasoning & Code)</option>
                <option value="sarvam-105b-conversations">sarvam-105b-conversations</option>
                <option value="sarvam-2b">sarvam-2b (Fast)</option>
              </select>
              <div className={styles.checkboxRow}>
                <label>
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={(e) => setVoiceEnabled(e.target.checked)}
                  />
                  Voice speech output (TTS)
                </label>
              </div>
              <div className={styles.settingsButtons}>
                <button type="submit" className={styles.primaryBtn}>
                  Save Settings
                </button>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Conversation or Initial State */}
          <div className={styles.contentArea}>
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={`${styles.waveIcon} ${speechActive ? styles.waveActive : ''}`}>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <h3>Say hello</h3>
                <p>Your conversation will appear here as you talk or type.</p>

                <div className={styles.promptSuggestions}>
                  <p className={styles.suggestTitle}>Or try asking:</p>
                  <button
                    onClick={() =>
                      handleSendMessage('Where is Sarvam AI located in my docs? Highlight the line.')
                    }
                  >
                    📍 Where is Sarvam AI located? Highlight the line
                  </button>
                  <button
                    onClick={() =>
                      handleSendMessage('Where is the platform architecture overview written?')
                    }
                  >
                    🏛️ Where is platform architecture written?
                  </button>
                  <button
                    onClick={() =>
                      handleSendMessage('How does SSO work between main and Learn?')
                    }
                  >
                    🔐 How does SSO work between main and Learn?
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.messageList}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={
                      msg.sender === 'user' ? styles.userRow : styles.assistantRow
                    }
                  >
                    {msg.sender === 'assistant' && (
                      <span className={styles.senderLabel}>
                        Sarvam · {msg.timestamp || '0:00'}
                      </span>
                    )}
                    <div
                      className={
                        msg.sender === 'user'
                          ? styles.userBubble
                          : styles.assistantBubble
                      }
                    >
                      <div className={styles.bubbleText}>{msg.text}</div>

                      {/* Line location & highlight card */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className={styles.citationsContainer}>
                          {msg.citations.map((c, idx) => (
                            <div key={idx} className={styles.citationCard}>
                              <div className={styles.citationHeader}>
                                <span>📍 {c.filePath}</span>
                                <span className={styles.citationLines}>
                                  Line {c.targetLine || c.startLine}
                                </span>
                              </div>
                              {c.quote && (
                                <p className={styles.citationQuote}>
                                  "{c.quote.slice(0, 110)}..."
                                </p>
                              )}
                              <button
                                className={styles.highlightActionBtn}
                                onClick={() => navigateAndHighlight(c)}
                              >
                                🎯 Go to line & highlight
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className={styles.assistantRow}>
                    <span className={styles.senderLabel}>Sarvam AI is thinking...</span>
                    <div className={styles.assistantBubble}>
                      <div className={styles.typingIndicator}>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Bottom Bar Controls */}
          <div className={styles.bottomBar}>
            <div className={styles.inputRow}>
              <input
                type="text"
                placeholder="Type your question..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
              />
              <button
                className={styles.micBtn}
                onClick={startListening}
                title="Speak question"
              >
                🎤
              </button>
              <button
                className={styles.sendBtn}
                onClick={() => handleSendMessage()}
                disabled={loading || !inputValue.trim()}
              >
                ➔
              </button>
            </div>

            <button
              className={`${styles.callActionBtn} ${inCall ? styles.callEnd : ''}`}
              onClick={toggleCall}
            >
              <span className={styles.callIcon}>{inCall ? '🔴' : '📞'}</span>
              <span>{inCall ? 'End Call' : 'Begin Call'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Collapsed Dock (as shown in Sarvam docs) */}
      {!isOpen && (
        <div className={styles.dockBar}>
          <div
            className={styles.dockLeft}
            onClick={() => setIsOpen(true)}
            role="button"
            tabIndex={0}
          >
            <SarvamLogo size={24} />
            <span className={styles.dockTitle}>Docs Assistant</span>
          </div>

          <button className={styles.dockCallBtn} onClick={toggleCall}>
            <span className={styles.callIcon}>📞</span>
            <span>Begin Call</span>
          </button>

          <button
            className={styles.dockCloseBtn}
            onClick={() => setIsDockVisible(false)}
            title="Hide Assistant"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
