// The shape of one parsed account as nderf-scraped writes it (accounts/*.jsonl in the private
// data repository). Only the fields the derived file reads; the field reference is SCHEMA.md in
// nderf-scraped.

export interface ScrapedQA {
  section: string | null;
  /** NDERF's question wording, exactly as on the page. Form text, not account text. */
  question: string;
  /** Everything after the question: the menu answer (if any) and the person's comment. */
  response: string;
  /** The scraper's heuristic split of `response`. */
  answer: string | null;
  comment: string | null;
}

export interface ScrapedPart {
  heading: string | null;
  narrative: string;
  background: Record<string, string>;
  qa: ScrapedQA[];
}

export interface ScrapedAccount {
  id: string;
  sha256: string | null;
  parts: ScrapedPart[];
}
