/* ================================================================
   DOGEARED — catalog.js
   Seed data: genres, moods, a starter catalog (works offline),
   quotes, achievements, XP rules, journal prompts.
   Icons are icon-system names (see icons.js) — no emoji here,
   except SESSION_MOODS which intentionally stay as emoji.
================================================================ */
"use strict";

const GENRES = [
  { id: "fantasy",   label: "Fantasy",          ic: "sparkle" },
  { id: "scifi",     label: "Sci-Fi",           ic: "rocket" },
  { id: "romance",   label: "Romance",          ic: "heart" },
  { id: "mystery",   label: "Mystery & Thriller", ic: "search" },
  { id: "litfic",    label: "Literary Fiction", ic: "feather" },
  { id: "historical",label: "Historical",       ic: "landmark" },
  { id: "horror",    label: "Horror",           ic: "moon" },
  { id: "nonfic",    label: "Non-fiction",      ic: "lightbulb" },
  { id: "growth",    label: "Self-Growth",      ic: "sprout" },
  { id: "classics",  label: "Classics",         ic: "book_open" },
  { id: "ya",        label: "Young Adult",      ic: "star" },
  { id: "poetry",    label: "Poetry & Essays",  ic: "pen" },
];

const MOODS = [
  { id: "cozy",     label: "Cozy & comforting",   ic: "coffee" },
  { id: "dark",     label: "Dark & atmospheric",  ic: "moon" },
  { id: "twisty",   label: "Fast & twisty",       ic: "shuffle" },
  { id: "feels",    label: "Big feelings",        ic: "heart" },
  { id: "mind",     label: "Mind-expanding",      ic: "lightbulb" },
  { id: "whimsy",   label: "Whimsical & light",   ic: "wind" },
  { id: "slowburn", label: "Slow burn",           ic: "sunrise" },
  { id: "epic",     label: "Epic adventure",      ic: "mountain" },
];

/* genre → solid brand-tinted color (no gradients) */
const GENRE_HUES = {
  fantasy: "#5B3A8C", scifi: "#1F4E6B", romance: "#B04A63", mystery: "#3D4A3E",
  litfic: "#8C6A3F", historical: "#7A5230", horror: "#3A2F3F", nonfic: "#2F5D50",
  growth: "#5E7A3A", classics: "#7A3A2E", ya: "#B05E2E", poetry: "#4E5D7A",
};

/* Starter catalog — powers Discover offline & seeds recommendations. */
const CATALOG = [
  { id:"c1",  t:"The Name of the Wind", a:"Patrick Rothfuss", g:["fantasy"], m:["epic","slowburn"], p:662, y:2007, r:4.5, b:"A legendary arcanist recounts how a gifted, grieving boy talked his way into a university of magic — and into myth." },
  { id:"c2",  t:"A Wizard of Earthsea", a:"Ursula K. Le Guin", g:["fantasy","classics"], m:["mind","epic"], p:183, y:1968, r:4.0, b:"A young mage's pride looses a shadow on the world, and the hunt to name it becomes a hunt for himself." },
  { id:"c3",  t:"The House in the Cerulean Sea", a:"TJ Klune", g:["fantasy","romance"], m:["cozy","whimsy"], p:396, y:2020, r:4.4, b:"A by-the-book caseworker audits an orphanage of magical children and finds his rulebook melting." },
  { id:"c4",  t:"Piranesi", a:"Susanna Clarke", g:["fantasy","litfic"], m:["mind","dark"], p:245, y:2020, r:4.2, b:"A gentle man wanders an infinite house of statues and tides, cataloguing a world that is not what he thinks." },
  { id:"c5",  t:"The Fifth Season", a:"N.K. Jemisin", g:["fantasy","scifi"], m:["dark","epic"], p:468, y:2015, r:4.3, b:"On a planet that keeps trying to die, a mother with earth-shattering power crosses a broken land." },
  { id:"c6",  t:"Project Hail Mary", a:"Andy Weir", g:["scifi"], m:["mind","twisty"], p:476, y:2021, r:4.5, b:"A man wakes alone on a starship with no memory and one job: save a species. Possibly two." },
  { id:"c7",  t:"Dune", a:"Frank Herbert", g:["scifi","classics"], m:["epic","mind"], p:412, y:1965, r:4.3, b:"A desert planet, a hunted heir, and the most dangerous substance in the universe: belief." },
  { id:"c8",  t:"The Left Hand of Darkness", a:"Ursula K. Le Guin", g:["scifi","classics"], m:["mind","slowburn"], p:304, y:1969, r:4.1, b:"An envoy alone on a winter planet learns that politics, gender, and loyalty are all shapeshifters." },
  { id:"c9",  t:"Klara and the Sun", a:"Kazuo Ishiguro", g:["scifi","litfic"], m:["feels","slowburn"], p:303, y:2021, r:3.9, b:"An artificial friend watches the sun, and the humans she loves, with devastating sincerity." },
  { id:"c10", t:"Sea of Tranquility", a:"Emily St. John Mandel", g:["scifi","litfic"], m:["mind","feels"], p:255, y:2022, r:4.1, b:"A moment glitches across five centuries, stitching exiles, pandemics, and moon colonies together." },
  { id:"c11", t:"Beach Read", a:"Emily Henry", g:["romance"], m:["cozy","feels"], p:361, y:2020, r:4.0, b:"Two rival writers swap genres for a summer and discover the plot twist is each other." },
  { id:"c12", t:"Red, White & Royal Blue", a:"Casey McQuiston", g:["romance"], m:["whimsy","feels"], p:421, y:2019, r:4.1, b:"The First Son of the US and a British prince go from tabloid feud to international secret." },
  { id:"c13", t:"Pride and Prejudice", a:"Jane Austen", g:["romance","classics"], m:["whimsy","slowburn"], p:279, y:1813, r:4.3, b:"The sharpest tongue in Hertfordshire meets the proudest man in England. Sparks, verbally, fly." },
  { id:"c14", t:"The Seven Husbands of Evelyn Hugo", a:"Taylor Jenkins Reid", g:["romance","litfic"], m:["feels","twisty"], p:389, y:2017, r:4.4, b:"A reclusive Hollywood icon finally tells the truth about seven marriages and one great love." },
  { id:"c15", t:"Gone Girl", a:"Gillian Flynn", g:["mystery"], m:["twisty","dark"], p:415, y:2012, r:4.1, b:"A wife disappears on her anniversary and every chapter makes you switch whose side you're on." },
  { id:"c16", t:"The Silent Patient", a:"Alex Michaelides", g:["mystery"], m:["twisty","dark"], p:325, y:2019, r:4.2, b:"She shot her husband and never spoke again. Her new therapist is determined to know why." },
  { id:"c17", t:"And Then There Were None", a:"Agatha Christie", g:["mystery","classics"], m:["twisty","dark"], p:264, y:1939, r:4.3, b:"Ten strangers, one island, zero survivors promised. The blueprint for every thriller since." },
  { id:"c18", t:"The Thursday Murder Club", a:"Richard Osman", g:["mystery"], m:["cozy","whimsy"], p:382, y:2020, r:4.1, b:"Four retirees who solve cold cases for fun suddenly get a warm one, right on their doorstep." },
  { id:"c19", t:"A Little Life", a:"Hanya Yanagihara", g:["litfic"], m:["feels","dark"], p:720, y:2015, r:4.3, b:"Four friends across four decades, and one man whose past keeps the reader holding their breath." },
  { id:"c20", t:"Normal People", a:"Sally Rooney", g:["litfic","romance"], m:["feels","slowburn"], p:266, y:2018, r:3.8, b:"Two people who understand each other completely, except whenever it matters most." },
  { id:"c21", t:"The Remains of the Day", a:"Kazuo Ishiguro", g:["litfic","classics"], m:["slowburn","feels"], p:258, y:1989, r:4.1, b:"A butler drives across England and, very politely, realizes he may have missed his whole life." },
  { id:"c22", t:"Tomorrow, and Tomorrow, and Tomorrow", a:"Gabrielle Zevin", g:["litfic"], m:["feels","mind"], p:401, y:2022, r:4.2, b:"Two friends build video games together for thirty years. A love story that isn't a romance." },
  { id:"c23", t:"Pachinko", a:"Min Jin Lee", g:["historical","litfic"], m:["feels","epic"], p:490, y:2017, r:4.3, b:"Four generations of a Korean family in Japan, carrying history in their pockets like warm coins." },
  { id:"c24", t:"All the Light We Cannot See", a:"Anthony Doerr", g:["historical"], m:["feels","slowburn"], p:531, y:2014, r:4.2, b:"A blind French girl and a German radio prodigy drift toward each other through occupied Europe." },
  { id:"c25", t:"Wolf Hall", a:"Hilary Mantel", g:["historical"], m:["slowburn","mind"], p:604, y:2009, r:3.9, b:"Thomas Cromwell rises through Henry VIII's court on wit alone, in prose sharp enough to shave with." },
  { id:"c26", t:"The Book Thief", a:"Markus Zusak", g:["historical","ya"], m:["feels","dark"], p:552, y:2005, r:4.4, b:"Death himself narrates the story of a girl in Nazi Germany who steals books and shares them." },
  { id:"c27", t:"Mexican Gothic", a:"Silvia Moreno-Garcia", g:["horror","historical"], m:["dark","twisty"], p:301, y:2020, r:3.7, b:"A glamorous socialite visits her cousin's decaying mansion and the house starts dreaming back." },
  { id:"c28", t:"The Haunting of Hill House", a:"Shirley Jackson", g:["horror","classics"], m:["dark","slowburn"], p:246, y:1959, r:4.0, b:"Four people spend a summer in a house that was born bad. Not everyone checks out." },
  { id:"c29", t:"House of Leaves", a:"Mark Z. Danielewski", g:["horror"], m:["mind","dark"], p:705, y:2000, r:4.1, b:"A house is bigger on the inside, and the book about it starts rearranging your margins." },
  { id:"c30", t:"Sapiens", a:"Yuval Noah Harari", g:["nonfic"], m:["mind"], p:443, y:2011, r:4.3, b:"How a gossiping ape invented money, gods, and nations — a whirlwind tour of us." },
  { id:"c31", t:"Educated", a:"Tara Westover", g:["nonfic"], m:["feels","dark"], p:334, y:2018, r:4.5, b:"Raised off-grid by survivalists, she first set foot in a classroom at seventeen. Then Cambridge." },
  { id:"c32", t:"Thinking, Fast and Slow", a:"Daniel Kahneman", g:["nonfic","growth"], m:["mind"], p:499, y:2011, r:4.1, b:"A Nobel laureate explains the two characters in your head and why they keep fooling you." },
  { id:"c33", t:"The Body Keeps the Score", a:"Bessel van der Kolk", g:["nonfic","growth"], m:["mind","feels"], p:445, y:2014, r:4.4, b:"How trauma lives in the body, and the surprising paths through which people heal." },
  { id:"c34", t:"Atomic Habits", a:"James Clear", g:["growth"], m:["mind"], p:319, y:2018, r:4.3, b:"Forget goals; design systems. The 1%-better handbook that launched a million routines." },
  { id:"c35", t:"Deep Work", a:"Cal Newport", g:["growth","nonfic"], m:["mind"], p:296, y:2016, r:4.1, b:"A case for focus as a superpower in a world engineered to shatter it." },
  { id:"c36", t:"The Alchemist", a:"Paulo Coelho", g:["growth","classics"], m:["whimsy","mind"], p:197, y:1988, r:3.9, b:"A shepherd chases a recurring dream to the pyramids and finds the treasure was the detour." },
  { id:"c37", t:"East of Eden", a:"John Steinbeck", g:["classics","litfic"], m:["epic","feels"], p:601, y:1952, r:4.4, b:"Two families reenact Cain and Abel in a California valley. Timshel: thou mayest." },
  { id:"c38", t:"Jane Eyre", a:"Charlotte Brontë", g:["classics","romance"], m:["dark","slowburn"], p:507, y:1847, r:4.2, b:"A governess with an iron will, an employer with a locked attic, and a moor full of secrets." },
  { id:"c39", t:"One Hundred Years of Solitude", a:"Gabriel García Márquez", g:["classics","litfic"], m:["mind","whimsy"], p:417, y:1967, r:4.1, b:"A century of the Buendía family in a town where rain lasts years and ghosts hold grudges." },
  { id:"c40", t:"Six of Crows", a:"Leigh Bardugo", g:["ya","fantasy"], m:["twisty","epic"], p:465, y:2015, r:4.5, b:"Six dangerous outcasts, one impossible heist, and a criminal prodigy who's always six steps ahead." },
  { id:"c41", t:"The Hunger Games", a:"Suzanne Collins", g:["ya","scifi"], m:["twisty","epic"], p:374, y:2008, r:4.3, b:"A girl volunteers for a televised death match and accidentally sparks a revolution." },
  { id:"c42", t:"They Both Die at the End", a:"Adam Silvera", g:["ya","romance"], m:["feels"], p:373, y:2017, r:4.0, b:"Two strangers get the call that today is their last day, and decide to spend it living." },
  { id:"c43", t:"Milk and Honey", a:"Rupi Kaur", g:["poetry"], m:["feels"], p:204, y:2014, r:3.8, b:"Spare verses on hurting, loving, breaking, and healing — a phenomenon in four chapters." },
  { id:"c44", t:"Devotions", a:"Mary Oliver", g:["poetry"], m:["cozy","mind"], p:442, y:2017, r:4.6, b:"A lifetime of paying attention: geese, grasshoppers, and your one wild and precious life." },
  { id:"c45", t:"The Midnight Library", a:"Matt Haig", g:["litfic","fantasy"], m:["feels","whimsy"], p:288, y:2020, r:4.0, b:"Between life and death is a library of the lives you didn't live. Nora starts browsing." },
  { id:"c46", t:"Circe", a:"Madeline Miller", g:["fantasy","historical"], m:["feels","epic"], p:393, y:2018, r:4.3, b:"The witch of Greek myth gets the whole stage: exile, monsters, gods, and a hard-won self." },
  { id:"c47", t:"The Martian", a:"Andy Weir", g:["scifi"], m:["twisty","whimsy"], p:369, y:2011, r:4.4, b:"An astronaut is left for dead on Mars and decides to science the daylights out of it." },
  { id:"c48", t:"Before the Coffee Gets Cold", a:"Toshikazu Kawaguchi", g:["litfic","fantasy"], m:["cozy","feels"], p:213, y:2015, r:3.7, b:"A Tokyo café lets you travel back in time — but only until your coffee goes cold." },
];

const QUOTES = [
  ["A room without books is like a body without a soul.", "Cicero"],
  ["I have always imagined that Paradise will be a kind of library.", "Jorge Luis Borges"],
  ["A reader lives a thousand lives before he dies.", "George R.R. Martin"],
  ["Books are a uniquely portable magic.", "Stephen King"],
  ["Once you learn to read, you will be forever free.", "Frederick Douglass"],
  ["We read to know we are not alone.", "attributed to C.S. Lewis"],
  ["No two persons ever read the same book.", "Edmund Wilson"],
  ["Sleep is good, he said, and books are better.", "George R.R. Martin"],
  ["It is what you read when you don't have to that determines what you will be when you can't help it.", "Oscar Wilde"],
  ["Until I feared I would lose it, I never loved to read. One does not love breathing.", "Harper Lee"],
  ["A book must be the axe for the frozen sea within us.", "Franz Kafka"],
  ["Reading is a discount ticket to everywhere.", "Mary Schmich"],
  ["There is no friend as loyal as a book.", "Ernest Hemingway"],
  ["The reading of all good books is like a conversation with the finest minds of past centuries.", "René Descartes"],
];

/* ---------------- gamification ---------------- */
const XP_RULES = {
  perMinute: 1, perPage: 2, finishBook: 150, firstSessionOfDay: 20,
  journalEntry: 15, deepJournalEntry: 22, review: 25, newGenre: 40,
};
const levelForXP = (xp) => Math.floor(Math.sqrt(xp / 60)) + 1;
const xpForLevel = (lv) => Math.pow(lv - 1, 2) * 60;

const ACHIEVEMENTS = [
  { id:"first_session", ic:"bookmark",   t:"First Page",        d:"Log your first reading session", test:(s)=>s.sessions.length>=1 },
  { id:"page_turner",   ic:"book",       t:"Page Turner",       d:"Read 100 pages",                 test:(s,d)=>d.totalPages>=100 },
  { id:"thousand",      ic:"layers",     t:"1,000 Pages",       d:"Read 1,000 pages",               test:(s,d)=>d.totalPages>=1000 },
  { id:"night_owl",     ic:"moon",       t:"Night Owl",         d:"Finish a session after 11pm",    test:(s)=>s.sessions.some(x=>new Date(x.createdAt).getHours()>=23||new Date(x.createdAt).getHours()<4) },
  { id:"early_bird",    ic:"sunrise",    t:"Dawn Reader",       d:"Read before 7am",                test:(s)=>s.sessions.some(x=>{const h=new Date(x.createdAt).getHours();return h>=4&&h<7}) },
  { id:"weekend",       ic:"calendar",   t:"Weekend Warrior",   d:"Read on a Saturday and Sunday",  test:(s)=>{const ds=new Set(s.sessions.map(x=>new Date(x.date+"T12:00").getDay()));return ds.has(0)&&ds.has(6)} },
  { id:"streak7",       ic:"flame",      t:"One Week Ritual",   d:"7-day reading streak",           test:(s,d)=>d.bestStreak>=7 },
  { id:"streak30",      ic:"award",      t:"30-Day Streak",     d:"30-day reading streak",          test:(s,d)=>d.bestStreak>=30 },
  { id:"finisher",      ic:"flag",       t:"The Finisher",      d:"Finish your first book",         test:(s,d)=>d.finished>=1 },
  { id:"five_books",    ic:"archive",    t:"Handful of Worlds", d:"Finish 5 books",                 test:(s,d)=>d.finished>=5 },
  { id:"marathon",      ic:"zap",        t:"Book Marathon",     d:"A single session over 90 min",   test:(s)=>s.sessions.some(x=>x.minutes>=90) },
  { id:"explorer",      ic:"compass",    t:"Genre Explorer",    d:"Finish books in 3 genres",       test:(s,d)=>d.genresFinished>=3 },
  { id:"annotator",     ic:"pen",        t:"Annotation Master", d:"Save 10 notes or quotes",        test:(s)=>s.journal.length>=10 },
  { id:"critic",        ic:"star",       t:"The Critic",        d:"Rate and review 3 books",        test:(s)=>s.books.filter(b=>b.rating&&b.review).length>=3 },
  { id:"collector",     ic:"book_open",  t:"The Collector",     d:"20 books in your library",       test:(s)=>s.books.length>=20 },
];

/* ---------------- profile avatars (same art as the logo, recolored) ---------------- */
const AVATAR_PRESETS = [
  { id: "classic", label: "Classic", file: "icons/avatar-classic.png" },
  { id: "mustard", label: "Mustard", file: "icons/avatar-mustard.png" },
  { id: "ochre",   label: "Ochre",   file: "icons/avatar-ochre.png" },
  { id: "ember",   label: "Ember",   file: "icons/avatar-ember.png" },
  { id: "teal",    label: "Teal",    file: "icons/avatar-teal.png" },
];
const SESSION_MOODS = [
  ["😌","calm"],["🤯","mind-blown"],["🥹","moved"],["😱","gripped"],["😴","sleepy"],["🤔","thoughtful"]
];

/* ================================================================
   JOURNAL — prompt sets per reflection kind
================================================================ */
const JOURNAL_KINDS = [
  { id: "reflection", label: "Reflection", ic: "feather",   hint: "How did this book make you feel — honestly?" },
  { id: "character",  label: "Character",  ic: "eye",       hint: "Someone in these pages who stayed with you." },
  { id: "analysis",   label: "Analysis",   ic: "compass",   hint: "Engage with the craft, the argument, the structure." },
  { id: "quote",      label: "Quote",      ic: "bookmark",  hint: "The line you'd copy into a notebook." },
];

const EMOTIONAL_PROMPTS = [
  "How did this book make you feel — honestly?",
  "What was happening in your life while you read this?",
  "Where did you have to put the book down and just sit with it?",
  "What feeling did the ending leave you with?",
  "If this book were a season, which one — and why?",
];

const CHARACTER_PROMPTS = [
  "Which character felt like someone you know?",
  "Whose choices would you have made differently?",
  "Who did you find yourself rooting for, and why?",
  "Which character's flaws felt a little too familiar?",
  "Who changed the most — and did you believe it?",
];

const ANALYSIS_PROMPTS = [
  "What is this book really about, beneath the plot?",
  "How does the structure or pacing serve the theme?",
  "What would you argue with a critic — or the author — about?",
  "What technique did the author use that stood out to you?",
  "What does this book borrow from, or push back against?",
];
