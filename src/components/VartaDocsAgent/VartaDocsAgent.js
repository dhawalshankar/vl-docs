import React, {useEffect, useRef, useState} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useHistory, useLocation} from '@docusaurus/router';
import SarvamLogo from './SarvamLogo';
import {loadDocsCorpus, searchDocs} from '../../utils/vartaAgentService';
import {speakWithSarvamTTS, stopAudioPlayback} from '../../utils/vartaAudioService';
import styles from './VartaDocsAgent.module.css';

const MAX_CALL_DURATION_SECONDS = 120;
const MAX_UNANSWERED_RESPONSES = 5;

export default function VartaDocsAgent() {
  const {siteConfig} = useDocusaurusContext();
  const history = useHistory();
  const location = useLocation();
  const fields = siteConfig.customFields || {};
  const [isOpen, setIsOpen] = useState(false);
  const [isDockVisible, setIsDockVisible] = useState(true);
  const [inCall, setInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatusText, setCallStatusText] = useState('Call ended · 0:00');
  const [messages, setMessages] = useState([]);
  const samvaadKey = fields.samvaadApiKey || '';
  const appId = fields.samvaadAppId || 'VartaLang-D-b7f3961b-1e59';
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [corpus, setCorpus] = useState(null);
  const messagesEndRef = useRef(null);
  const callTimerRef = useRef(null);
  const samvaadAgentRef = useRef(null);
  const unansweredResponsesRef = useRef(0);
  const orgId = fields.samvaadOrgId || '01a1fcf2-3c88-74a1-a6fd-014e7c891c50';
  const workspaceId = fields.samvaadWorkspaceId || '01a1fcf2-3c98-7607-b013-826e800cc576';

  useEffect(() => {
    loadDocsCorpus(siteConfig.baseUrl)
      .then(setCorpus)
      .catch((error) => console.warn('Could not load docs index:', error));
  }, [siteConfig.baseUrl]);

  useEffect(() => () => {
    if (samvaadAgentRef.current) samvaadAgentRef.current.stop().catch(() => {});
    stopAudioPlayback();
    if (callTimerRef.current) clearInterval(callTimerRef.current);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages]);

  useEffect(() => {
    if (inCall) {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => setCallDuration((value) => {
        if (value + 1 >= MAX_CALL_DURATION_SECONDS) {
          if (samvaadAgentRef.current) samvaadAgentRef.current.stop().catch(() => {});
          samvaadAgentRef.current = null;
          setInCall(false);
          setIsSpeaking(false);
          stopAudioPlayback();
          setCallStatusText('Call ended · 2:00 (maximum duration)');
          return MAX_CALL_DURATION_SECONDS;
        }
        return value + 1;
      }), 1000);
    } else if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    return () => clearInterval(callTimerRef.current);
  }, [inCall]);

  const formattedCallTime = `${Math.floor(callDuration / 60)}:${String(callDuration % 60).padStart(2, '0')}`;

  function autonomouslyBrowseTo(citation) {
    if (!citation) return;
    const targetUrl = `${citation.docPath}?highlight=${encodeURIComponent(citation.quote || '')}&line=${citation.targetLine || citation.startLine}${citation.anchor || ''}`;
    if (location.pathname !== citation.docPath) history.push(targetUrl);
    else window.history.pushState(null, '', targetUrl);
    window.dispatchEvent(new CustomEvent('varta:highlight', {
      detail: {
        text: citation.quote,
        line: citation.targetLine || citation.startLine,
        filePath: citation.filePath,
      },
    }));
  }

  async function browseFromTranscript(text) {
    try {
      const activeCorpus = corpus || await loadDocsCorpus(siteConfig.baseUrl);
      if (!corpus) setCorpus(activeCorpus);
      const match = searchDocs(activeCorpus, text, 1)[0];
      if (!match) return;
      setTimeout(() => autonomouslyBrowseTo({
        docPath: match.docPath,
        anchor: match.anchor,
        filePath: match.filePath,
        startLine: match.startLine,
        targetLine: match.bestLine?.line || match.startLine,
        quote: match.bestLine?.text || match.sentences?.[0] || match.text.slice(0, 110),
      }), 500);
    } catch (error) {
      console.warn('Could not find a matching docs passage:', error);
    }
  }

  async function startSamvaadCall() {
    setIsOpen(true);
    setInCall(true);
    unansweredResponsesRef.current = 0;
    setCallStatusText('Connecting to Sarvam Samvaad...');
    const activeKey = samvaadKey || fields.samvaadApiKey;

    if (!activeKey?.trim()) {
      setInCall(false);
      setCallStatusText('API key required');
      const text = 'Samvaad voice calling is not configured yet.';
      setMessages((previous) => [...previous, {id: Date.now(), sender: 'assistant', text, timestamp: '0:00'}]);
      speakWithSarvamTTS({text, onStart: () => setIsSpeaking(true), onEnd: () => setIsSpeaking(false)});
      return;
    }

    try {
      const {ConversationAgent, BrowserAudioInterface, InteractionType} =
        await import('sarvam-conv-ai-sdk/browser');
      const audioInterface = new BrowserAudioInterface(16000, {
        outputLevelCallback: (level) => setAudioLevel(Math.min(100, Math.round(level * 100))),
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
        stateCallback: (state) => {
          if (state === 'CONNECTED') setCallStatusText(`Live Call · ${formattedCallTime}`);
        },
        transcriptCallback: (message) => {
          const role = message.role === 'user' ? 'user' : 'assistant';
          const transcriptText = message.content || '';
          if (role === 'user' && transcriptText.trim()) {
            unansweredResponsesRef.current = 0;
          } else if (role === 'assistant' && transcriptText.trim()) {
            unansweredResponsesRef.current += 1;
            if (unansweredResponsesRef.current >= MAX_UNANSWERED_RESPONSES) {
              setMessages((previous) => [...previous, {
                id: Date.now() + Math.random(),
                sender: 'assistant',
                text: 'Ending the call because there has been no response for several turns.',
                timestamp: formattedCallTime,
              }]);
              endSamvaadCall();
            }
          }
          setMessages((previous) => [...previous, {
            id: Date.now() + Math.random(),
            sender: role,
            text: transcriptText,
            timestamp: formattedCallTime,
          }]);
          if (role === 'assistant' && transcriptText.trim()) browseFromTranscript(transcriptText);
        },
        endCallback: () => {
          samvaadAgentRef.current = null;
          setInCall(false);
          setIsSpeaking(false);
          setCallStatusText(`Call ended · ${formattedCallTime}`);
        },
      });
      samvaadAgentRef.current = agent;
      await agent.start();
      setCallStatusText(`Live Call · ${formattedCallTime}`);
    } catch (error) {
      console.warn('Samvaad connection error:', error);
      const errorDetails = [error?.message, error?.cause?.message, error?.code, error?.type]
        .filter(Boolean)
        .join(' ');
      const isInsufficientCredits = /\b402\b|insufficient[_ ]balance|insufficient credits/i.test(errorDetails);
      const userMessage = isInsufficientCredits
        ? 'The agent is temporarily unavailable. Please try again later or contact the internal team.'
        : `Could not connect to Sarvam Samvaad: ${error.message}.`;
      setInCall(false);
      setCallStatusText(isInsufficientCredits ? 'Agent temporarily unavailable' : 'Connection failed');
      setMessages((previous) => [...previous, {
        id: Date.now(), sender: 'assistant',
        text: userMessage,
        timestamp: '0:00',
      }]);
    }
  }

  async function endSamvaadCall() {
    setInCall(false);
    setIsSpeaking(false);
    stopAudioPlayback();
    if (samvaadAgentRef.current) {
      const agent = samvaadAgentRef.current;
      samvaadAgentRef.current = null;
      try {
        await agent.stop();
      } catch (error) {
        console.warn('Could not stop Samvaad call:', error);
      }
    }
    setCallStatusText(`Call ended · ${formattedCallTime}`);
  }

  function toggleCall() {
    if (inCall) endSamvaadCall();
    else startSamvaadCall();
  }

  function copyTranscript() {
    const transcript = messages
      .map((message) => `${message.sender === 'user' ? 'User' : 'Samvaad'} (${message.timestamp}): ${message.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(transcript);
  }

  if (!isDockVisible) {
    return <button className={styles.reopenButton} onClick={() => setIsDockVisible(true)} title="Open Samvaad assistant">
      <SarvamLogo size={22} /><span>Samvaad</span>
    </button>;
  }

  return <div className={styles.container}>
    {isOpen && <div className={styles.modalWindow} role="dialog" aria-label="Samvaad voice assistant">
      <div className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <div className={styles.logoWrapper}><SarvamLogo size={26} /></div>
          <div><h3 className={styles.title}>Samvaad</h3>
            <p className={styles.subtitle}>{inCall ? `Live Call · ${formattedCallTime}` : callStatusText}</p></div>
        </div>
        <div className={styles.headerActions}>
          {messages.length > 0 && <button className={styles.iconBtn} onClick={copyTranscript} title="Copy transcript">📋</button>}
          <button className={styles.iconBtn} onClick={() => setIsOpen(false)} title="Minimize">—</button>
          <button className={styles.iconBtn} onClick={() => { setIsOpen(false); if (inCall) endSamvaadCall(); }} title="Close">✕</button>
        </div>
      </div>
      <div className={styles.contentArea}>
        {messages.length === 0 ? <div className={styles.emptyState}>
          <div className={`${styles.waveIcon} ${inCall || isSpeaking ? styles.waveActive : ''}`} style={{transform: audioLevel > 5 ? `scaleY(${1 + audioLevel / 60})` : 'none'}}>
            <span></span><span></span><span></span><span></span><span></span>
          </div>
          <h3>Samvaad voice assistant</h3>
          <p>Start a voice call to talk with the autonomous agent.</p>
        </div> : <div className={styles.messageList}>
          {messages.map((message) => <div key={message.id} className={message.sender === 'user' ? styles.userRow : styles.assistantRow}>
            {message.sender === 'assistant' && <span className={styles.senderLabel}>Samvaad · {message.timestamp}</span>}
            <div className={message.sender === 'user' ? styles.userBubble : styles.assistantBubble}>
              <div className={styles.bubbleText}>{message.text}</div>
            </div>
          </div>)}
          <div ref={messagesEndRef} />
        </div>}
      </div>
      <div className={styles.bottomBar}>
        <button className={`${styles.callActionBtn} ${inCall ? styles.callEnd : ''}`} onClick={toggleCall}>
          <span className={styles.callIcon}>{inCall ? '🔴' : '📞'}</span><span>{inCall ? 'End Call' : 'Begin Call'}</span>
        </button>
      </div>
    </div>}
    {!isOpen && <div className={styles.dockBar}>
      <div className={styles.dockLeft} onClick={() => setIsOpen(true)} role="button" tabIndex={0}>
        <SarvamLogo size={24} /><span className={styles.dockTitle}>Samvaad</span>
      </div>
      <button className={styles.dockCallBtn} onClick={toggleCall}><span className={styles.callIcon}>📞</span><span>Begin Call</span></button>
      <button className={styles.dockCloseBtn} onClick={() => setIsDockVisible(false)} title="Hide assistant">✕</button>
    </div>}
  </div>;
}
