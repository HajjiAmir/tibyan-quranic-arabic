import { useEffect, useState } from 'react';

// The grammar glossary (brief 17): one plain-English explanation per grammatical
// term the app shows, used everywhere a term appears (grammar panel, learning
// cards, tests). Written in scripts/glossary-text.mjs from the cited sources;
// each entry's example is a real occurrence picked from the data by
// scripts/build-glossary.mjs. The QAC labels and the data are unchanged: this
// only explains them.

export interface GlossaryExample {
  ref: string;
  arabic: string;
  gloss: string | null;
}

export interface GlossaryTerm {
  id: string;
  /** The term as the app shows it. */
  label: string;
  /** Its Arabic grammatical name (QAC tagset where it has one). */
  arabic?: string;
  /** Plain explanation for someone who has never studied grammar. */
  plain: string;
  /** One short line on what it does, used beside test options. */
  short: string;
  example?: GlossaryExample;
  sources: { title: string; url: string }[];
}

export interface Glossary {
  terms: Record<string, GlossaryTerm>;
  /** Every label as shown in the app (lower-cased) -> term id. */
  aliases: Record<string, string>;
}

const BASE = import.meta.env.BASE_URL;
let promise: Promise<Glossary> | null = null;
let loaded: Glossary | null = null;

export function loadGlossary(): Promise<Glossary> {
  if (!promise) {
    promise = fetch(`${BASE}data/glossary.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`glossary ${r.status}`);
        return r.json();
      })
      .then((g: Glossary) => (loaded = g));
    promise.catch(() => (promise = null));
  }
  return promise;
}

export function useGlossary(): Glossary | null {
  const [g, setG] = useState<Glossary | null>(loaded);
  useEffect(() => {
    if (g) return;
    let live = true;
    loadGlossary()
      .then((x) => live && setG(x))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [g]);
  return g;
}

export const termKey = (label: string) => label.trim().toLowerCase();

/** The term a label refers to, if the glossary explains it. */
export function findTerm(g: Glossary | null, label: string): GlossaryTerm | null {
  if (!g) return null;
  const id = g.aliases[termKey(label)];
  return id ? (g.terms[id] ?? null) : null;
}

/**
 * A QAC description ("Noun — genitive, masculine, indefinite") split into its
 * terms, in order: the part of speech, then each feature.
 */
export function descriptionTerms(description: string): string[] {
  const [pos, rest] = description.split(' — ');
  return [pos, ...(rest ? rest.split(', ') : [])].filter(Boolean);
}

/* ------------------------- plain readings for options ------------------------- */

const TENSE_PLAIN: Record<string, string> = { perfect: 'past', imperfect: 'present or future', imperative: 'a command' };

/**
 * Who a verb form is about, from its person, gender and number: the standard
 * English pronoun for that combination ("3rd person, masculine, singular" -> "he").
 */
function whoOf(bits: Set<string>): string | null {
  const p = bits.has('1st person') ? 1 : bits.has('2nd person') ? 2 : bits.has('3rd person') ? 3 : 0;
  const f = bits.has('feminine');
  const m = bits.has('masculine');
  const n = bits.has('singular') ? 's' : bits.has('dual') ? 'd' : bits.has('plural') ? 'p' : '';
  if (!p) return null;
  if (p === 1) return n === 's' ? 'I' : 'we';
  if (p === 2) {
    if (n === 's') return f ? 'you (one woman)' : 'you (one man)';
    if (n === 'd') return 'you two';
    if (n === 'p') return f ? 'you (women)' : 'you all';
    return 'you';
  }
  if (n === 's') return f ? 'she / it' : m ? 'he / it' : 'he / it';
  if (n === 'd') return f ? 'they two (women)' : m ? 'they two (men)' : 'they two';
  if (n === 'p') return f ? 'they (women)' : 'they';
  return 'they';
}

const OBJECT: Record<string, string> = { I: 'me', we: 'us', you: 'you', he: 'him', she: 'her', they: 'them' };

/**
 * The everyday reading of a form label ("perfect, 3rd person, masculine, plural"
 * -> "past · they"), so a test can be answered by meaning; the label itself is
 * shown second, as terms.
 */
export function plainForm(label: string): string {
  const bits = new Set(label.split(', ').map((b) => b.trim()));
  if (bits.size === 1) {
    if (bits.has('singular')) return 'one';
    if (bits.has('dual')) return 'two';
    if (bits.has('plural')) return 'three or more';
  }
  const tense = [...bits].map((b) => TENSE_PLAIN[b]).find(Boolean);
  const who = whoOf(bits);
  if (bits.has('passive') && who) {
    // Passive: the person is the one the action is done to.
    const to = OBJECT[who.split(' ')[0]] ?? who;
    return [tense, `done to ${to}${who.includes('(') ? ' ' + who.slice(who.indexOf('(')) : ''}`].filter(Boolean).join(' · ');
  }
  const parts = [tense, who].filter(Boolean) as string[];
  return parts.length ? parts.join(' · ') : label;
}
