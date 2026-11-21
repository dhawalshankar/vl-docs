/**
 * Varta Docs Agent Service
 * Conversational Agent & Retrieval Engine matching Sarvam AI Docs Assistant.
 */

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'could', 'did', 'do', 'does', 'doing', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
  'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if',
  'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my',
  'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
  'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
  'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which',
  'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours'
]);

// Conversational Greeting & Social Patterns
const GREETINGS = [
  'hello', 'hi', 'hey', 'namaste', 'pranam', 'vanakkam', 'good morning',
  'good afternoon', 'good evening', 'hola', 'yo', 'sup'
];

const IDENTITY_QUERIES = [
  'who are you', 'what are you', 'what can you do', 'what is this', 'help',
  'tell me about yourself', 'how do you work'
];

const GRATITUDE_QUERIES = [
  'thank you', 'thanks', 'dhanyawad', 'shukriya', 'great', 'awesome', 'cool',
  'bye', 'goodbye', 'see you'
];

let cachedCorpus = null;

export async function loadDocsCorpus(baseUrl = '/') {
  if (cachedCorpus) {
    return cachedCorpus;
  }

  const cleanBase = baseUrl.replace(/\/?$/, '/');
  const indexUrl = `${cleanBase}varta-docs-index.json`;

  try {
    const response = await fetch(indexUrl);
    if (!response.ok) {
      throw new Error(`Failed to load docs index (${response.status})`);
    }
    const data = await response.json();
    cachedCorpus = data;
    return cachedCorpus;
  } catch (err) {
    console.warn('[VartaDocsAgent] Error loading index:', err);
    throw err;
  }
}

/**
 * Checks for conversational social intents (greetings, identity, etc.)
 */
export function checkConversationalIntent(query) {
  const q = query.toLowerCase().trim().replace(/[^\w\s]/g, '');

  if (GREETINGS.some((g) => q === g || q.startsWith(`${g} `) || q.endsWith(` ${g}`))) {
    return {
      type: 'greeting',
      answer: "Hello! I'm your Varta Docs Assistant, powered by Sarvam AI. You can speak or chat with me to explore the VartaLang documentation, ask questions about the architecture or features, or ask 'where is it located in my docs?' to jump straight to the exact line and highlight it!",
    };
  }

  if (IDENTITY_QUERIES.some((id) => q.includes(id))) {
    return {
      type: 'identity',
      answer: "I am the Varta Docs Assistant, designed to replicate Sarvam AI's interactive voice and documentation agent. I can answer your technical questions, explain the VartaLang ecosystem, and locate and highlight exact lines in your documentation.",
    };
  }

  if (GRATITUDE_QUERIES.some((gr) => q.includes(gr))) {
    return {
      type: 'gratitude',
      answer: "You're very welcome! Let me know if there's anything else in the VartaLang documentation you'd like to look up or explore.",
    };
  }

  return null;
}

export function searchDocs(corpus, query, limit = 5) {
  if (!corpus || !Array.isArray(corpus.chunks)) {
    return [];
  }

  const rawTerms = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const keyTerms = rawTerms.filter((term) => !STOP_WORDS.has(term) && term.length > 1);
  const termsToSearch = keyTerms.length > 0 ? keyTerms : rawTerms;

  if (termsToSearch.length === 0) {
    return [];
  }

  const scoredChunks = [];

  for (const chunk of corpus.chunks) {
    const headingLower = (chunk.heading || '').toLowerCase();
    const titleLower = (chunk.docTitle || '').toLowerCase();
    const textLower = (chunk.text || '').toLowerCase();
    const pathLower = (chunk.filePath || '').toLowerCase();

    let score = 0;
    let matchedKeywords = 0;

    for (const term of termsToSearch) {
      let termMatched = false;
      if (headingLower.includes(term)) {
        score += 8;
        termMatched = true;
      }
      if (titleLower.includes(term)) {
        score += 5;
        termMatched = true;
      }
      if (pathLower.includes(term)) {
        score += 4;
        termMatched = true;
      }
      if (textLower.includes(term)) {
        score += 2;
        termMatched = true;
      }
      if (termMatched) {
        matchedKeywords++;
      }
    }

    const queryClean = query.toLowerCase().trim();
    if (textLower.includes(queryClean)) {
      score += 15;
    }

    if (score > 0) {
      let bestLine = null;
      let bestLineScore = -1;

      if (Array.isArray(chunk.lines)) {
        for (const lineObj of chunk.lines) {
          const lLower = lineObj.text.toLowerCase();
          let lScore = 0;
          for (const term of termsToSearch) {
            if (lLower.includes(term)) lScore++;
          }
          if (lScore > bestLineScore) {
            bestLineScore = lScore;
            bestLine = lineObj;
          }
        }
      }

      scoredChunks.push({
        ...chunk,
        score: score * (matchedKeywords / termsToSearch.length + 0.5),
        bestLine: bestLine || (chunk.lines && chunk.lines[0]) || { line: chunk.startLine, text: chunk.text.slice(0, 100) },
      });
    }
  }

  scoredChunks.sort((a, b) => b.score - a.score);
  return scoredChunks.slice(0, limit);
}

function buildContextString(topChunks) {
  return topChunks
    .map((c, i) => {
      const lineRange = `Lines ${c.startLine}-${c.endLine}`;
      const bestSnippet = c.bestLine ? `\nKey Line (${c.bestLine.line}): "${c.bestLine.text}"` : '';
      return `[DOCUMENT ${i + 1}]
File: ${c.filePath}
URL Path: ${c.docPath}${c.anchor}
Section: ${c.docTitle} > ${c.heading} (${lineRange})
Content: ${c.text}${bestSnippet}`;
    })
    .join('\n\n---\n\n');
}

/**
 * Handles question answering with Sarvam AI and fallback
 */
export async function askSarvamDocsAgent({
  query,
  apiKey,
  model = 'sarvam-105b',
  corpus,
  history = [],
}) {
  // 1. Check conversational social intent first
  const socialResponse = checkConversationalIntent(query);
  if (socialResponse) {
    return {
      answer: socialResponse.answer,
      citations: [],
      isConversational: true,
    };
  }

  // 2. Search docs corpus
  const topChunks = searchDocs(corpus, query, 5);

  if (topChunks.length === 0) {
    return {
      answer: "I couldn't find a direct match in the documentation for that question. You can ask me about our architecture, language exchange features, or API reference, or ask 'Where is ... located?'",
      citations: [],
    };
  }

  const primaryChunk = topChunks[0];
  const defaultCitations = topChunks.map((c) => ({
    docTitle: c.docTitle,
    heading: c.heading,
    docPath: c.docPath,
    anchor: c.anchor,
    filePath: c.filePath,
    startLine: c.startLine,
    endLine: c.endLine,
    targetLine: c.bestLine?.line || c.startLine,
    quote: c.bestLine?.text || c.sentences?.[0] || c.text.slice(0, 120),
  }));

  // 3. If no Sarvam API key is configured, formulate a natural conversational answer
  if (!apiKey || apiKey.trim() === '') {
    const isWhereQuery =
      query.toLowerCase().includes('where') ||
      query.toLowerCase().includes('locate') ||
      query.toLowerCase().includes('highlight');

    let answer = '';
    if (isWhereQuery) {
      answer = `This is located in **${primaryChunk.filePath}** under the *"${primaryChunk.heading}"* section on line ${primaryChunk.bestLine?.line || primaryChunk.startLine}:\n\n> "${primaryChunk.bestLine?.text || primaryChunk.text.slice(0, 160)}"\n\nClick the button below to jump straight to this line and highlight it in your docs!`;
    } else {
      answer = `According to the documentation in **${primaryChunk.filePath}** (*${primaryChunk.heading}*):\n\n${primaryChunk.bestLine?.text || primaryChunk.text.slice(0, 220)}\n\n*(Location: line ${primaryChunk.bestLine?.line || primaryChunk.startLine})*`;
    }

    return {
      answer,
      citations: defaultCitations.slice(0, 2),
      isOffline: true,
    };
  }

  // 4. Full Sarvam AI Chat API invocation
  const contextText = buildContextString(topChunks);

  const systemPrompt = `You are the Docs Assistant on the VartaLang documentation website, an exact counterpart to Sarvam AI's Docs Assistant.
You speak naturally, directly, and helpfully (like on a real-time voice call). Keep responses conversational, concise, and focused on the docs.
When asked where something is located or where something is written, explicitly identify the file path, section, and line number.
Always end with a citation tag:
[[CITATION:{"path":"${primaryChunk.docPath}","anchor":"${primaryChunk.anchor}","file":"${primaryChunk.filePath}","line":${primaryChunk.bestLine?.line || primaryChunk.startLine},"quote":"${(primaryChunk.bestLine?.text || '').replace(/"/g, "'")} "}]]`;

  const messages = [
    {role: 'system', content: systemPrompt},
    ...history.slice(-4),
    {
      role: 'user',
      content: `DOCUMENTATION CONTEXT:
${contextText}

USER QUESTION:
${query}`,
    },
  ];

  const endpoints = [
    'https://api.sarvam.ai/v1/chat/completions',
    'https://api.sarvam.ai/v2/chat/completions',
  ];

  let rawContent = '';
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': apiKey.trim(),
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: model || 'sarvam-105b',
          messages,
          temperature: 0.3,
          max_tokens: 600,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sarvam API ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      rawContent = json.choices?.[0]?.message?.content || '';
      if (rawContent) break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!rawContent) {
    return {
      answer: `Found in **${primaryChunk.filePath}** under *${primaryChunk.heading}* (line ${primaryChunk.bestLine?.line || primaryChunk.startLine}):\n\n> "${primaryChunk.bestLine?.text || primaryChunk.text.slice(0, 160)}"`,
      citations: defaultCitations.slice(0, 2),
      error: lastError?.message,
    };
  }

  const parsedCitations = [...defaultCitations];
  const citationRegex = /\[\[CITATION:(\{.*?\})\]\]/g;
  let match;
  while ((match = citationRegex.exec(rawContent)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      parsedCitations.unshift({
        docTitle: primaryChunk.docTitle,
        heading: primaryChunk.heading,
        docPath: parsed.path || primaryChunk.docPath,
        anchor: parsed.anchor || primaryChunk.anchor,
        filePath: parsed.file || primaryChunk.filePath,
        startLine: parsed.line || primaryChunk.startLine,
        endLine: parsed.line || primaryChunk.endLine,
        targetLine: parsed.line || primaryChunk.bestLine?.line,
        quote: parsed.quote || primaryChunk.bestLine?.text,
      });
    } catch (e) {}
  }

  const cleanAnswer = rawContent.replace(/\[\[CITATION:.*?\]\]/g, '').trim();

  return {
    answer: cleanAnswer,
    citations: parsedCitations.slice(0, 2),
  };
}
