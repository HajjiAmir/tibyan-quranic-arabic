// The grammar glossary's wording (brief 17). One entry per grammatical term the app
// shows. Each is a plain summary of standard Arabic grammar, written for someone who
// has never studied grammar, and checked against the sources cited with it.
//
// - label:   the term as the app shows it (the Quranic Arabic Corpus label, unchanged).
// - aliases: other ways the app shows the same term.
// - arabic:  its Arabic grammatical name (the QAC tagset's where it gives one).
// - plain:   the explanation.
// - short:   one line on what it does, used beside test options.
// - match:   how build-glossary.mjs finds a real example in the data
//            ({ pos } a segment part of speech, { feature } a description feature,
//             { form } a verb form, { role } a word role, { flag } a segment flag).
// - prefer:  a verse to take the example from when the first one found would mislead
//            (an unusual gloss, or a word with many parts).
// - sources: keys of SOURCES below.
//
// The example shown with each entry is picked from the data by build-glossary.mjs:
// a real word of the Qur'an, with the Quranic Arabic Corpus word-by-word English.

export const SOURCES = {
  tagset: { title: 'Quranic Arabic Corpus: part-of-speech tagset', url: 'https://corpus.quran.com/documentation/tagset.jsp' },
  features: { title: 'Quranic Arabic Corpus: morphological features', url: 'https://corpus.quran.com/documentation/morphologicalfeatures.jsp' },
  verb: { title: 'Quranic Arabic Corpus: verbs, subjects and objects', url: 'https://corpus.quran.com/documentation/verb.jsp' },
  verbforms: { title: 'Quranic Arabic Corpus: verb forms', url: 'https://corpus.quran.com/documentation/verbforms.jsp' },
  mood: { title: 'Quranic Arabic Corpus: the subjunctive and jussive moods', url: 'https://corpus.quran.com/documentation/mood.jsp' },
  imperative: { title: 'Quranic Arabic Corpus: imperatives', url: 'https://corpus.quran.com/documentation/imperative.jsp' },
  gender: { title: 'Quranic Arabic Corpus: gender', url: 'https://corpus.quran.com/documentation/gender.jsp' },
  adjective: { title: 'Quranic Arabic Corpus: adjectives', url: 'https://corpus.quran.com/documentation/adjective.jsp' },
  subordinate: { title: 'Quranic Arabic Corpus: the subordinate clause', url: 'https://corpus.quran.com/documentation/subordinate.jsp' },
  conjunction: { title: 'Quranic Arabic Corpus: conjunctions', url: 'https://corpus.quran.com/documentation/conjunction.jsp' },
  inna: { title: 'Quranic Arabic Corpus: the particle inna', url: 'https://corpus.quran.com/documentation/particleinna.jsp' },
  fa: { title: 'Quranic Arabic Corpus: the particle fa', url: 'https://corpus.quran.com/documentation/particlefa.jsp' },
  alif: { title: 'Quranic Arabic Corpus: the particle alif', url: 'https://corpus.quran.com/documentation/particlealif.jsp' },
  condition: { title: 'Quranic Arabic Corpus: conditional sentences', url: 'https://corpus.quran.com/documentation/condition.jsp' },
  exceptive: { title: 'Quranic Arabic Corpus: exceptive particles', url: 'https://corpus.quran.com/documentation/exceptive.jsp' },
  vocative: { title: 'Quranic Arabic Corpus: the vocative', url: 'https://corpus.quran.com/documentation/vocative.jsp' },
  comitative: { title: 'Quranic Arabic Corpus: the comitative object', url: 'https://corpus.quran.com/documentation/comitativeobject.jsp' },
  wikiVerbs: { title: 'Wikipedia: Arabic verbs', url: 'https://en.wikipedia.org/wiki/Arabic_verbs' },
  irab: { title: 'Wikipedia: Iʿrab (case and mood endings)', url: 'https://en.wikipedia.org/wiki/I%CA%BFrab' },
  nunation: { title: 'Wikipedia: Nunation', url: 'https://en.wikipedia.org/wiki/Nunation' },
  arDem: { title: 'Arabic Wikipedia: اسم الإشارة', url: 'https://ar.wikipedia.org/wiki/%D8%A7%D8%B3%D9%85_%D8%A5%D8%B4%D8%A7%D8%B1%D8%A9' },
  arTafsir: { title: 'Arabic Wikipedia: الحروف المقطعة', url: 'https://ar.wikipedia.org/wiki/%D8%A7%D9%84%D8%AD%D8%B1%D9%88%D9%81_%D8%A7%D9%84%D9%85%D9%82%D8%B7%D8%B9%D8%A9' },
  pp: { title: 'Quranic Arabic Corpus: prepositional phrases', url: 'https://corpus.quran.com/documentation/prepositionphrase.jsp' },
};

const P = (s) => s; // marks plain text, for readability below

export const TERMS = [
  /* ------------------------------ word roles ------------------------------ */
  {
    id: 'noun', label: 'Noun', arabic: 'اِسْم', match: { pos: 'Noun' }, sources: ['tagset'],
    plain: P('A naming word: a person, place, thing or idea, like “book”, “mercy”, “day”. In Arabic it also covers many words English treats differently, such as describing words and words like “before” and “after”.'),
    short: P('a naming word for a person, thing or idea'),
  },
  {
    id: 'proper', label: 'Proper noun', arabic: 'اِسْم عَلَم', match: { pos: 'Proper noun' }, sources: ['tagset'],
    plain: P('The name of one particular person, place or being, like Allah, Mūsā (Moses) or Makkah.'),
    short: P('a name of one particular person or place'),
  },
  {
    id: 'verb', label: 'Verb', arabic: 'فِعْل', match: { pos: 'Verb' }, sources: ['tagset', 'verb'],
    plain: P('An action or happening word, like “said”, “believe”, “go!”. An Arabic verb also carries who does it (he, they, you…) and when, so one verb can be a whole small sentence, like “they said”.'),
    short: P('an action word: something done or happening'),
  },
  {
    id: 'pronoun', label: 'Pronoun', arabic: 'ضَمِير', match: { pos: 'Pronoun' }, sources: ['tagset', 'features'],
    plain: P('A stand-in for a noun, so it need not be repeated: “he, it, his, them, you, we”. In Arabic most pronouns are small endings joined to another word, like “his” on “book” to make “his book”.'),
    short: P('a stand-in for a noun: he, it, his, them'),
  },
  {
    id: 'adjective', label: 'Adjective', arabic: 'صِفَة', match: { pos: 'Adjective' }, sources: ['tagset', 'adjective'],
    plain: P('A describing word: it tells you what something is like, “merciful”, “great”, “straight”. In Arabic it comes after the noun it describes and matches it, so “the path, the straight” means “the straight path”.'),
    short: P('a describing word: what something is like'),
  },
  {
    id: 'preposition', label: 'Preposition', arabic: 'حَرْف جَرّ', match: { pos: 'Preposition' }, sources: ['tagset', 'pp'],
    plain: P('A small word that places one thing in relation to another: “in, on, from, to, with, by”. The noun after it takes the genitive ending (usually -i).'),
    short: P('a small word like “in, from, to, with”'),
  },
  {
    id: 'conjunction', label: 'Conjunction', arabic: 'حَرْف عَطْف', match: { pos: 'Conjunction' }, sources: ['tagset', 'conjunction'],
    plain: P('A joining word: it links words or sentences, “and”, “then”, “or”. In Arabic “and” (وَ) and “then” (فَ) are written joined to the next word.'),
    short: P('a joining word: “and”, “then”, “or”'),
  },
  {
    id: 'determiner', label: 'Determiner (the)', aliases: ['Determiner', 'article', 'al-'], arabic: 'أَل', match: { pos: 'Determiner (the)' }, sources: ['tagset'],
    plain: P('The word “the”. In Arabic it is the prefix al- (الـ) written at the front of the noun: الْكِتَاب “the book”.'),
    short: P('“the”: the prefix al- on a noun'),
  },
  {
    id: 'negation', label: 'Negation', arabic: 'نَفْي', match: { role: 'negation' }, sources: ['tagset'],
    plain: P('The colour for words that say “not” or “do not”: negative particles like لَا and مَا, and words that forbid or refuse. Tap a word’s own label to see which kind it is.'),
    short: P('a word that says “not” or “do not”'),
  },
  {
    id: 'particle', label: 'Particle', arabic: 'حَرْف', match: { role: 'particle' }, sources: ['tagset'],
    plain: P('A small helper word that never changes form. It doesn’t name a thing or an action; it links words or shades the meaning, like “and”, “not”, “in”, “then”, “indeed”.'),
    short: P('a small helper word that links or shades meaning'),
  },

  /* ----------------------------- kinds of noun ---------------------------- */
  {
    id: 'relative', label: 'Relative noun', arabic: 'اِسْم مَوْصُول', match: { pos: 'Relative noun' }, sources: ['tagset', 'subordinate'],
    plain: P('A word meaning “who”, “what” or “that which”. It points back to someone or something and introduces a description of it: “those who believed”, “what you worship”.'),
    short: P('“who / what / that which”: introduces a description'),
  },
  {
    id: 'demonstrative', label: 'Demonstrative', arabic: 'اِسْم إِشَارَة', match: { pos: 'Demonstrative' }, sources: ['tagset', 'arDem'],
    plain: P('A pointing word: “this”, “that”, “these”, “those”.'),
    short: P('a pointing word: “this, that, these”'),
  },
  {
    id: 'time-adverb', label: 'Time adverb', arabic: 'ظَرْف زَمَان', match: { pos: 'Time adverb' }, sources: ['tagset'],
    plain: P('A word saying when something happens: “when”, “then”, “the day”, “before”.'),
    short: P('a word saying when: “when, the day, before”'),
  },
  {
    id: 'place-adverb', label: 'Place adverb', arabic: 'ظَرْف مَكَان', match: { pos: 'Place adverb' }, sources: ['tagset'],
    plain: P('A word saying where something is: “with”, “there”, “between”, “under”.'),
    short: P('a word saying where: “with, between, under”'),
  },
  {
    id: 'active-participle', label: 'Active participle', arabic: 'اِسْم فَاعِل', match: { pos: 'Active participle' }, sources: ['tagset'],
    plain: P('A noun made from a verb that names the one who does the action: from “believe” comes مُؤْمِن “a believer, one who believes”; from “create” comes خَالِق “Creator”. It can often be read as “-er” or “-ing”.'),
    short: P('the one who does the action: “believer, doer”'),
  },
  {
    id: 'passive-participle', label: 'Passive participle', arabic: 'اِسْم مَفْعُول', match: { pos: 'Passive participle' }, sources: ['tagset'],
    plain: P('A noun made from a verb that names the one the action is done to: from “know” comes مَعْلُوم “known”. It is like English “-ed”.'),
    short: P('the one the action is done to: “known, written”'),
  },
  {
    id: 'masdar', label: 'Verbal noun (masdar)', arabic: 'مَصْدَر', match: { pos: 'Verbal noun (masdar)' }, sources: ['tagset'],
    plain: P('The name of an action itself, like English “-ing” or “-tion”: from “praise” comes حَمْد “praise”; from “believe” comes إِيمَان “belief, believing”.'),
    short: P('the name of an action: “praise, belief, going”'),
  },
  {
    id: 'verb-noun', label: 'Verbal noun', arabic: 'اِسْم فِعْل', match: { pos: 'Verbal noun' }, prefer: '17:23', sources: ['tagset'],
    plain: P('A word that acts like a verb or an exclamation but never changes form like one: أُفٍّ “ugh!”, or one meaning “come!” or “how far!”.'),
    short: P('an exclamation that acts like a verb: “ugh!”, “come!”'),
  },
  {
    id: 'initials', label: 'Quranic initials', arabic: 'حُرُوف مُقَطَّعَة', match: { pos: 'Quranic initials' }, sources: ['tagset', 'arTafsir'],
    plain: P('Separate letters that open some surahs, read letter by letter, like الٓمٓ “alif lām mīm”. Their meaning is not explained in the Qur’an, so they are left untranslated.'),
    short: P('opening letters of a surah, read one by one'),
  },

  /* ------------------------------- particles ------------------------------ */
  {
    id: 'negative', label: 'Negative particle', arabic: 'حَرْف نَفْي', match: { pos: 'Negative particle' }, sources: ['tagset'],
    plain: P('A word that makes something negative: “not”. The common ones are لَا, مَا, لَمْ, لَنْ and إِنْ (when it means “not”).'),
    short: P('makes it negative: “not”'),
  },
  {
    id: 'interrogative', label: 'Interrogative particle', arabic: 'حَرْف اسْتِفْهَام', match: { pos: 'Interrogative particle' }, sources: ['tagset', 'alif'],
    plain: P('A question word, used to ask: “is…?”, “do…?”, “what?”, “how?”. أَ at the front of a sentence turns it into a yes-or-no question.'),
    short: P('asks a question: “is…?”, “what?”'),
  },
  {
    id: 'supplemental', label: 'Supplemental particle', arabic: 'حَرْف زَائِد', match: { pos: 'Supplemental particle' }, prefer: '3:159', sources: ['tagset'],
    plain: P('A small added word that keeps the sentence flowing and often adds emphasis, but does not change its basic meaning, so translations often leave it out or render it lightly (“so”, “then”, “indeed”).'),
    short: P('a small added word for flow or emphasis'),
  },
  {
    id: 'resumption', label: 'Resumption particle', arabic: 'حَرْف اسْتِئْنَاف', match: { pos: 'Resumption particle' }, sources: ['tagset', 'fa'],
    plain: P('“And” or “so” at the start of a new sentence: it carries the passage on to a fresh statement rather than joining two words together. Usually وَ or فَ.'),
    short: P('“and / so” starting a fresh sentence'),
  },
  {
    id: 'accusative', label: 'Accusative particle', arabic: 'حَرْف نَصْب', match: { pos: 'Accusative particle' }, sources: ['tagset', 'inna'],
    plain: P('A small word like إِنَّ “indeed”, أَنَّ “that” or لَعَلَّ “perhaps” that changes the ending of the word after it to the accusative (usually -a).'),
    short: P('“indeed / that”, setting the next ending to -a'),
  },
  {
    id: 'subordinating', label: 'Subordinating conjunction', arabic: 'حَرْف مَصْدَرِيّ', match: { pos: 'Subordinating conjunction' }, sources: ['tagset', 'subordinate'],
    plain: P('A word like أَنْ “that, to” or مَا “what, as” that turns the clause after it into one part of a bigger sentence: “that you fast” works like the noun “your fasting”.'),
    short: P('“that / to”: makes a clause part of the sentence'),
  },
  {
    id: 'emphasis', label: 'Emphasis (lām)', aliases: ['Emphasis'], arabic: 'لَام التَّوْكِيد', match: { pos: 'Emphasis (lām)' }, sources: ['tagset'],
    plain: P('The letter لَ joined to a word to stress it: “surely, certainly”.'),
    short: P('“surely”: stresses the word it joins'),
  },
  {
    id: 'conditional', label: 'Conditional particle', arabic: 'حَرْف شَرْط', match: { pos: 'Conditional particle' }, sources: ['tagset', 'condition'],
    plain: P('“If” or “whenever”: it sets a condition, and the rest of the sentence says what follows from it.'),
    short: P('“if”: sets a condition'),
  },
  {
    id: 'restriction', label: 'Restriction particle', arabic: 'أَدَاة حَصْر', match: { pos: 'Restriction particle' }, prefer: '98:5', sources: ['tagset', 'exceptive'],
    plain: P('“Only” or “none but”: it limits a statement to one thing. Often إِلَّا after a “not”: مَا … إِلَّا “nothing but…”.'),
    short: P('“only / none but”: limits to one thing'),
  },
  {
    id: 'certainty', label: 'Particle of certainty', arabic: 'حَرْف تَحْقِيق', match: { pos: 'Particle of certainty' }, sources: ['tagset'],
    plain: P('قَدْ before a past verb: “certainly, indeed, already”.'),
    short: P('“certainly, already” (قَدْ)'),
  },
  {
    id: 'future', label: 'Future particle', arabic: 'حَرْف اسْتِقْبَال', match: { pos: 'Future particle' }, sources: ['tagset'],
    plain: P('سَـ or سَوْفَ before a present verb: “will”.'),
    short: P('“will”: points to the future'),
  },
  {
    id: 'vocative', label: 'Vocative particle', arabic: 'حَرْف نِدَاء', match: { pos: 'Vocative particle' }, sources: ['tagset', 'vocative'],
    plain: P('A calling word, used to address someone: “O…!”.'),
    short: P('calls out to someone: “O…!”'),
  },
  {
    id: 'prohibition', label: 'Prohibition particle', arabic: 'حَرْف نَهْي', match: { pos: 'Prohibition particle' }, sources: ['tagset', 'mood'],
    plain: P('لَا telling someone not to do something: “do not”. The verb after it takes the jussive form.'),
    short: P('“do not”: forbids an action'),
  },
  {
    id: 'answer', label: 'Answer particle', arabic: 'حَرْف جَوَاب', match: { pos: 'Answer particle' }, sources: ['tagset'],
    plain: P('A word that answers: “yes” or “no”, like بَلَىٰ “yes indeed” and نَعَمْ “yes”.'),
    short: P('an answer: “yes / no”'),
  },
  {
    id: 'inceptive', label: 'Inceptive particle', arabic: 'حَرْف ابْتِدَاء', match: { pos: 'Inceptive particle' }, sources: ['tagset'],
    plain: P('A word that opens a new statement, such as حَتَّىٰ “until, then at last” or بَلْ “rather”, when what follows stands as its own sentence.'),
    short: P('opens a new statement: “until, then at last”'),
  },
  {
    id: 'circumstantial', label: 'Circumstantial particle', arabic: 'حَرْف حَال', match: { pos: 'Circumstantial particle' }, sources: ['tagset'],
    plain: P('وَ meaning “while”: it introduces the situation in which something happens.'),
    short: P('“while”: describes the situation'),
  },
  {
    id: 'causal', label: 'Causal particle', arabic: 'حَرْف سَبَبِيَّة', match: { pos: 'Causal particle' }, sources: ['tagset', 'fa'],
    plain: P('فَ meaning “so that, lest”: it gives a reason or a result that hangs on what came before.'),
    short: P('“so that”: gives a cause or result'),
  },
  {
    id: 'purpose', label: 'Purpose particle (lām)', aliases: ['Purpose particle'], arabic: 'لَام التَّعْلِيل', match: { pos: 'Purpose particle (lām)' }, sources: ['tagset'],
    plain: P('The letter لِ before a verb, meaning “so that” or “in order to”.'),
    short: P('“so that, in order to”'),
  },
  {
    id: 'retraction', label: 'Retraction particle', arabic: 'حَرْف إِضْرَاب / اسْتِدْرَاك', match: { pos: 'Retraction particle' }, sources: ['tagset'],
    plain: P('A turning word: بَلْ “nay, rather” sets aside what came before for something truer, and لَٰكِنْ “but” corrects or qualifies it. (The corpus calls بَلْ a retraction and لَٰكِنْ an amendment; the app shows both under this one label.)'),
    short: P('turns the point: “rather”, “but”'),
  },
  {
    id: 'aversion', label: 'Aversion particle', arabic: 'حَرْف رَدْع', match: { pos: 'Aversion particle' }, sources: ['tagset'],
    plain: P('كَلَّا: a firm “No!” or “By no means!” that rejects what was just said or thought.'),
    short: P('a firm “No! By no means!”'),
  },
  {
    id: 'exceptive', label: 'Exceptive particle', arabic: 'أَدَاة اسْتِثْنَاء', match: { pos: 'Exceptive particle' }, sources: ['tagset', 'exceptive'],
    plain: P('“Except” or “but not”: it takes one thing out of a group.'),
    short: P('“except”: leaves one out of a group'),
  },
  {
    id: 'exhortation', label: 'Exhortation particle', arabic: 'حَرْف تَحْضِيض', match: { pos: 'Exhortation particle' }, sources: ['tagset'],
    plain: P('لَوْلَا or لَوْمَا meaning “why not…?” or “if only…”: it urges or reproaches.'),
    short: P('“why not…?”: urges or reproaches'),
  },
  {
    id: 'surprise', label: 'Surprise particle', arabic: 'حَرْف فُجَاءَة', match: { pos: 'Surprise particle' }, sources: ['tagset'],
    plain: P('إِذَا meaning “and behold!” or “suddenly”: something unexpected happens at once.'),
    short: P('“and behold!”: something sudden'),
  },
  {
    id: 'detail', label: 'Detail particle', arabic: 'حَرْف تَفْصِيل', match: { pos: 'Detail particle' }, sources: ['tagset'],
    plain: P('أَمَّا “as for…” or إِمَّا “either… or”: it sets out cases one by one.'),
    short: P('“as for…”, “either… or”: sets out cases'),
  },
  {
    id: 'explanatory', label: 'Explanatory particle', arabic: 'حَرْف تَفْسِير', match: { pos: 'Explanatory particle' }, sources: ['tagset'],
    plain: P('أَنْ meaning “that is” or “namely”: it spells out the words of what was said, revealed or commanded.'),
    short: P('“namely”: spells out what was said'),
  },
  {
    id: 'equalization', label: 'Equalization particle', arabic: 'حَرْف تَسْوِيَة', match: { pos: 'Equalization particle' }, sources: ['tagset', 'alif'],
    plain: P('أَ meaning “whether”, after words like “it is the same”: “it is the same whether… or…”.'),
    short: P('“whether… or”: it is the same either way'),
  },
  {
    id: 'comitative', label: 'Comitative (wāw)', aliases: ['Comitative'], arabic: 'وَاو الْمَعِيَّة', match: { pos: 'Comitative (wāw)' }, sources: ['tagset', 'comitative'],
    plain: P('وَ meaning “along with, together with” rather than a plain “and”.'),
    short: P('“along with”: together with'),
  },
  {
    id: 'result', label: 'Result particle', arabic: 'حَرْف وَاقِع فِي جَوَاب الشَّرْط', match: { pos: 'Result particle' }, sources: ['tagset', 'condition', 'fa'],
    plain: P('فَ meaning “then”, opening what follows from an “if”: “if you do this, then…”.'),
    short: P('“then”: opens the result of an “if”'),
  },
  {
    id: 'preventive', label: 'Preventive particle', arabic: 'حَرْف كَافّ', match: { pos: 'Preventive particle' }, sources: ['tagset', 'inna'],
    plain: P('A small مَا joined to a word like إِنَّ, which stops that word changing the ending of the next one. Together, إِنَّمَا often means “only”.'),
    short: P('the مَا in إِنَّمَا “only”'),
  },
  {
    id: 'attention', label: 'Attention particle', arabic: 'حَرْف تَنْبِيه', match: { pos: 'Attention particle' }, sources: ['tagset', 'arDem'],
    plain: P('A word that calls for attention: أَلَا “Behold! Truly!”, and the هَا in هَٰذَا “this” or يَا أَيُّهَا “O you”.'),
    short: P('“Behold!”: calls for attention'),
  },
  {
    id: 'distance', label: 'Distance particle', arabic: 'لَام الْبُعْد', match: { pos: 'Distance particle' }, sources: ['tagset', 'arDem'],
    plain: P('The لِ inside ذَٰلِكَ “that” and تِلْكَ: it shows the thing pointed at is further away, “that” rather than “this”.'),
    short: P('the l in ذَٰلِكَ: “that” (further away)'),
  },
  {
    id: 'address', label: 'Address particle', arabic: 'كَاف الْخِطَاب', match: { pos: 'Address particle' }, sources: ['tagset', 'arDem'],
    plain: P('The كَ at the end of ذَٰلِكَ “that” and similar words: it faces the person spoken to. It is not “you” or “your” in the meaning; it changes to كُمْ when a group is addressed.'),
    short: P('the k in ذَٰلِكَ, facing the listener'),
  },

  /* ----------------------------- word endings ----------------------------- */
  {
    id: 'nominative', label: 'nominative', arabic: 'مَرْفُوع', match: { feature: 'nominative' }, sources: ['features', 'irab'],
    plain: P('The ending (usually -u) a noun has when it is the subject, the one doing or being something.'),
    short: P('the -u ending: the subject'),
  },
  {
    id: 'accusative-case', label: 'accusative', arabic: 'مَنْصُوب', match: { feature: 'accusative' }, sources: ['features', 'irab'],
    plain: P('The ending (usually -a) a noun has when it is the object, the one something is done to, or after words like إِنَّ.'),
    short: P('the -a ending: the object'),
  },
  {
    id: 'genitive', label: 'genitive', arabic: 'مَجْرُور', match: { feature: 'genitive' }, sources: ['features', 'pp', 'irab'],
    plain: P('The ending (usually -i) a noun has after a preposition (“in, from, to”) or as the “of” part of a pair, like “the name of Allah”.'),
    short: P('the -i ending: after “in, of, to”'),
  },
  {
    id: 'indefinite', label: 'indefinite', arabic: 'نَكِرَة', match: { feature: 'indefinite' }, sources: ['features', 'nunation'],
    plain: P('“A” or “an” rather than “the”: a noun not pointing to one particular thing. It usually ends in -n: كِتَابٌ “a book”.'),
    short: P('“a / an”, not “the”'),
  },

  /* ----------------------------- who and how many ------------------------- */
  {
    id: 'masculine', label: 'masculine', arabic: 'مُذَكَّر', match: { feature: 'masculine' }, sources: ['features', 'gender'],
    plain: P('Every Arabic noun, and every verb and adjective that goes with it, is grammatically masculine or feminine. Masculine is the default form: “he”.'),
    short: P('grammatically masculine: “he”'),
  },
  {
    id: 'feminine', label: 'feminine', arabic: 'مُؤَنَّث', match: { feature: 'feminine' }, sources: ['features', 'gender'],
    plain: P('The grammatically feminine form, often marked by ـة or ـت: “she”. Things as well as people can be feminine, so it is a grammar class, not always about being female.'),
    short: P('grammatically feminine: “she”'),
  },
  {
    id: 'singular', label: 'singular', aliases: ['one'], arabic: 'مُفْرَد', match: { feature: 'singular' }, sources: ['features'],
    plain: P('One: one person or thing.'),
    short: P('one'),
  },
  {
    id: 'dual', label: 'dual', aliases: ['two'], arabic: 'مُثَنًّى', match: { feature: 'dual' }, sources: ['features'],
    plain: P('Exactly two. Arabic has its own form for a pair, usually ending -āni or -ayni.'),
    short: P('exactly two'),
  },
  {
    id: 'plural', label: 'plural', aliases: ['three or more'], arabic: 'جَمْع', match: { feature: 'plural' }, sources: ['features'],
    plain: P('Three or more, since Arabic has a separate form for two.'),
    short: P('three or more'),
  },
  {
    id: 'person1', label: '1st person', arabic: 'مُتَكَلِّم', match: { feature: '1st person' }, sources: ['features'],
    plain: P('The one speaking: “I” or “we”.'),
    short: P('the speaker: “I / we”'),
  },
  {
    id: 'person2', label: '2nd person', arabic: 'مُخَاطَب', match: { feature: '2nd person' }, sources: ['features'],
    plain: P('The one spoken to: “you”. Arabic has different “you” forms for a man, a woman, two people and a group.'),
    short: P('the one spoken to: “you”'),
  },
  {
    id: 'person3', label: '3rd person', arabic: 'غَائِب', match: { feature: '3rd person' }, sources: ['features'],
    plain: P('The one spoken about: “he, she, it, they”.'),
    short: P('the one spoken about: “he, she, they”'),
  },

  /* ---------------------------------- time --------------------------------- */
  {
    id: 'perfect', label: 'perfect', aliases: ['past'], arabic: 'مَاضٍ', match: { feature: 'perfect' }, sources: ['features', 'verb', 'wikiVerbs'],
    plain: P('The verb form for a finished action, mostly read as past: قَالَ “he said”. Its “who” is shown by an ending.'),
    short: P('a finished action: past'),
  },
  {
    id: 'imperfect', label: 'imperfect', aliases: ['present or future'], arabic: 'مُضَارِع', match: { feature: 'imperfect' }, sources: ['features', 'verb', 'wikiVerbs'],
    plain: P('The verb form for an action not yet finished, read as present or future: يَقُولُ “he says, he will say”. Its “who” is shown by a prefix, like يَـ “he” or نَـ “we”.'),
    short: P('an unfinished action: present or future'),
  },
  {
    id: 'imperative', label: 'imperative', aliases: ['a command'], arabic: 'أَمْر', match: { feature: 'imperative' }, sources: ['features', 'imperative', 'wikiVerbs'],
    plain: P('The verb form for a command or request: “do!”, “say!”, “guide us!”.'),
    short: P('a command: “do!”'),
  },
  {
    id: 'passive', label: 'passive', arabic: 'مَبْنِيّ لِلْمَجْهُول', match: { feature: 'passive' }, sources: ['features', 'verb', 'wikiVerbs'],
    plain: P('The action is done to the subject, and the doer is not named: “it was written” rather than “he wrote”.'),
    short: P('done to someone, the doer unnamed'),
  },
  {
    id: 'indicative', label: 'indicative', arabic: 'مَرْفُوع', match: { feature: 'indicative' }, sources: ['features', 'mood', 'irab'],
    plain: P('The ordinary form of a present-tense verb, for plain statements and questions (usually ending -u), like “he knows”.'),
    short: P('the plain present form: a statement'),
  },
  {
    id: 'subjunctive', label: 'subjunctive', arabic: 'مَنْصُوب', match: { feature: 'subjunctive' }, sources: ['features', 'mood', 'irab'],
    plain: P('The form a present-tense verb takes after words like أَنْ “to, that”, لَنْ “will never” and لِـ “so that” (usually ending -a).'),
    short: P('after “to / so that / will never”'),
  },
  {
    id: 'jussive', label: 'jussive', arabic: 'مَجْزُوم', match: { feature: 'jussive' }, sources: ['features', 'mood', 'irab'],
    plain: P('The shortened form a present-tense verb takes after لَمْ “did not”, لَا “do not”, and in “if…” sentences.'),
    short: P('the shortened form after “did not / do not / if”'),
  },

  /* -------------------------------- verb forms ----------------------------- */
  ...[
    ['1', 'فَعَلَ', 'The basic pattern of a three-letter root: the plain meaning of the action. كَتَبَ “he wrote”; قَالَ “he said”.', 'the basic verb'],
    ['2', 'فَعَّلَ', 'The middle letter is doubled. It often makes the action intensive or makes someone else do it: from عَلِمَ “knew” comes عَلَّمَ “taught”.', 'doubled middle: intensive or causing'],
    ['3', 'فَاعَلَ', 'A long ā after the first letter. It often means doing the action with or toward someone: جَاهَدَ “strove (against)”.', 'with or toward someone'],
    ['4', 'أَفْعَلَ', 'An a- in front. It often means causing the action: from خَرَجَ “went out” comes أَخْرَجَ “brought out”.', 'a- in front: causing'],
    ['5', 'تَفَعَّلَ', 'ta- in front and a doubled middle letter. It often means doing form 2’s action to oneself: تَذَكَّرَ “took heed, remembered”.', 'ta- + doubled: to oneself'],
    ['6', 'تَفَاعَلَ', 'ta- in front and a long ā. It often means doing the action with each other: تَسَاءَلَ “asked one another”.', 'ta- + ā: with each other'],
    ['7', 'اِنْفَعَلَ', 'in- in front. It often means the action happening to the subject: اِنْقَلَبَ “turned back, was overturned”.', 'in- in front: it happens to the subject'],
    ['8', 'اِفْتَعَلَ', 'A t after the first root letter. It often means doing the action for oneself: اِتَّقَىٰ “guarded himself, was mindful”.', 't inside: for oneself'],
    ['9', 'اِفْعَلَّ', 'A doubled last letter. Used mainly for colours and bodily traits: اِسْوَدَّ “became black”.', 'colours and traits'],
    ['10', 'اِسْتَفْعَلَ', 'ista- in front. It often means asking for the action, or deeming something so: اِسْتَغْفَرَ “asked forgiveness”.', 'ista- in front: asking for'],
    ['11', 'اِفْعَالَّ', 'A long ā and a doubled last letter. A rare, stronger form of form 9 for colours and traits: اِدْهَامَّ “dark green”.', 'a stronger form 9'],
  ].map(([n, pattern, plain, short]) => ({
    id: `form${n}`,
    label: `form ${n}`,
    aliases: [`form ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'][+n]}`],
    arabic: pattern,
    match: { form: +n },
    sources: ['verbforms', 'wikiVerbs'],
    plain: P(`Verb form ${n}, the pattern ${pattern}. ${plain} Arabic builds related verbs from one root by these patterns; the meanings given are common tendencies, not rules.`),
    short: P(short),
  })),

  /* ------------------------------ word building ---------------------------- */
  {
    id: 'root', label: 'root', aliases: ['Root'], arabic: 'جِذْر', match: null, sources: ['features'],
    plain: P('The core letters, usually three, that carry a basic idea. Many words are built from one root: ك ت ب “writing” gives كَتَبَ “wrote”, كِتَاب “book”, مَكْتُوب “written”.'),
    short: P('the core letters a family of words share'),
  },
  {
    id: 'lemma', label: 'lemma', aliases: ['Lemma', 'dictionary form'], match: null, sources: ['features'],
    plain: P('The dictionary form of a word: the one entry that all its spellings (with endings, prefixes, he/she/they forms) belong to.'),
    short: P('the dictionary form of a word'),
  },
  {
    id: 'prefix', label: 'prefix', aliases: ['Prefix', 'Attached prefix'], arabic: 'سَابِقَة', match: { flag: 'PREF' }, sources: ['features'],
    plain: P('A small word written joined to the front of the next word, such as وَ “and”, بِ “with, in”, لِ “for” or الـ “the”: بِسْمِ = بِ “in” + اسْم “name”.'),
    short: P('a small word joined to the front'),
  },
  {
    id: 'suffix', label: 'suffix', aliases: ['Suffix', 'Attached pronoun'], arabic: 'لَاحِقَة', match: { flag: 'SUFF' }, sources: ['features'],
    plain: P('A small word written joined to the end of another, usually a pronoun: كِتَابُهُ “his book” is كِتَاب “book” + هُ “his”.'),
    short: P('a small word joined to the end'),
  },
  {
    id: 'separate-pronoun', label: 'Separate pronoun', arabic: 'ضَمِير مُنْفَصِل', match: null, sources: ['tagset', 'features'],
    plain: P('A pronoun written as its own word, not joined to another: هُوَ “he”, أَنْتُمْ “you”.'),
    short: P('a pronoun standing as its own word'),
  },
  {
    id: 'possessive', label: 'Possessive', arabic: 'مُضَاف إِلَيْه', match: null, sources: ['features'],
    plain: P('A pronoun ending on a noun means “his, her, their, my…”, as in “your Lord”.'),
    short: P('on a noun: “his, your, their”'),
  },
  {
    id: 'object', label: 'Object', arabic: 'مَفْعُول بِه', match: null, sources: ['verb'],
    plain: P('A pronoun ending on a verb is usually the one the action is done to, “him, them, us…”, as in “He created you”.'),
    short: P('on a verb: “him, them, you”'),
  },
  {
    id: 'after-particle', label: 'After a particle', arabic: 'ضَمِير مُتَّصِل', match: null, sources: ['features', 'pp'],
    plain: P('A pronoun ending on a small word: after a preposition it means “him, them, it” (“for him”); after إِنَّ it is the one the sentence is about (“indeed he”).'),
    short: P('on a small word: “for him, indeed he”'),
  },
];
