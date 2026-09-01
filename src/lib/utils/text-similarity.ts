/**
 * TF-IDF + Cosine Similarity engine for Korean text duplicate detection.
 * Uses whitespace tokenization + Korean bigram for better matching.
 */

function tokenize(text: string): string[] {
  const normalized = text.toLowerCase().trim();
  // Split by whitespace
  const words = normalized.split(/\s+/).filter(Boolean);
  // Generate Korean bigrams for each word
  const bigrams: string[] = [];
  for (const word of words) {
    bigrams.push(word);
    if (word.length >= 2) {
      for (let i = 0; i < word.length - 1; i++) {
        bigrams.push(word.slice(i, i + 2));
      }
    }
  }
  return bigrams;
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  // Normalize by total count
  const total = tokens.length;
  if (total > 0) {
    for (const [key, val] of tf) {
      tf.set(key, val / total);
    }
  }
  return tf;
}

function computeIdf(documents: string[][]): Map<string, number> {
  const idf = new Map<string, number>();
  const n = documents.length;
  for (const doc of documents) {
    const unique = new Set(doc);
    for (const term of unique) {
      idf.set(term, (idf.get(term) ?? 0) + 1);
    }
  }
  for (const [term, df] of idf) {
    idf.set(term, Math.log((n + 1) / (df + 1)) + 1);
  }
  return idf;
}

function tfidfVector(tf: Map<string, number>, idf: Map<string, number>): Map<string, number> {
  const vec = new Map<string, number>();
  for (const [term, freq] of tf) {
    vec.set(term, freq * (idf.get(term) ?? 1));
  }
  return vec;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const [term, valA] of a) {
    magA += valA * valA;
    const valB = b.get(term);
    if (valB !== undefined) {
      dot += valA * valB;
    }
  }
  for (const [, valB] of b) {
    magB += valB * valB;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export interface SimilarResult<T> {
  item: T;
  score: number;
}

export function findSimilarTexts<T>(
  query: string,
  items: T[],
  getText: (item: T) => string,
  threshold = 0.25,
  maxResults = 5,
): SimilarResult<T>[] {
  if (!query.trim() || items.length === 0) return [];

  const queryTokens = tokenize(query);
  const itemTokensList = items.map((item) => tokenize(getText(item)));
  const allDocs = [queryTokens, ...itemTokensList];
  const idf = computeIdf(allDocs);

  const queryTf = termFrequency(queryTokens);
  const queryVec = tfidfVector(queryTf, idf);

  const results: SimilarResult<T>[] = [];

  for (let i = 0; i < items.length; i++) {
    const itemTf = termFrequency(itemTokensList[i]);
    const itemVec = tfidfVector(itemTf, idf);
    const score = cosineSimilarity(queryVec, itemVec);
    if (score >= threshold) {
      results.push({ item: items[i], score });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
