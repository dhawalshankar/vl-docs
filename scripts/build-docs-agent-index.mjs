import {readdir, readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';

const docsDirectory = path.resolve('docs');
const outputFile = path.resolve('static/varta-docs-index.json');

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

async function findMarkdownFiles(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findMarkdownFiles(entryPath)));
    } else if (/\.(md|mdx)$/i.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

function cleanMarkdown(text) {
  return text
    .replace(/```[^\r\n]*\r?\n([\s\S]*?)```/g, ' $1 ')
    .replace(/~~~[^\r\n]*\r?\n([\s\S]*?)~~~/g, ' $1 ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, ' $1 ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, ' $1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*_~|>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function processDocument(source, filePath) {
  const frontmatterMatch = source.match(/^---\r?\n([\s\S]*?)\r?\n---\s*/);
  const metadata = frontmatterMatch?.[1] ?? '';
  const titleMatch = metadata.match(/^title:\s*(?:"([^"]+)"|'([^']+)'|(.+))\s*$/m);
  const firstHeading = source.match(/^#\s+(.+)$/m);
  const title =
    titleMatch?.[1] ??
    titleMatch?.[2] ??
    titleMatch?.[3]?.trim() ??
    firstHeading?.[1] ??
    path.basename(filePath, path.extname(filePath));

  const relativeFromDocs = path
    .relative(docsDirectory, filePath)
    .split(path.sep)
    .join('/')
    .replace(/\.(md|mdx)$/i, '')
    .replace(/\/index$/i, '');
  const docPath = `/docs/${relativeFromDocs}`;
  const relativeFilePath = `docs/${path.relative(docsDirectory, filePath).split(path.sep).join('/')}`;

  const allLines = source.split(/\r?\n/);
  
  // Find where frontmatter ends
  let frontmatterEndLine = 0;
  if (source.startsWith('---')) {
    for (let i = 1; i < allLines.length; i++) {
      if (allLines[i].trim() === '---') {
        frontmatterEndLine = i + 1; // 1-based line number
        break;
      }
    }
  }

  const chunks = [];
  let currentHeading = title;
  let currentAnchor = '';
  let chunkLines = [];
  let chunkStartLine = frontmatterEndLine + 1;

  function commitChunk() {
    if (chunkLines.length === 0) return;
    const rawText = chunkLines.map((l) => l.text).join('\n');
    const cleanedText = cleanMarkdown(rawText);
    if (cleanedText.length > 20) {
      const sentences = cleanedText
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 12);

      const firstLineWithText = chunkLines.find((l) => l.text.trim().length > 0);
      const lastLineWithText = [...chunkLines].reverse().find((l) => l.text.trim().length > 0);

      chunks.push({
        id: `${relativeFromDocs}-${chunks.length + 1}`,
        docTitle: title,
        docPath,
        filePath: relativeFilePath,
        heading: currentHeading,
        anchor: currentAnchor ? `#${currentAnchor}` : '',
        startLine: firstLineWithText ? firstLineWithText.lineNum : chunkStartLine,
        endLine: lastLineWithText ? lastLineWithText.lineNum : chunkLines[chunkLines.length - 1].lineNum,
        text: cleanedText,
        sentences: sentences.slice(0, 8),
        lines: chunkLines
          .filter((l) => l.text.trim().length > 0)
          .map((l) => ({
            line: l.lineNum,
            text: l.text.trim(),
          })),
      });
    }
    chunkLines = [];
  }

  for (let i = 0; i < allLines.length; i++) {
    const lineNum = i + 1;
    if (lineNum <= frontmatterEndLine) {
      continue;
    }
    const line = allLines[i];

    // Check for headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      commitChunk();
      const headingText = headingMatch[2].trim();
      currentHeading = headingText;
      currentAnchor = slugify(headingText);
      chunkStartLine = lineNum;
      chunkLines.push({lineNum, text: line});
      continue;
    }

    // Paragraph breaks on blank lines
    if (line.trim() === '') {
      if (chunkLines.length >= 3) {
        commitChunk();
        chunkStartLine = lineNum + 1;
      }
      continue;
    }

    if (chunkLines.length === 0) {
      chunkStartLine = lineNum;
    }
    chunkLines.push({lineNum, text: line});
  }

  commitChunk();

  return {
    docTitle: title,
    docPath,
    filePath: relativeFilePath,
    chunks,
  };
}

async function build() {
  const files = (await findMarkdownFiles(docsDirectory)).sort();
  if (files.length === 0) {
    throw new Error(`No documentation found in ${docsDirectory}`);
  }

  const documents = [];
  const allChunks = [];

  for (const filePath of files) {
    const source = await readFile(filePath, 'utf8');
    const docData = processDocument(source, filePath);
    documents.push({
      docTitle: docData.docTitle,
      docPath: docData.docPath,
      filePath: docData.filePath,
      chunkCount: docData.chunks.length,
    });
    allChunks.push(...docData.chunks);
  }

  const corpus = {
    generatedAt: new Date().toISOString(),
    totalDocs: documents.length,
    totalChunks: allChunks.length,
    documents,
    chunks: allChunks,
  };

  await writeFile(outputFile, JSON.stringify(corpus, null, 2), 'utf8');
  console.log(
    `[Varta Docs Indexer] Indexed ${documents.length} documents into ${allChunks.length} searchable chunks at ${outputFile}`
  );

  // Pre-create all static HTML page directories to avoid Windows concurrent mkdir race condition
  for (const doc of documents) {
    const cleanDir = doc.docPath.replace(/^\//, '');
    await mkdir(path.resolve('build', cleanDir), {recursive: true});
  }
}

build().catch((err) => {
  console.error('[Varta Docs Indexer] Error:', err);
  process.exit(1);
});
