// Tells NDERF's form text apart from account text, for the overlap check. Question wording and
// menu labels are NDERF's, not an experiencer's, and may be quoted (DECISIONS.md, Conventions).
// They still turn up in what the check treats as an account's free text, because the scraper
// can't always split a menu label from the comment that follows it. A word sequence counts as
// form text when it lies
//
// - inside one question as NDERF words it, or inside one menu label; or
// - across menu labels printed one after another, as a response prints the boxes a person
//   ticked: the end of one label, then whole labels, then the start of another.
//
// Anything else is listed by the check as before.

/** The check's own word rule, so sequences compare exactly. */
export const words = (s: string): string[] =>
  s.toLowerCase().normalize('NFKC').replace(/[’‘]/g, "'").match(/[\p{L}\p{N}']+/gu) ?? [];

export function formTextMatcher(questions: Iterable<string>, labels: Iterable<string>): (sequence: string) => boolean {
  const inside = new Set<string>(); // every run of words inside one question or one label
  const whole = new Set<string>(); // a whole label
  const starts = new Set<string>(); // the opening words of a label
  const ends = new Set<string>(); // the closing words of a label
  const addRuns = (ws: string[]) => {
    for (let i = 0; i < ws.length; i++) for (let j = i + 1; j <= ws.length; j++) inside.add(ws.slice(i, j).join(' '));
  };
  for (const q of questions) addRuns(words(q));
  for (const label of labels) {
    // A label is sometimes printed in quotation marks, which the word rule keeps on the first
    // and last words.
    for (const form of [label, `'${label}'`]) {
      const ws = words(form);
      if (ws.length === 0) continue;
      addRuns(ws);
      whole.add(ws.join(' '));
      for (let k = 1; k <= ws.length; k++) {
        starts.add(ws.slice(0, k).join(' '));
        ends.add(ws.slice(ws.length - k).join(' '));
      }
    }
  }

  return (sequence: string): boolean => {
    if (inside.has(sequence)) return true;
    const ws = sequence.split(' ');
    const n = ws.length;
    const run = (i: number, j: number) => ws.slice(i, j).join(' ');
    // reach[i]: the first i words are the end of a label followed by whole labels.
    const reach = new Array<boolean>(n + 1).fill(false);
    for (let k = 1; k < n; k++) if (ends.has(run(0, k))) reach[k] = true;
    for (let i = 1; i < n; i++) {
      if (!reach[i]) continue;
      if (starts.has(run(i, n))) return true;
      for (let j = i + 1; j < n; j++) if (whole.has(run(i, j))) reach[j] = true;
    }
    return false;
  };
}
