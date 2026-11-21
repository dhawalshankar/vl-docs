/**
 * Varta Docs Agent Service
 * Retrieval engine and Sarvam AI integration for VartaLang documentation.
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

    // Exact phrase match bonus
    const queryClean = query.toLowerCase().trim();
    if (textLower.includes(queryClean)) {
      score += 15;
    }

    if (score > 0) {
      // Find the most relevant sentence or line within the chunk
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

/**
 * Builds the context prompt for Sarvam AI
 */
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
 * Calls Sarvam AI Chat Completion API
 */
export async function askSarvamDocsAgent({
  query,
  apiKey,
  model = 'sarvam-105b',
  corpus,
  history = [],
}) {
  const topChunks = searchDocs(corpus, query, 5);

  if (topChunks.length === 0) {
    return {
      answer: "I couldn't find any relevant sections in the VartaLang documentation for that question. Please try asking with different keywords or check the documentation sidebar.",
      citations: [],
    };
  }

  // Pre-build primary citation from top matching chunk
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

  // If no API key is provided, return rich offline excerpt answer
  if (!apiKey || apiKey.trim() === '') {
    const quote = primaryChunk.bestLine?.text || primaryChunk.text.slice(0, 200);
    const answer = `Based on the documentation in **${primaryChunk.filePath}** under *${primaryChunk.heading}* (lines ${primaryChunk.startLine}–${primaryChunk.endLine}):\n\n> "${quote}"\n\n*(Note: To unlock conversational AI answers powered by Sarvam AI, please enter your Sarvam API Key in the settings icon ⚙️ above).*`;

    return {
      answer,
      citations: defaultCitations.slice(0, 3),
      isOffline: true,
    };
  }

  const contextText = buildContextString(topChunks);

  const systemPrompt = `You are the Varta Docs Agent, an expert AI assistant dedicated to the VartaLang documentation.
Your job is to answer user questions accurately based ONLY on the provided documentation context.
Indian languages (Hindi, Hinglish, Bengali, Tamil, etc.) and English are supported. If the user asks in an Indian language or Hinglish, reply warmly in that language while keeping technical terms intact.

CRITICAL INSTRUCTIONS:
1. Always pinpoint where the answer is written in the documentation.
2. When answering, mention the file name and line numbers (e.g. "Written in \`${primaryChunk.filePath}\` on line ${primaryChunk.bestLine?.line || primaryChunk.startLine} under '${primaryChunk.heading}'").
3. At the end of your response, output a citation tag in this exact format:
[[CITATION:{"path":"${primaryChunk.docPath}","anchor":"${primaryChunk.anchor}","file":"${primaryChunk.filePath}","line":${primaryChunk.bestLine?.line || primaryChunk.startLine},"quote":"${(primaryChunk.bestLine?.text || '').replace(/"/g, "'")} "}]]
4. Keep your answer helpful, concise, and technically precise.`;

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
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sarvam API returned ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      rawContent = json.choices?.[0]?.message?.content || '';
      if (rawContent) {
        break;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (!rawContent) {
    // If API failed (e.g. invalid key or network error), fallback to formatted response with citations
    return {
      answer: `I could not reach Sarvam AI (${lastError?.message || 'Check your API key'}). However, from your docs index:\n\n**${primaryChunk.docTitle} > ${primaryChunk.heading}** (lines ${primaryChunk.startLine}–${primaryChunk.endLine}):\n\n> "${primaryChunk.bestLine?.text || primaryChunk.text.slice(0, 150)}"`,
      citations: defaultCitations.slice(0, 3),
      error: lastError?.message,
    };
  }

  // Extract any [[CITATION:...]] tags
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
    } catch (e) {
      // Ignore JSON parse errors in LLM output
    }
  }

  // Clean citation tags from user-facing answer
  const cleanAnswer = rawContent.replace(/\[\[CITATION:.*?\]\]/g, '').trim();

  return {
    answer: cleanAnswer,
    citations: parsedCitations.slice(0, 3),
  };
}
