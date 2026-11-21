/**
 * Documentation index loading and search for Samvaad transcript navigation.
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
