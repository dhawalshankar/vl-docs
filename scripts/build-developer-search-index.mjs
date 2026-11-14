import {readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

const docsDirectory = path.resolve('docs/development');
const outputFile = path.resolve('static/developer-search-index.json');

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

function extractDocument(source, filePath) {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\s*/);
  const metadata = frontmatter?.[1] ?? '';
  const titleMatch = metadata.match(/^title:\s*(?:"([^"]+)"|'([^']+)'|(.+))\s*$/m);
  const firstHeading = source.match(/^#\s+(.+)$/m);
  const title =
    titleMatch?.[1] ??
    titleMatch?.[2] ??
    titleMatch?.[3]?.trim() ??
    firstHeading?.[1] ??
    path.basename(filePath, path.extname(filePath));
  const markdown = source.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/, '');
  const content = markdown
    .replace(/```[^\r\n]*\r?\n([\s\S]*?)```/g, ' $1 ')
    .replace(/~~~[^\r\n]*\r?\n([\s\S]*?)~~~/g, ' $1 ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, ' $1 ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, ' $1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, ' ')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, ' ')
    .replace(/[`*_~|>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const relativePath = path
    .relative(docsDirectory, filePath)
    .split(path.sep)
    .join('/')
    .replace(/\.(md|mdx)$/i, '')
    .replace(/\/index$/i, '');

  return {
    title,
    path: `/docs/development${relativePath ? `/${relativePath}` : ''}`,
    content,
  };
}

const files = (await findMarkdownFiles(docsDirectory)).sort();
if (files.length === 0) {
  throw new Error(`No developer documentation found in ${docsDirectory}`);
}

const documents = await Promise.all(
  files.map(async (filePath) =>
    extractDocument(await readFile(filePath, 'utf8'), filePath),
  ),
);
await writeFile(outputFile, JSON.stringify({documents}), 'utf8');
console.log(`Generated developer search index for ${documents.length} documents.`);
