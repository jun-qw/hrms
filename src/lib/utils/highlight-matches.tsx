import type { FuseResultMatch } from 'fuse.js';

interface HighlightMatchesProps {
  text: string;
  matches?: readonly FuseResultMatch[];
  fieldKey: string;
}

/**
 * Renders text with <mark> highlights based on fuse.js match indices.
 * Merges overlapping ranges before rendering.
 */
export function HighlightMatches({ text, matches, fieldKey }: HighlightMatchesProps) {
  if (!matches || matches.length === 0) {
    return <>{text}</>;
  }

  // Collect all indices for the matching field
  const allIndices: [number, number][] = [];
  for (const match of matches) {
    if (match.key === fieldKey && match.indices) {
      for (const [start, end] of match.indices) {
        allIndices.push([start, end]);
      }
    }
  }

  if (allIndices.length === 0) {
    return <>{text}</>;
  }

  // Sort by start index
  allIndices.sort((a, b) => a[0] - b[0]);

  // Merge overlapping ranges
  const merged: [number, number][] = [allIndices[0]];
  for (let i = 1; i < allIndices.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = allIndices[i];
    if (curr[0] <= prev[1] + 1) {
      prev[1] = Math.max(prev[1], curr[1]);
    } else {
      merged.push(curr);
    }
  }

  // Build JSX fragments
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const [start, end] of merged) {
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }
    parts.push(
      <mark key={start} className="bg-primary/20 rounded-sm px-0.5">
        {text.slice(start, end + 1)}
      </mark>
    );
    lastIndex = end + 1;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
