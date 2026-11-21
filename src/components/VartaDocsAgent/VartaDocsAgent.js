import React, {useState, useEffect, useRef} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import SarvamLogo from './SarvamLogo';
import {loadDocsCorpus, askSarvamDocsAgent, searchDocs} from '../../utils/vartaAgentService';
import {speakWithSarvamTTS, stopAudioPlayback} from '../../utils/vartaAudioService';
import styles from './VartaDocsAgent.module.css';

const STORAGE_KEY_SAMVAAD_KEY = 'varta_samvaad_api_key';
const STORAGE_KEY_APP_ID = 'varta_samvaad_app_id';

export default function VartaDocsAgent() {
  const {siteConfig} = useDocusaurusContext();
  const fields = siteConfig.customFields || {};

  const defaultSamvaadKey = fields.samvaadApiKey || '';
  const defaultOrgId = fields.samvaadOrgId || '01a1fcf2-3c88-74a1-a6fd-014e7c891c50';
  const defaultWorkspaceId = fields.samvaadWorkspaceId || '01a1fcf2-3c98-7607-b013-826e800cc576';
  const defaultAppId = fields.samvaadAppId || 'VartaLang-D-b7f3961b-1e59';

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

  // Samvaad credentials
  const [samvaadKey, setSamvaadKey] = useState(defaultSamvaadKey);
  const [appId, setAppId] = useState(defaultAppId);
  const [orgId] = useState(defaultOrgId);
  const [workspaceId] = useState(defaultWorkspaceId);

  // Audio / Speech state
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef(null);
  const callTimerRef = useRef(null);
  const samvaadAgentRef = useRef(null);

  // Load saved credentials from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = window.localStorage.getItem(STORAGE_KEY_SAMVAAD_KEY);
      if (savedKey) setSamvaadKey(savedKey);
      const savedAppId = window.localStorage.getItem(STORAGE_KEY_APP_ID);
      if (savedAppId) setAppId(savedAppId);
    }
  }, []);

  // Preload docs corpus
  useEffect(() => {
    loadDocsCorpus(siteConfig.baseUrl)
      .then((data) => setCorpus(data))
      .catch((err) => console.warn('Could not load docs corpus:', err));
  }, [siteConfig.baseUrl]);

  // Clean up Samvaad agent on unmount
  useEffect(() => {
    return () => {
      if (samvaadAgentRef.current) {
        samvaadAgentRef.current.stop().catch(() => {});
      }
      stopAudioPlayback();
    };
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({behavior: 'smooth'});
    }
  }, [messages, loading, isSpeaking]);

  // Call timer
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

  // Handle location highlight navigation
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

  // Check and extract doc citations from assistant responses
  function extractCitations(text, currentCorpus) {
    if (!currentCorpus) return [];
    const matches = searchDocs(currentCorpus, text, 2);
    return matches.map((m) => ({
      docTitle: m.docTitle,
      heading: m.heading,
      docPath: m.docPath,
      anchor: m.anchor,
      filePath: m.filePath,
      startLine: m.startLine,
      endLine: m.endLine,
      targetLine: m.bestLine?.line || m.startLine,
      quote: m.bestLine?.text || m.sentences?.[0] || m.text.slice(0, 110),
    }));
  }

  // Start real-time Sarvam Voice Agent (Samvaad) call
  async function startSamvaadCall() {
    setIsOpen(true);
    setInCall(true);
    setCallStatusText('Connecting to Sarvam Voice...');

    const activeKey = samvaadKey || fields.samvaadApiKey;

    if (!activeKey || activeKey.trim() === '') {
      // If no Samvaad key is found, prompt user to enter key
      setCallStatusText('Live Call · 0:00');
      const welcome = {
        id: Date.now(),
        sender: 'assistant',
        text: "Namaste! I'm your Varta Docs Voice Assistant. To connect to your live Sarvam Samvaad voice agent, please enter your SAMVAAD_API_KEY in the settings (⚙️) above. You can also type any docs question right now!",
        timestamp: '0:00',
      };
      setMessages((prev) => [...prev, welcome]);
      speakWithSarvamTTS({
        text: welcome.text,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
      return;
    }

    try {
      // Dynamically import sarvam-conv-ai-sdk browser module
      const {ConversationAgent, BrowserAudioInterface, InteractionType} =
        await import('sarvam-conv-ai-sdk/browser');

      const audioInterface = new BrowserAudioInterface(16000, {
        outputLevelCallback: (level) => {
          setAudioLevel(Math.min(100, Math.round(level * 100)));
        },
      });

      const agent = new ConversationAgent({
        apiKey: activeKey.trim(),
        config: {
          org_id: orgId,
          workspace_id: workspaceId,
          app_id: appId,
          user_identifier: `vl-visitor-${Date.now()}`,
          user_identifier_type: 'custom',
          interaction_type: InteractionType.CALL,
          input_sample_rate: 16000,
          output_sample_rate: 16000,
        },
        audioInterface,
        stateCallback: (newState) => {
          if (newState === 'CONNECTED') {
            setCallStatusText(`Live Call · ${formattedCallTime}`);
          }
        },
        transcriptCallback: async (msg) => {
          const role = msg.role === 'user' ? 'user' : 'assistant';
          const content = msg.content || '';
          const activeCorpus = corpus || (await loadDocsCorpus(siteConfig.baseUrl));

          let citations = [];
          if (role === 'assistant') {
            citations = extractCitations(content, activeCorpus);
          }

          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              sender: role,
              text: content,
              citations,
              timestamp: formattedCallTime,
            },
          ]);

          // Auto-highlight if user asked where something is located
          if (
            role === 'assistant' &&
            citations.length > 0 &&
            content.toLowerCase().includes('located')
          ) {
            setTimeout(() => navigateAndHighlight(citations[0]), 800);
          }
        },
        endCallback: async () => {
          samvaadAgentRef.current = null;
          setInCall(false);
          setIsSpeaking(false);
          setCallStatusText(`Call ended · ${formattedCallTime}`);
        },
      });

      samvaadAgentRef.current = agent;
      await agent.start();
      setCallStatusText('Live Call · 0:00');
    } catch (err) {
      console.warn('Samvaad connection error:', err);
      setCallStatusText('Connection failed');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'assistant',
          text: `Could not connect to Sarvam Voice Agents: ${err.message}. Please check your SAMVAAD_API_KEY in settings.`,
          timestamp: '0:00',
        },
      ]);
    }
  }

  // End real-time call
  async function endSamvaadCall() {
    setInCall(false);
    setIsSpeaking(false);
    stopAudioPlayback();
    if (samvaadAgentRef.current) {
      try {
        await samvaadAgentRef.current.stop();
      } catch (e) {}
      samvaadAgentRef.current = null;
    }
    setCallStatusText(`Call ended · ${formattedCallTime}`);
  }

  function toggleCall() {
    if (inCall) {
      endSamvaadCall();
    } else {
      startSamvaadCall();
    }
  }

  // Text chat submission
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
        apiKey: samvaadKey || fields.samvaadApiKey,
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

      // Speak using Sarvam Bulbul TTS
      speakWithSarvamTTS({
        text: result.answer,
        apiKey: samvaadKey || fields.samvaadApiKey,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });

      // Jump & highlight if "where" or "highlight" requested
      const lowerQ = query.toLowerCase();
      if (
        (lowerQ.includes('where') || lowerQ.includes('highlight') || lowerQ.includes('locate')) &&
        result.citations &&
        result.citations.length > 0
      ) {
        setTimeout(() => navigateAndHighlight(result.citations[0]), 900);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: `Error: ${err.message}`,
          timestamp: formattedCallTime,
        },
      ]);
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
      window.localStorage.setItem(STORAGE_KEY_SAMVAAD_KEY, samvaadKey);
      window.localStorage.setItem(STORAGE_KEY_APP_ID, appId);
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
                title="Sarvam Voice Agent Settings"
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
                  if (inCall) endSamvaadCall();
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
              <h4>Sarvam Samvaad Settings</h4>
              <label>SAMVAAD_API_KEY</label>
              <input
                type="password"
                placeholder="Paste your SAMVAAD_API_KEY"
                value={samvaadKey}
                onChange={(e) => setSamvaadKey(e.target.value)}
              />
              <label>Agent ID (app_id)</label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
              />
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
                    inCall || isSpeaking ? styles.waveActive : ''
                  }`}
                  style={{
                    transform: audioLevel > 5 ? `scaleY(${1 + audioLevel / 60})` : 'none',
                  }}
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
                    📍 Where is Sarvam AI located? Highlight the line
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
