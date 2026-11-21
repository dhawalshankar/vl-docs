import React, {useState, useEffect, useRef} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import SarvamLogo from './SarvamLogo';
import {loadDocsCorpus, askSarvamDocsAgent} from '../../utils/vartaAgentService';
import {
  speakWithSarvamTTS,
  stopAudioPlayback,
} from '../../utils/vartaAudioService';
import styles from './VartaDocsAgent.module.css';

const STORAGE_KEY_API_KEY = 'varta_sarvam_api_key';
const STORAGE_KEY_MODEL = 'varta_sarvam_model';
const STORAGE_KEY_SPEAKER = 'varta_sarvam_speaker';

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
  const [speaker, setSpeaker] = useState('meera');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef(null);
  const callTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const inCallRef = useRef(inCall);

  useEffect(() => {
    inCallRef.current = inCall;
  }, [inCall]);

  // Load saved preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = window.localStorage.getItem(STORAGE_KEY_API_KEY);
      if (savedKey) setApiKey(savedKey);
      const savedModel = window.localStorage.getItem(STORAGE_KEY_MODEL);
      if (savedModel) setModel(savedModel);
      const savedSpeaker = window.localStorage.getItem(STORAGE_KEY_SPEAKER);
      if (savedSpeaker) setSpeaker(savedSpeaker);
    }
  }, []);

  // Preload docs corpus
  useEffect(() => {
    loadDocsCorpus(siteConfig.baseUrl)
      .then((data) => setCorpus(data))
      .catch((err) => console.warn('Could not load docs corpus:', err));
  }, [siteConfig.baseUrl]);

  // Scroll messages to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({behavior: 'smooth'});
    }
  }, [messages, loading, isSpeaking]);

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

  // Speech Recognition for real-time Voice Call
  function startListening() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        if (inCallRef.current) {
          setCallStatusText(`Listening... · ${formattedCallTime}`);
        }
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript && transcript.trim()) {
          setIsListening(false);
          handleSendMessage(transcript.trim());
        }
      };

      recognition.onerror = (e) => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech Recognition error:', e);
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  }

  // Voice Call Toggle
  function toggleCall() {
    if (inCall) {
      setInCall(false);
      stopListening();
      stopAudioPlayback();
      setIsSpeaking(false);
      setCallStatusText(`Call ended · ${formattedCallTime}`);
    } else {
      setIsOpen(true);
      setInCall(true);
      setCallStatusText('Connecting to Sarvam...');
      setTimeout(() => {
        setCallStatusText('Live Call · 0:00');
        startListening();
      }, 500);
    }
  }

  // Natural audio speech handler
  function playAgentResponseVoice(text) {
    if (!voiceEnabled) return;

    speakWithSarvamTTS({
      text,
      apiKey,
      speaker: speaker || 'meera',
      model: 'bulbul:v3',
      onStart: () => {
        setIsSpeaking(true);
        if (inCallRef.current) {
          setCallStatusText(`Sarvam speaking... · ${formattedCallTime}`);
        }
      },
      onEnd: () => {
        setIsSpeaking(false);
        if (inCallRef.current) {
          setCallStatusText(`Live Call · ${formattedCallTime}`);
          // Resume microphone listening for full duplex conversation
          setTimeout(() => {
            if (inCallRef.current) startListening();
          }, 400);
        }
      },
      onError: () => {
        setIsSpeaking(false);
      },
    });
  }

  // Handle line location navigation & highlight
  function navigateAndHighlight(citation) {
    if (!citation) return;
    const targetUrl = `${citation.docPath}?highlight=${encodeURIComponent(
      citation.quote || ''
    )}&line=${citation.targetLine || citation.startLine}${citation.anchor || ''}`;

    window.dispatchEvent(
      new CustomEvent('varta:highlight', {
        detail: {
          text: citation.quote,
          line: citation.targetLine || citation.startLine,
        },
      })
    );

    if (window.location.pathname !== citation.docPath) {
      window.location.href = targetUrl;
    } else {
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
      playAgentResponseVoice(result.answer);

      // Automatic jump & highlight when user asks "where" or "highlight"
      const lowerQ = query.toLowerCase();
      if (
        (lowerQ.includes('where') || lowerQ.includes('highlight') || lowerQ.includes('locate')) &&
        result.citations &&
        result.citations.length > 0
      ) {
        setTimeout(() => {
          navigateAndHighlight(result.citations[0]);
        }, 1000);
      }
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: `Error connecting to Sarvam Docs Assistant: ${err.message}.`,
        timestamp: formattedCallTime,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
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
      window.localStorage.setItem(STORAGE_KEY_SPEAKER, speaker);
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
          {/* Header (Exact Sarvam Layout) */}
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
                title="Sarvam AI & Voice Settings"
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
              <h4>Sarvam Voice & Model Settings</h4>
              <label>Sarvam Subscription Key</label>
              <input
                type="password"
                placeholder="Enter Sarvam API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <label>Voice Persona (Bulbul TTS)</label>
              <select value={speaker} onChange={(e) => setSpeaker(e.target.value)}>
                <option value="meera">Meera (Natural Indian Female Voice)</option>
                <option value="ishita_enhi_companion">Ishita (Conversational)</option>
                <option value="shubh">Shubh (Natural Indian Male Voice)</option>
                <option value="aditya">Aditya (Male Voice)</option>
              </select>
              <label>Chat Model</label>
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
                  Enable Natural Voice Output
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

          {/* Content Area */}
          <div className={styles.contentArea}>
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
                <div
                  className={`${styles.waveIcon} ${
                    isSpeaking || isListening ? styles.waveActive : ''
                  }`}
                >
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <h3>Say hello</h3>
                <p>Your conversation will appear here as you talk.</p>

                <div className={styles.promptSuggestions}>
                  <p className={styles.suggestTitle}>Suggested questions:</p>
                  <button
                    onClick={() =>
                      handleSendMessage('Where is Sarvam AI located in my docs? Highlight the line.')
                    }
                  >
                    📍 Where is Sarvam AI located in docs? Highlight line
                  </button>
                  <button
                    onClick={() =>
                      handleSendMessage('How does SSO work between main and Learn?')
                    }
                  >
                    🔐 How does SSO work between main and Learn?
                  </button>
                  <button
                    onClick={() =>
                      handleSendMessage('What is the architecture overview of VartaLang?')
                    }
                  >
                    🏛️ What is the architecture overview?
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
                      <div className={styles.senderHeader}>
                        <span className={styles.senderLabel}>
                          Sarvam · {msg.timestamp || '0:00'}
                        </span>
                        <button
                          className={styles.replayVoiceBtn}
                          onClick={() => playAgentResponseVoice(msg.text)}
                          title="Play Sarvam Voice"
                        >
                          🔊
                        </button>
                      </div>
                    )}
                    <div
                      className={
                        msg.sender === 'user'
                          ? styles.userBubble
                          : styles.assistantBubble
                      }
                    >
                      <div className={styles.bubbleText}>{msg.text}</div>

                      {/* Highlight & Location card */}
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
                    <span className={styles.senderLabel}>Sarvam is thinking...</span>
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

          {/* Bottom Controls */}
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
                className={`${styles.micBtn} ${isListening ? styles.micActive : ''}`}
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

      {/* Collapsed Dock (Exact Sarvam Layout) */}
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
