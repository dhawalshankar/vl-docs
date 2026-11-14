import React, {useEffect, useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import styles from './DeveloperDocsSearch.module.css';

function getSnippet(content, terms) {
  const lowerContent = content.toLowerCase();
  const matches = terms
    .map((term) => lowerContent.indexOf(term))
    .filter((position) => position >= 0);
  const start = Math.max(0, (matches.length ? Math.min(...matches) : 0) - 45);
  const snippet = content.slice(start, start + 180);

  return `${start > 0 ? '...' : ''}${snippet}${
    start + snippet.length < content.length ? '...' : ''
  }`;
}

function findResults(documents, query) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return [];
  }

  return documents
    .map((document) => {
      const title = document.title.toLowerCase();
      const content = document.content.toLowerCase();
      const matches = terms.every(
        (term) => title.includes(term) || content.includes(term),
      );

      if (!matches) {
        return null;
      }

      const score = terms.reduce(
        (total, term) => total + (title.includes(term) ? 3 : 1),
        0,
      );

      return {
        ...document,
        score,
        snippet: getSnippet(document.content, terms),
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, 7);
}

export default function DeveloperDocsSearch({baseUrl}) {
  const [documents, setDocuments] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const searchIndexUrl = `${baseUrl.replace(/\/?$/, '/') }developer-search-index.json`;

  useEffect(() => {
    let active = true;

    fetch(searchIndexUrl)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Search index request failed (${response.status}).`);
        }

        const index = await response.json();
        if (!Array.isArray(index.documents)) {
          throw new Error('Search index has an invalid format.');
        }

        return index.documents;
      })
      .then((index) => {
        if (active) {
          setDocuments(index);
        }
      })
      .catch((cause) => {
        if (active) {
          setError(cause.message || 'Search index could not be loaded.');
        }
      });

    return () => {
      active = false;
    };
  }, [searchIndexUrl]);

  const results = useMemo(
    () => findResults(documents ?? [], query),
    [documents, query],
  );
  const hasQuery = query.trim().length > 0;

  return (
    <div className={styles.search} role="search">
      <label className={styles.visuallyHidden} htmlFor="developer-doc-search">
        Search developer docs
      </label>
      <input
        autoComplete="off"
        id="developer-doc-search"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search developer docs"
        type="search"
        value={query}
      />
      {error && (
        <p className={styles.searchError} role="alert">
          {error}
        </p>
      )}
      {!error && documents === null && (
        <span className={styles.searchStatus}>Loading search...</span>
      )}
      {hasQuery && documents !== null && !error && (
        <div className={styles.results} aria-live="polite">
          {results.length === 0 ? (
            <p className={styles.emptyState}>No developer docs matched.</p>
          ) : (
            <ul>
              {results.map((result) => (
                <li key={result.path}>
                  <Link
                    className={styles.result}
                    onClick={() => setQuery('')}
                    to={result.path}
                  >
                    <strong>{result.title}</strong>
                    <span>{result.snippet}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
