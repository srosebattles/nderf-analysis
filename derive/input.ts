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

/** One entry on an NDERF index page. All of it is NDERF's wording, not the experiencer's. */
export interface ScrapedListing {
  /** NDERF's classification on the listing: 'NDE', 'Secondhand NDE', … */
  type_label: string | null;
  /** NDERF's editor tag: usually a country, a language, or a flag such as 'Exceptional Experience'. */
  tag: string | null;
}

export interface ScrapedAccount {
  id: string;
  sha256: string | null;
  parts: ScrapedPart[];
  /** NDERF's classification on the page itself, raw. */
  page_classification?: string | null;
  exceptional?: boolean;
  /** Greyson NDE Scale score; only search-app pages show it. */
  greyson_score?: number | null;
  /** Search-app pages only: Country, Gender, Age, Date Experienced, Date Submitted. */
  quick_facts?: Record<string, string> | null;
  /** ISO dates from the index listings: when NDERF posted the account. */
  posted_dates?: string[];
  fetched_at?: string | null;
  listings?: ScrapedListing[];
  /** Only for accounts added from the search site's listing. */
  search_listing?: { classification?: string[]; experienced?: (string | null)[] } | null;
}
