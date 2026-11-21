#!/usr/bin/env node

/**
 * Varta Docs Agent CLI
 * Ask questions about VartaLang docs from the terminal using Sarvam AI.
 */

import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const indexPath = path.resolve('static/varta-docs-index.json');
const apiKey = process.env.SARVAM_API_KEY || '';
const model = process.env.SARVAM_MODEL || 'sarvam-105b';

async function getCorpus() {
  if (!existsSync(indexPath)) {
    console.log('[CLI] Generating docs index first...');
    const {execSync} = await import('node:child_process');
    execSync('node scripts/build-docs-agent-index.mjs', {stdio: 'inherit'});
  }
  const raw = await readFile(indexPath, 'utf8');
  return JSON.parse(raw);
}

function searchDocs(corpus, query, limit = 4) {
  const terms = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (terms.length === 0) return [];

  const scored = [];
  for (const chunk of corpus.chunks) {
    const heading = (chunk.heading || '').toLowerCase();
    const title = (chunk.docTitle || '').toLowerCase();
    const text = (chunk.text || '').toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (heading.includes(term)) score += 8;
      if (title.includes(term)) score += 4;
      if (text.includes(term)) score += 2;
    }
    if (text.includes(query.toLowerCase().trim())) {
      score += 15;
    }

    if (score > 0) {
      // Find best line
      let bestLine = null;
      let maxL = -1;
      if (chunk.lines) {
        for (const l of chunk.lines) {
          const lLower = l.text.toLowerCase();
          let count = 0;
          for (const t of terms) if (lLower.includes(t)) count++;
          if (count > maxL) {
            maxL = count;
            bestLine = l;
          }
        }
      }
      scored.push({
        ...chunk,
        score,
        bestLine: bestLine || (chunk.lines && chunk.lines[0]) || {line: chunk.startLine, text: chunk.text.slice(0, 100)},
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

async function askSarvam(query, topChunks) {
  const primary = topChunks[0];
  const context = topChunks
    .map(
      (c, i) =>
        `[DOC ${i + 1}] File: ${c.filePath} | Section: ${c.docTitle} > ${c.heading} (Lines ${c.startLine}-${c.endLine})\nLine ${c.bestLine.line}: "${c.bestLine.text}"\nContent: ${c.text}`
    )
    .join('\n\n---\n\n');

  if (!apiKey) {
    return {
      answer: `Found in ${primary.filePath} under '${primary.heading}' (Lines ${primary.startLine}–${primary.endLine}):\n"${primary.bestLine.text}"\n\n(Tip: Set SARVAM_API_KEY environment variable to enable full Sarvam AI generation)`,
      primary,
    };
  }

  const systemPrompt = `You are the Varta Docs Agent. Answer the user question accurately using the documentation context provided.
Always mention the exact document path, heading, and line numbers where the answer is found.`;

  const messages = [
    {role: 'system', content: systemPrompt},
    {role: 'user', content: `DOCUMENTATION CONTEXT:\n${context}\n\nQUESTION: ${query}`},
  ];

  try {
    const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      throw new Error(`Sarvam API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      answer: data.choices[0].message.content,
      primary,
    };
  } catch (err) {
    return {
      answer: `[API Error: ${err.message}] Fallback from docs:\nFound in ${primary.filePath} (Line ${primary.bestLine.line}): "${primary.bestLine.text}"`,
      primary,
    };
  }
}

async function handleQuery(query, corpus) {
  console.log(`\n🔍 Searching documentation for: "${query}"...\n`);
  const matches = searchDocs(corpus, query, 3);
  if (matches.length === 0) {
    console.log('❌ No matching documentation sections found.');
    return;
  }

  const {answer, primary} = await askSarvam(query, matches);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('💬 Varta Docs Assistant (Powered by Sarvam AI)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(answer);
  console.log('\n📍 LOCATION IN DOCS:');
  console.log(`   File:    ${primary.filePath}`);
  console.log(`   Section: ${primary.docTitle} > ${primary.heading}`);
  console.log(`   Line:    Line ${primary.bestLine.line} (Range ${primary.startLine}–${primary.endLine})`);
  console.log(`   Quote:   "${primary.bestLine.text}"`);
  console.log('\n🔗 VIEW & HIGHLIGHT IN BROWSER:');
  const highlightParam = encodeURIComponent(primary.bestLine.text);
  console.log(`   http://localhost:3000${primary.docPath}?highlight=${highlightParam}&line=${primary.bestLine.line}${primary.anchor}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

async function main() {
  const corpus = await getCorpus();
  const queryArg = process.argv.slice(2).join(' ').trim();

  if (queryArg) {
    await handleQuery(queryArg, corpus);
  } else {
    console.log('🌟 Varta Docs Assistant CLI');
    console.log('Type your question or "exit" to quit:\n');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.prompt();
    rl.on('line', async (line) => {
      const q = line.trim();
      if (q === 'exit' || q === 'quit') {
        rl.close();
        return;
      }
      if (q) {
        await handleQuery(q, corpus);
      }
      rl.prompt();
    });
  }
}

main().catch(console.error);
