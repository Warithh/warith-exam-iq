function byId(id){ return document.getElementById(id); }

let pActive = [];
let pAnswers = [];
let pIdx = 0;
let pTimer = null;
let pRemain = 0;
let pSubmitted = false;
const trCache = typeof TRANSLATIONS_MAP !== "undefined" ? { ...TRANSLATIONS_MAP } : {};
let trNormalizedCache = null;
const TRANSLATION_HINTS = {
  "could you": "هل يمكنك",
  "can you": "هل تستطيع",
  "can i": "هل يمكنني",
  "may i": "هل يسمح لي",
  "would you mind": "هل تمانع",
  "why don't we": "لماذا لا",
  "let's": "دعنا",
  "how about": "ما رأيك بـ",
  "what about": "ماذا عن",
  "i think": "أعتقد",
  "in my opinion": "في رأيي",
  "you should": "ينبغي أن",
  "if i were you": "لو كنت مكانك",
  "i'm sorry": "أنا آسف",
  "i am sorry": "أنا آسف",
  "thank you": "شكرا لك",
  "never mind": "لا بأس",
  "don't worry": "لا تقلق",
  "be careful": "كن حذرا",
  "look out": "انتبه"
};
const FUNCTION_OPTION_MAP = {
  "to apologize": "للاعتذار",
  "to agree": "للموافقة",
  "to disagree": "لعدم الموافقة",
  "to suggest": "للاقتراح",
  "to request": "للطلب",
  "to advise": "للنصيحة",
  "to warn": "للتحذير",
  "to express sympathy": "للتعاطف",
  "to express surprise": "للتعبير عن الدهشة",
  "to express gratitude": "للتعبير عن الشكر",
  "to blame": "للّوم",
  "to encourage": "للتشجيع",
  "to invite": "للدعوة",
  "to congratulate": "للتهنئة"
};
const TEMPLATE_TRANSLATION_RULES = [
  { re: /^what is\s+(.+)\??$/i, out: (m) => `ما هو ${m[1]}؟` },
  { re: /^what are\s+(.+)\??$/i, out: (m) => `ما هي ${m[1]}؟` },
  { re: /^where\s+(.+)\??$/i, out: (m) => `أين ${m[1]}؟` },
  { re: /^when\s+(.+)\??$/i, out: (m) => `متى ${m[1]}؟` },
  { re: /^why\s+(.+)\??$/i, out: (m) => `لماذا ${m[1]}؟` },
  { re: /^who\s+(.+)\??$/i, out: (m) => `من ${m[1]}؟` },
  { re: /^how\s+(.+)\??$/i, out: (m) => `كيف ${m[1]}؟` },
  { re: /^which of the following\s+(.+)\??$/i, out: (m) => `أي مما يلي ${m[1]}؟` },
  { re: /^could you\s+(.+)\??$/i, out: (m) => `هل يمكنك ${m[1]}؟` },
  { re: /^can you\s+(.+)\??$/i, out: (m) => `هل تستطيع ${m[1]}؟` },
  { re: /^can i\s+(.+)\??$/i, out: (m) => `هل يمكنني ${m[1]}؟` },
  { re: /^may i\s+(.+)\??$/i, out: (m) => `هل يسمح لي أن ${m[1]}؟` },
  { re: /^would you mind\s+(.+)$/i, out: (m) => `هل تمانع ${m[1]}؟` },
  { re: /^why don't we\s+(.+)\??$/i, out: (m) => `لماذا لا ${m[1]}؟` },
  { re: /^how about\s+(.+)\??$/i, out: (m) => `ما رأيك بـ ${m[1]}؟` },
  { re: /^what about\s+(.+)\??$/i, out: (m) => `ماذا عن ${m[1]}؟` },
  { re: /^let's\s+(.+)$/i, out: (m) => `دعنا ${m[1]}` },
  { re: /^in my opinion[,]?\s*(.+)$/i, out: (m) => `في رأيي ${m[1]}` },
  { re: /^i think\s+(.+)$/i, out: (m) => `أعتقد أن ${m[1]}` },
  { re: /^you should\s+(.+)$/i, out: (m) => `ينبغي أن ${m[1]}` },
  { re: /^if i were you[,]?\s*i would\s+(.+)$/i, out: (m) => `لو كنت مكانك لفعلت ${m[1]}` },
  { re: /^i'?m sorry[,]?\s*(.+)?$/i, out: (m) => `أنا آسف${m[1] ? `، ${m[1]}` : ""}` },
  { re: /^thank you[,]?\s*(.+)?$/i, out: (m) => `شكرا لك${m[1] ? `، ${m[1]}` : ""}` }
];

function normalizeForLookup(value){
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[“”]/g, "\"")
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function ensureNormalizedTranslationCache(){
  if(trNormalizedCache) return;
  trNormalizedCache = {};
  for(const [k, v] of Object.entries(trCache)){
    const nk = normalizeForLookup(k);
    if(nk && typeof trNormalizedCache[nk] === "undefined"){
      trNormalizedCache[nk] = v;
    }
  }
}

function tr(text){
  if(!text) return "";
  if(typeof trCache[text] !== "undefined"){
    const exact = sanitizeTranslation(text, trCache[text]);
    if(exact) return exact;
  }
  ensureNormalizedTranslationCache();
  const normalized = normalizeForLookup(text);
  if(normalized && typeof trNormalizedCache[normalized] !== "undefined"){
    const fuzzy = sanitizeTranslation(text, trNormalizedCache[normalized]);
    if(fuzzy) return fuzzy;
  }
  const helper = helperTranslate(text);
  return helper || text;
}

function trOnly(text){
  if(!text) return "";
  const translated = tr(text);
  if(!translated) return "";
  return translated === text ? "" : translated;
}

function helperTranslate(text){
  const raw = String(text || "").trim();
  if(!raw) return "";
  const lower = normalizeForLookup(raw);
  const low = lower.replace(/\./g, "");

  if(typeof FUNCTION_OPTION_MAP[low] !== "undefined"){
    return FUNCTION_OPTION_MAP[low];
  }

  for(const rule of TEMPLATE_TRANSLATION_RULES){
    const m = raw.match(rule.re);
    if(m){
      const translated = rule.out(m).trim();
      if(translated) return translated;
    }
  }

  // Dialogue support: "Speaker: sentence..."
  if(raw.includes(":")){
    const parts = raw.split(":");
    const speaker = (parts.shift() || "").trim();
    const rest = parts.join(":").trim();
    const translatedRest = helperTranslate(rest);
    if(translatedRest) return `${speaker}: ${translatedRest}`;
  }

  for(const [k, ar] of Object.entries(TRANSLATION_HINTS)){
    if(lower === k) return ar;
  }
  let replaced = raw;
  let changed = false;
  for(const [k, ar] of Object.entries(TRANSLATION_HINTS)){
    if(lower.includes(k)){
      const next = replaced.replace(new RegExp(k, "ig"), ar);
      if(next !== replaced){
        replaced = next;
        changed = true;
      }
    }
  }
  if(changed) return replaced;

  return "";
}

function sanitizeTranslation(source, candidate){
  const src = String(source || "").trim();
  const c = String(candidate || "").trim();
  if(!c) return "";
  if(c === src) return "";
  if(/[�]/.test(c)) return "";
  const low = c.toLowerCase();
  if(low.includes("saadinelt") || low.includes("uni0")) return "";
  if(c.includes("????")) return "";
  const arabicCount = (c.match(/[\u0600-\u06ff]/g) || []).length;
  const latinCount = (c.match(/[A-Za-z]/g) || []).length;
  // Reject mostly-English noisy outputs when Arabic translation is expected.
  if(arabicCount === 0 && latinCount > 0) return "";
  if(arabicCount < 3 && latinCount > 22) return "";
  if(c.length > 1800) return "";
  return c;
}

async function trAsync(text){
  if(!text) return "";
  return tr(text);
}

function hydrateTranslationCache(){
  // Offline-safe: rely on bundled translations.js only.
}

const EXTRA_PASSAGES = [
  {
    id: "rabbit-extra",
    title: "The Rabbit",
    source: "extra-passage",
    text: "A rabbit was very popular with other animals, who all claimed to be her friends.\nBut one day, she heard the hunting dogs approaching and hoped to escape with help from her friends.\nShe first asked the horse to carry her away, but he refused because he had important work for his master.\nThen she asked the bull to drive the dogs away with his horns, but he also refused.\nThe goat did not help because he feared his back might be harmed.\nThe sheep refused and said dogs might eat both sheep and rabbits.\nAs a final hope, she asked the calf, but he refused too because he did not want responsibility.\nWhen the dogs came near, the rabbit had to run quickly and she luckily escaped.",
    qmatch: ["rabbit", "extra"],
    questions: [
      {
        id: "rabbit-extra-1",
        qno: 1,
        question: "Why did the horse refuse to help the rabbit?",
        options: [
          "He was afraid of the hunting dog",
          "He had important tasks for his master",
          "He was too tired to help",
          "He did not like the rabbit"
        ],
        answer: 1,
        section: "reading",
        topic: "rabbit-extra"
      },
      {
        id: "rabbit-extra-2",
        qno: 2,
        question: "Why did the bull refuse to help the rabbit?",
        options: [
          "He was too small to fight the dogs",
          "He did not have horns",
          "He could not repel the hunting dogs",
          "He was busy eating grass"
        ],
        answer: 2,
        section: "reading",
        topic: "rabbit-extra"
      },
      {
        id: "rabbit-extra-3",
        qno: 3,
        question: "Why did not the goat help the rabbit?",
        options: [
          "He was afraid his back might be harmed",
          "He did not like the rabbit",
          "He was too busy",
          "He was afraid of the dogs"
        ],
        answer: 0,
        section: "reading",
        topic: "rabbit-extra"
      },
      {
        id: "rabbit-extra-4",
        qno: 4,
        question: "Why did the sheep refuse to help the rabbit?",
        options: [
          "He was afraid the dogs would eat him and the rabbit",
          "He did not like the rabbit",
          "He was too busy",
          "He was afraid of the horse"
        ],
        answer: 0,
        section: "reading",
        topic: "rabbit-extra"
      },
      {
        id: "rabbit-extra-5",
        qno: 5,
        question: "Why did the calf refuse to help the rabbit?",
        options: [
          "He did not like taking responsibility",
          "He was in danger as well",
          "He hates the rabbit",
          "He was on a trip"
        ],
        answer: 0,
        section: "reading",
        topic: "rabbit-extra"
      }
    ]
  },
  {
    id: "air-pollution-extra",
    title: "Air Pollution",
    source: "extra-passage",
    text: "Air pollution is a major problem all over the world today.\nThe single biggest contributor is the motor vehicle.\nOther human sources include factories, power stations, mining, building, and burning fossil fuels.\nNatural sources such as volcanoes and forest fires also pollute the air.\nHowever, the increasing number of motor vehicles in major cities causes the most damage.\nStudies found that tiny particles in polluted air are strongly linked to serious illnesses.\nA Cairo study linked fine particles to higher risks of heart attacks and lung cancer.\nA Canadian study found children near busy roads are more likely to develop asthma.\nTherefore, reducing air pollution is necessary for children and future generations.",
    qmatch: ["air pollution", "extra"],
    questions: [
      {
        id: "air-pollution-extra-1",
        qno: 1,
        question: "What is the main cause of air pollution in the passage?",
        options: ["Motor vehicles", "Children toys", "Street lights", "School buses only"],
        answer: 0,
        section: "reading",
        topic: "air-pollution-extra"
      },
      {
        id: "air-pollution-extra-2",
        qno: 2,
        question: "What are two natural sources of air pollution?",
        options: ["Motors and fuel", "Volcanoes and forest fires", "Factories and mines", "Cars and buses"],
        answer: 1,
        section: "reading",
        topic: "air-pollution-extra"
      },
      {
        id: "air-pollution-extra-3",
        qno: 3,
        question: "Which cities are listed among the most polluted?",
        options: [
          "London, Paris, Madrid, Rome",
          "Beijing, Mexico City, Athens, Moscow, Mumbai",
          "Baghdad, Amman, Cairo, Beirut",
          "Tokyo, Seoul, Sydney, Ottawa"
        ],
        answer: 1,
        section: "reading",
        topic: "air-pollution-extra"
      },
      {
        id: "air-pollution-extra-4",
        qno: 4,
        question: "Where was the first health study mentioned done?",
        options: ["Cairo", "Canada", "Mexico", "Athens"],
        answer: 0,
        section: "reading",
        topic: "air-pollution-extra"
      },
      {
        id: "air-pollution-extra-5",
        qno: 5,
        question: "What health problems did the first study emphasize?",
        options: ["Cold and flu", "Heart attacks and lung cancer", "Back pain", "Diabetes only"],
        answer: 1,
        section: "reading",
        topic: "air-pollution-extra"
      },
      {
        id: "air-pollution-extra-6",
        qno: 6,
        question: "Where was the second study done?",
        options: ["Cairo", "Canada", "Russia", "India"],
        answer: 1,
        section: "reading",
        topic: "air-pollution-extra"
      },
      {
        id: "air-pollution-extra-7",
        qno: 7,
        question: "What disease risk was highlighted in children near busy roads?",
        options: ["Back pain", "Asthma and similar diseases", "Headache only", "Heart surgery"],
        answer: 1,
        section: "reading",
        topic: "air-pollution-extra"
      },
      {
        id: "air-pollution-extra-8",
        qno: 8,
        question: "Why is reducing air pollution important?",
        options: ["To increase sickness", "For children and future generations", "To reduce schools", "To stop transport"],
        answer: 1,
        section: "reading",
        topic: "air-pollution-extra"
      }
    ]
  },
  {
    id: "oil-painting-extra",
    title: "Oil Painting",
    source: "extra-passage",
    text: "Artists can choose from many types of paint.\nOil paint has been used for thousands of years.\nIt is made by combining dry colored powder with oil to create a smooth paint.\nHistorically, some oils came from walnuts or poppies.\nArtists often painted in layers, creating shades, light, and shadow.\nThese layers made people and objects look more realistic.\nJan van Eyck was a famous painter known for this layered oil technique.\nToday acrylic paint is also popular because it dries faster and is easier to paint over.",
    qmatch: ["oil painting", "extra"],
    questions: [
      {
        id: "oil-painting-extra-1",
        qno: 1,
        question: "How is oil paint made?",
        options: [
          "By mixing water with colored powder",
          "By combining dry colored powder with oil",
          "By blending powder with vinegar",
          "By melting wax with oil"
        ],
        answer: 1,
        section: "reading",
        topic: "oil-painting-extra"
      },
      {
        id: "oil-painting-extra-2",
        qno: 2,
        question: "Who was famous for using oil paints in layers?",
        options: ["Pablo Picasso", "Jan van Eyck", "Leonardo da Vinci", "Vincent van Gogh"],
        answer: 1,
        section: "reading",
        topic: "oil-painting-extra"
      },
      {
        id: "oil-painting-extra-3",
        qno: 3,
        question: "What did the layers add to the painting subjects?",
        options: ["Motion", "Reality", "Abstractness", "Humor"],
        answer: 1,
        section: "reading",
        topic: "oil-painting-extra"
      },
      {
        id: "oil-painting-extra-4",
        qno: 4,
        question: "Why was oil paint favored in the past?",
        options: ["It was cheap", "It dried very quickly", "It helped create light and shadows", "It was easily washable"],
        answer: 2,
        section: "reading",
        topic: "oil-painting-extra"
      },
      {
        id: "oil-painting-extra-5",
        qno: 5,
        question: "How can someone recognize an oil painting?",
        options: ["By quick drying", "By no colors", "By shadows made by oil paint", "By using only poppy oil"],
        answer: 2,
        section: "reading",
        topic: "oil-painting-extra"
      },
      {
        id: "oil-painting-extra-6",
        qno: 6,
        question: "What oils were historically used for oil painting?",
        options: ["Olive oil", "Sunflower oil", "Walnut or poppy oil", "Coconut oil"],
        answer: 2,
        section: "reading",
        topic: "oil-painting-extra"
      },
      {
        id: "oil-painting-extra-7",
        qno: 7,
        question: "How did people get oil for paintings historically?",
        options: ["From walnuts or poppies", "From petroleum or coal", "From olives or sunflower only", "From flax or hemp only"],
        answer: 0,
        section: "reading",
        topic: "oil-painting-extra"
      },
      {
        id: "oil-painting-extra-8",
        qno: 8,
        question: "What ingredient is combined with colored powder to make oil paint?",
        options: ["Water", "Acrylic", "Oil", "Alcohol"],
        answer: 2,
        section: "reading",
        topic: "oil-painting-extra"
      },
      {
        id: "oil-painting-extra-9",
        qno: 9,
        question: "How did artists create different shades in oil painting?",
        options: ["Single layer only", "By mixing water", "By painting in layers", "By using dry powder only"],
        answer: 2,
        section: "reading",
        topic: "oil-painting-extra"
      },
      {
        id: "oil-painting-extra-10",
        qno: 10,
        question: "What was one result of painting in layers?",
        options: ["Dull paintings", "Bright and rich colors", "Flat one-dimensional look", "Very fast drying"],
        answer: 1,
        section: "reading",
        topic: "oil-painting-extra"
      }
    ]
  },
  {
    id: "maryam-sami-extra",
    title: "Sami and Maryam",
    source: "extra-passage",
    text: "Sami and Maryam are two young Iraqi students at the University of Baghdad.\nThey had a common vision to make their city cleaner and more beautiful.\nThey started a group to clean streets and schools in Baghdad.\nTheir work gave them joy and motivation.\nMore young men joined them, which encouraged them further.\nAlthough they faced logistical difficulties and doubt from others, they remained committed.\nTheir efforts improved alleys and schools and made the city look better.\nTheir initiative inspired others and proved that youth action can create positive change.",
    qmatch: ["sami and maryam", "extra"],
    questions: [
      {
        id: "maryam-sami-extra-1",
        qno: 1,
        question: "What was Sami and Maryam's common vision?",
        options: [
          "To travel abroad",
          "To become famous",
          "To make their city cleaner and more beautiful",
          "To earn money"
        ],
        answer: 2,
        section: "reading",
        topic: "maryam-sami-extra"
      },
      {
        id: "maryam-sami-extra-2",
        qno: 2,
        question: "What did Sami and Maryam share?",
        options: ["A common house", "A common vision", "A common shop", "A common field of study"],
        answer: 1,
        section: "reading",
        topic: "maryam-sami-extra"
      },
      {
        id: "maryam-sami-extra-3",
        qno: 3,
        question: "What impact did the group's efforts have on society?",
        options: ["Negative impact", "Positive impact", "No impact", "Destructive impact"],
        answer: 1,
        section: "reading",
        topic: "maryam-sami-extra"
      },
      {
        id: "maryam-sami-extra-4",
        qno: 4,
        question: "What did clean alleys and schools promote?",
        options: ["Overall beautiful appeal", "Pollution", "Chaos", "Illness"],
        answer: 0,
        section: "reading",
        topic: "maryam-sami-extra"
      },
      {
        id: "maryam-sami-extra-5",
        qno: 5,
        question: "What initiative did they take?",
        options: [
          "They opened a private company",
          "They established a cleaning group",
          "They joined a political party",
          "They started a business project"
        ],
        answer: 1,
        section: "reading",
        topic: "maryam-sami-extra"
      },
      {
        id: "maryam-sami-extra-6",
        qno: 6,
        question: "How did Sami and Maryam feel about positively impacting society?",
        options: ["Angry", "Confused", "Joyful and motivated", "Indifferent"],
        answer: 2,
        section: "reading",
        topic: "maryam-sami-extra"
      },
      {
        id: "maryam-sami-extra-7",
        qno: 7,
        question: "What made them even happier?",
        options: ["Receiving money", "Traveling abroad", "More young men joining them", "Winning a competition"],
        answer: 2,
        section: "reading",
        topic: "maryam-sami-extra"
      },
      {
        id: "maryam-sami-extra-8",
        qno: 8,
        question: "What challenges did they face?",
        options: [
          "Financial bankruptcy only",
          "Logistical difficulties and doubt from others",
          "Lack of education",
          "Political problems"
        ],
        answer: 1,
        section: "reading",
        topic: "maryam-sami-extra"
      },
      {
        id: "maryam-sami-extra-9",
        qno: 9,
        question: "What was one result of their efforts?",
        options: [
          "The city became more polluted",
          "Clean alleys and schools began to appear",
          "They stopped their mission",
          "People criticized them"
        ],
        answer: 1,
        section: "reading",
        topic: "maryam-sami-extra"
      },
      {
        id: "maryam-sami-extra-10",
        qno: 10,
        question: "What is the main idea of the passage?",
        options: [
          "University life in Iraq",
          "The importance of money",
          "The power of youth initiative in creating positive change",
          "Problems in Baghdad"
        ],
        answer: 2,
        section: "reading",
        topic: "maryam-sami-extra"
      }
    ]
  }
];

const PASSAGE_SOURCE = (typeof PASSAGES_FULL !== "undefined" && Array.isArray(PASSAGES_FULL) && PASSAGES_FULL.length)
  ? [...PASSAGES_FULL, ...EXTRA_PASSAGES]
  : [...PASSAGES, ...EXTRA_PASSAGES];

const PASSAGE_AR_SUMMARY = {
  "marshes": "تتناول القطعة الأهوار العراقية باعتبارها نظاما بيئيا مهما في الشرق الأوسط. توضح أن الماء عنصر أساسي للحفاظ على السلسلة الغذائية والتنوع الحيوي، وأن نقصه يؤدي إلى تراجع الأنواع الطبيعية ومصادر الغذاء. كما تشير إلى أن مساحة الأهوار انخفضت بشدة بعد التجفيف في التسعينيات.\n\nبعد عام 2003 بدأت جهود الإحياء بدعم حكومي ودولي، مع أمل باستعادة جزء كبير من المساحات الأصلية. وتذكر أيضا نمط حياة السكان المحليين الذين يعتمدون على القصب والصيد والزراعة.",
  "taj-mahal": "تشرح القطعة أن تاج محل ضريح شهير في أغرا بالهند قرب نهر يامونا، وأنه من أبرز المعالم المعمارية في العالم. تصف القبة البيضاء الكبيرة والزخارف الداخلية والحدائق الجميلة المحيطة به.\n\nبدأ البناء سنة 1632 واكتمل سنة 1653 باستخدام الرخام الأبيض ومواد من مناطق مختلفة. بُني تخليدا لزوجة شاه جهان، وتعرض لاحقا لأضرار ثم جرت محاولات للحفاظ عليه. لذلك يعد من عجائب الدنيا الحديثة وموقعا تراثيا عالميا.",
  "sali": "تدور القطعة حول سالي، وهي فتاة طيبة كانت تساعد الناس والحيوانات في قريتها. عثرت على طائر جريح فحملته إلى بيتها واعتنت به حتى تعافى.\n\nعندما أصبح الطائر قادرا على الطيران، أطلقته بحرية رغم تعلقها به. الرسالة أن الرحمة والتضحية تؤثر في المجتمع وتدفع الآخرين لفعل الخير.",
  "robots": "تعرف القطعة الروبوت بأنه آلة تنفذ أوامر الحاسوب بدقة، وتمتاز بأنها لا تتعب أثناء العمل. وتوضح أن الروبوتات تستخدم في مجالات مهمة مثل الصناعة والتنظيف واستكشاف الأماكن الخطرة.\n\nكما تشير إلى أن فكرة الروبوت قديمة، لكن أول روبوت عملي ظهر عام 1961 في صناعة السيارات. وتتوقع القطعة زيادة دور الروبوتات مستقبلا في خدمة الإنسان في الأعمال الصعبة والخطرة.",
  "missing-boy": "تحكي القطعة قصة الطفل علي الذي ضاع على الشاطئ بعدما ابتعد عن والديه. تصف خوفه الشديد وقلق والديه أثناء البحث عنه بين الناس.\n\nلاحظ شخص غريب الطفل وهدأه ثم أخبر المنقذ، فتم إعلان وصف الطفل عبر مكبر الصوت حتى تم العثور عليه. الفكرة الأساسية هي أهمية الانتباه للأطفال وسرعة التصرف والتعاون المجتمعي.",
  "the-ghost": "تتحدث القطعة عن مزرعة ظن الناس أنها مسكونة لأن العمل كان ينجز ليلا دون رؤية العامل. ومع تكرار هذه الحوادث انتشرت قصة الشبح بين أهل القرية.\n\nلاحقا انكشف السر: الشخص الذي كان يعمل ليلا هو الأخ الثالث إريك المختبئ منذ الحرب. بذلك توضح القطعة كيف تصنع الشائعات صورة خاطئة عندما تغيب الحقيقة.",
  "the-weather": "توضح القطعة أن العواصف المحلية الشديدة قد تتشكل بسرعة ويصعب توقعها بالطرق التقليدية. لذلك كانت النماذج القديمة محدودة في التنبؤ الدقيق قصير المدى.\n\nمع تطور الرادار والأقمار الصناعية والحواسيب، أصبح التنبؤ الفوري (Nowcasting) أكثر دقة. الهدف هو الإنذار المبكر وتقليل خسائر الطقس الخطير.",
  "fatima": "تسرد القطعة قصة فاطمة الأرملة التي عملت بجد لتربية أبنائها رغم الصعوبات. كانت تؤمن أن التعليم هو طريق النجاح الحقيقي.\n\nبدعمها المستمر، اتجه ابنها زكي إلى الطب وابنتها هالة إلى الهندسة. الرسالة أن الإصرار والتضحية يمكن أن يغيّرا مستقبل الأسرة بالكامل.",
  "wolverine": "تقدم القطعة معلومات عن حيوان الولفرين من حيث شكله وبيئته وسلوكه الغذائي. يعيش غالبا في المناطق الجبلية الباردة ويتحرك لمسافات طويلة بحثا عن الطعام.\n\nتوضح القطعة أنه مهم بيئيا لأنه يساهم في تنظيف الطبيعة من البقايا. كما تؤكد أن دراسته صعبة لندرته وتخفيه، لذلك تركز الجهود على حماية موائله.",
  "economics": "تشرح القطعة الاقتصاد كنظام ينظم الإنتاج والتوزيع والاستهلاك في المجتمع. وتوضح تأثير السياسات الحكومية والتكنولوجيا والتجارة العالمية في النشاط الاقتصادي.\n\nتتناول أيضا التضخم وتأثيره في القوة الشرائية، وأهمية الاستدامة البيئية. كما تشير إلى دور التكنولوجيا المالية في رفع الكفاءة مع تحديات تنظيمية جديدة.",
  "fame-hotel": "تصف القطعة فندقا يقدم تجربة حياة المشاهير، حيث تُصمم كل غرفة على نمط شخصية معروفة. الفكرة أن يعيش الزائر تفاصيل شخصية مشهورة بشكل تفاعلي.\n\nتذكر القطعة أن الفندق يضم غرفا بأسماء فنانين وكتاب وعلماء ورياضيين، مع خطط للتوسع في مدن أخرى.",
  "dog-breed": "توضح القطعة أن سلالات الكلاب كثيرة ومتنوعة في الشكل والحجم والسلوك. وتشرح أن السلالة تعني عائلة لها صفات مشتركة بين الكلاب.\n\nكما تشرح الكلب المختلط (mutt) الناتج عن سلالتين مختلفتين، وأنه قد يحمل صفات من الطرفين. الفكرة أن تنوع السلالات يعطي خصائص مختلفة لكل نوع.",
  "weather-forecast": "تشرح القطعة دور خبراء الأرصاد في جمع بيانات الطقس من أدوات الرصد والأقمار الصناعية. ثم تُحلل البيانات لإنتاج توقعات عن المطر والرياح ودرجات الحرارة.\n\nوتوضح أهمية خرائط الطقس في تحذير الناس من الظواهر الخطرة والاستعداد المبكر. مع ذلك قد تحدث أخطاء أحيانا بسبب تغير الطقس السريع.",
  "immigrants-to-america": "تتناول القطعة دور المهاجرين في بناء المجتمع الأمريكي عبر مساهمات اقتصادية وثقافية وعلمية. كما تعرض وجود قوانين هجرة كانت تميز ضد بعض الجنسيات.\n\nتوضح موقف كينيدي الداعي لقوانين أكثر عدلا، وتؤكد أن العدالة في الهجرة تقوي المجتمع وتدعم التقدم.",
  "obesity": "تشرح القطعة السمنة كحالة صحية تنتج عن تراكم الدهون بشكل مضر. وتربطها بمخاطر مثل أمراض القلب والسكري ومشكلات التنفس وبعض أنواع السرطان.\n\nتوضح أن العلاج يبدأ بتنظيم الغذاء والنشاط البدني، وقد تُستخدم حلول طبية إضافية في الحالات الشديدة. الرسالة الأساسية: الوقاية ونمط الحياة الصحي هما المفتاح.",
  "rabbit-extra": "تحكي القطعة قصة أرنب اعتقدت أن الجميع أصدقاؤها، لكنها اكتشفت العكس وقت الخطر. طلبت المساعدة من الحصان والثور والماعز والخروف ثم العجل، لكن الجميع رفضوا بحجج مختلفة.\n\nفي النهاية اعتمدت على نفسها وركضت حتى نجت. الفكرة الأساسية: الصديق الحقيقي يظهر وقت الشدة، وأن الاعتماد على النفس ضرورة عندما يتخلى الآخرون.",
  "air-pollution-extra": "توضح القطعة أن تلوث الهواء مشكلة عالمية كبيرة، وأن المركبات هي المصدر الأكبر، مع وجود مصادر أخرى بشرية وطبيعية. وتؤكد أن المدن الكبرى تعاني أكثر بسبب كثافة المرور.\n\nتشير الدراسات المذكورة إلى علاقة مباشرة بين الجسيمات الدقيقة وأمراض خطيرة، خاصة لدى الأطفال القريبين من الطرق المزدحمة. الرسالة: يجب خفض التلوث لحماية صحة الناس والأجيال القادمة.",
  "oil-painting-extra": "تشرح القطعة أن الرسم الزيتي يتم بخلط مسحوق الألوان الجاف مع الزيت. وكان الفنانون قديما يستخدمون الرسم بطبقات لإظهار الظل والضوء وإعطاء واقعية أكبر للعمل الفني.\n\nتذكر القطعة الرسام جان فان آيك كمثال على هذا الأسلوب، وتقارن ذلك بالأكريليك الحديث الأسرع جفافا. الفكرة الأساسية: الطبقات في الرسم الزيتي تمنح عمقا بصريا وجمالا لونيا مميزا.",
  "maryam-sami-extra": "تتحدث القطعة عن سامي ومريم، طالبان عراقيان قررا إطلاق مبادرة لتنظيف شوارع ومدارس بغداد. رغم الصعوبات والتنظيم المعقد وتشكيك البعض، استمرا حتى ظهرت نتائج ملموسة.\n\nألهمت تجربتهما شبابا آخرين للمشاركة، وأثبتت أن مبادرات الشباب تستطيع صناعة تغيير إيجابي حقيقي في المجتمع."
};

function getPassageArabicText(p, fallbackText){
  const key = String(p.id || "");
  const manual = PASSAGE_AR_SUMMARY[key];
  if(manual) return manual;
  return fallbackText;
}

function cleanPassageTextForDisplay(rawText, title, passageId){
  let t = String(rawText || "");
  const id = String(passageId || "").toLowerCase();
  // Some source files contain unrelated intro blocks before the real passage text.
  if(id === "obesity"){
    const marker = "Obesity is a medical condition";
    const cutAt = t.indexOf(marker);
    if(cutAt > 0) t = t.slice(cutAt);
  }
  const titleNorm = String(title || "").toLowerCase().trim();
  const trTitleNorm = String(tr(title || "") || "").toLowerCase().trim();
  const lines = t.split("\n");
  const cleaned = [];
  for(const line of lines){
    const s = line.trim();
    if(!s) continue;
    const low = s.toLowerCase();
    if(low === "saadinelt") continue;
    if(low === titleNorm) continue;
    if(trTitleNorm && low === trTitleNorm) continue;
    if(/^[@#]?\s*saadinelt/i.test(s)) continue;
    if(/^[\u0600-\u06ff\ufb50-\ufdff\ufe70-\ufeff\s]+$/.test(s) && s.length <= 20) continue;
    cleaned.push(s);
  }
  return cleaned.join("\n");
}

function cleanArabicTranslationForDisplay(rawText, title){
  const t = String(rawText || "");
  const trTitleNorm = String(tr(title || "") || "").toLowerCase().trim();
  const lines = t.split("\n");
  const cleaned = [];
  for(const line of lines){
    const s = line.trim();
    if(!s) continue;
    const low = s.toLowerCase();
    if(low === "saadinelt") continue;
    if(low.includes("saadinelt")) continue;
    if(low.includes("com.saadinelt")) continue;
    if(trTitleNorm && low === trTitleNorm) continue;
    if(/^[@#]?\s*saadinelt/i.test(s)) continue;
    if(/^[\u0600-\u06ff\ufb50-\ufdff\ufe70-\ufeff\s]+$/.test(s) && s.length <= 20) continue;
    cleaned.push(s);
  }
  return cleaned.join("\n");
}

function reasonForPassageWrongAnswer(q){
  if(q?.reason) return String(q.reason);
  return "الإجابة الصحيحة مدعومة بمعلومة صريحة أو استنتاج مباشر من نص القطعة.";
}

function normText(s){
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function repairQuestionOptions(q){
  if(!Array.isArray(q.options) || q.options.length >= 4) return q;
  if(typeof ALL_BOOKLET_QUESTIONS === "undefined" || !Array.isArray(ALL_BOOKLET_QUESTIONS)) return q;
  const n = normText(q.question);
  if(!n) return q;
  const hit = ALL_BOOKLET_QUESTIONS.find(x => {
    if(!Array.isArray(x.options) || x.options.length !== 4) return false;
    const nx = normText(x.question);
    return nx === n || nx.includes(n) || n.includes(nx);
  });
  if(!hit) return q;
  return {
    ...q,
    options: hit.options,
    answer: Number.isInteger(q.answer) ? q.answer : hit.answer
  };
}

function sanitizePassageQuestion(p, q){
  if(!q || !Array.isArray(q.options) || q.options.length < 2) return null;
  const textBlob = `${q.question || ""} ${(q.options || []).join(" ")}`.toLowerCase();

  // Remove obvious cross-topic contamination from imported sources.
  if(String(p.id || "") === "missing-boy" && /wolverine/.test(textBlob)) return null;

  const repaired = repairQuestionOptions(q);
  const opts = Array.isArray(repaired.options)
    ? repaired.options.map((o) => String(o || "").trim()).filter(Boolean)
    : [];
  if(opts.length !== 4) return null;
  const cleaned = {
    ...repaired,
    question: String(repaired.question || "").trim(),
    options: opts
  };
  if(!Number.isInteger(cleaned.answer)) return null;
  if(cleaned.answer < 0 || cleaned.answer >= cleaned.options.length) return null;
  if(/(اﻟﺤﻠﻮل|answers?\s*:|@saadinelt|booklet key|https?:\/\/)/i.test(`${cleaned.question} ${cleaned.options.join(" ")}`)) return null;
  return cleaned;
}

function normalizePassageTitle(p){
  const id = String(p.id || "");
  if(id.includes("the-ghost")) return "The Ghost";
  if(id.includes("the-weather")) return "The Weather";
  if(id.includes("fatima")) return "Fatima";
  if(id.includes("obesity")) return "Obesity";
  if(id.includes("immigrants-to-america")) return "Immigrants to America";
  if(id.includes("wolverines")) return "Wolverines";
  if(id.includes("dog-breed")) return "Dog Breed";
  if(id.includes("fame-hotel")) return "Fame Hotel";
  if(id.includes("marsh")) return "Marshes";
  if(id.includes("lincoln")) return "Abraham Lincoln";
  return p.title || "Passage";
}

function cleanedPassages(){
  return PASSAGE_SOURCE
    .map(p => {
      const fixedQs = (p.questions || [])
        .map(q => sanitizePassageQuestion(p, q))
        .filter(Boolean);
      return {
        ...p,
        title: normalizePassageTitle(p),
        questions: fixedQs,
        question_count: fixedQs.length
      };
    })
    .filter(p => p.questions.length >= 1);
}

function populatePassageSelect(){
  const sel = byId("passageSelect");
  const list = cleanedPassages();
  sel.innerHTML = list.map((p, i) => `<option value="${p.id}" ${i === 0 ? "selected" : ""}>${p.title}</option>`).join("");
}

function pickPassageQuestions(matchTerms){
  const terms = matchTerms.map(t => t.toLowerCase());
  return KEYED_QUESTIONS.filter(q => {
    const txt = `${q.question} ${q.topic || ""}`.toLowerCase();
    return terms.some(t => txt.includes(t));
  });
}

function fmt(sec){
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function updatePTime(){
  byId("pTimerChip").textContent = `الوقت المتبقي: ${fmt(pRemain)}`;
  byId("pTimerDisplay").textContent = fmt(pRemain);
  byId("pTimerChip").classList.toggle("alert", pRemain <= 60 && pRemain > 0);
}

function stopPTimer(){
  if(pTimer){
    clearInterval(pTimer);
    pTimer = null;
  }
}

function startPTimer(mins){
  stopPTimer();
  pRemain = mins * 60;
  updatePTime();
  pTimer = setInterval(() => {
    pRemain--;
    updatePTime();
    if(pRemain <= 0){
      stopPTimer();
      if(!pSubmitted) submitPassageForm(true);
    }
  }, 1000);
}

function renderPassageCard(p){
  const tips = Array.isArray(p.memoryTips) ? p.memoryTips : (Array.isArray(p.memory) ? p.memory : []);
  const rawText = p.text || p.summary || "";
  const displayText = cleanPassageTextForDisplay(rawText, p.title, p.id);
  byId("passageFixed").innerHTML = `
    <h3>${p.title}</h3>
    <div class="qmeta">
      <span class="tag">${p.source || "booklet"}</span>
    </div>
    <p style="white-space:pre-wrap">${displayText}</p>
    <div class="out"><strong>الترجمة العربية:</strong><br><span id="pTextTr">...</span></div>
    ${tips.length ? `<ul>${tips.map(x => `<li>${x}</li>`).join("")}</ul>` : ""}
  `;
  fillPassageTranslation(rawText, p.title || "");
}

async function fillPassageTranslation(rawText, title){
  const t2 = byId("pTextTr");
  if(t2){
    const raw = await trAsync(rawText || "");
    const clean = cleanArabicTranslationForDisplay(raw, title);
    const currentPassage = cleanedPassages().find(x => (x.title || "") === title || (x.id || "") === (byId("passageSelect")?.value || ""));
    const finalText = getPassageArabicText(currentPassage || {}, clean);
    t2.textContent = finalText || "لا توجد ترجمة متاحة حاليا.";
  }
}

function renderPDots(){
  const root = byId("pNavDots");
  root.innerHTML = "";
  pActive.forEach((_, i) => {
    const b = document.createElement("button");
    b.className = "nav-dot";
    if(i === pIdx) b.classList.add("current");
    if(pAnswers[i] !== -1) b.classList.add("answered");
    b.textContent = String(i + 1);
    b.onclick = () => { pIdx = i; renderPCurrent(); };
    root.appendChild(b);
  });
}

function renderPCurrent(){
  if(!pActive.length) return;
  const q = pActive[pIdx];
  const answered = pAnswers.filter(v => v !== -1).length;
  byId("pProgressChip").textContent = `الإجابات: ${answered} / ${pActive.length}`;
  byId("pProgressText").textContent = `السؤال ${pIdx + 1} من ${pActive.length}`;
  byId("pProgressBar").style.width = `${Math.round((answered / pActive.length) * 100)}%`;
  byId("pPrevBtn").disabled = pIdx === 0;
  byId("pNextBtn").style.display = pIdx === pActive.length - 1 ? "none" : "inline-flex";
  // Keep finish available at any point, even with unanswered questions.
  byId("pFinishBtn").style.display = "inline-flex";

  byId("passageQuestionStage").innerHTML = `
    <article class="qcard">
      <div class="qhead">
        <span class="qnum">${pIdx + 1}</span>
        <div class="qtext">${q.question}<div class="muted" id="pqTrans"></div></div>
      </div>
      <div class="ops">
        ${q.options.map((op, i) => `
          <label>
            <input type="radio" name="pq" value="${i}" ${pAnswers[pIdx] === i ? "checked" : ""}/>
            ${op}<span class="muted js-pop-trans" data-op-idx="${i}" style="display:block"></span>
          </label>
        `).join("")}
      </div>
    </article>
  `;

  byId("passageQuestionStage").querySelectorAll('input[name="pq"]').forEach(el => {
    el.addEventListener("change", () => {
      pAnswers[pIdx] = Number(el.value);
      renderPDots();
      renderPCurrent();
    });
  });
  fillPassageQuestionTranslation(q);
  renderPDots();
}

async function fillPassageQuestionTranslation(q){
  const qNode = byId("pqTrans");
  if(qNode){
    const qTr = trOnly(q.question);
    qNode.textContent = qTr;
    qNode.style.display = qTr ? "block" : "none";
  }
  const opNodes = byId("passageQuestionStage").querySelectorAll(".js-pop-trans");
  for(const node of opNodes){
    const idx = Number(node.getAttribute("data-op-idx"));
    const opTr = trOnly(q.options[idx] || "");
    node.textContent = opTr;
    node.style.display = opTr ? "block" : "none";
  }
}

function startPassageForm(){
  const pid = byId("passageSelect").value;
  const p = cleanedPassages().find(x => x.id === pid);
  if(!p) return;
  renderPassageCard(p); // passage remains fixed

  pSubmitted = false;
  if(Array.isArray(p.questions) && p.questions.length){
    pActive = p.questions;
  } else {
    pActive = pickPassageQuestions(p.qmatch).slice(0, 10);
  }
  pActive = pActive.filter(q =>
    q &&
    Array.isArray(q.options) &&
    q.options.length === 4 &&
    Number.isInteger(q.answer) &&
    q.answer >= 0 &&
    q.answer < q.options.length
  );
  if(!pActive.length){
    byId("passageQuestionStage").innerHTML = `<div class="panel"><div class="section-title">لا توجد أسئلة صالحة لهذه القطعة حالياً.</div></div>`;
    byId("pNavDots").innerHTML = "";
    byId("pProgressChip").textContent = "الإجابات: 0 / 0";
    byId("pProgressText").textContent = "لا توجد أسئلة";
    byId("pProgressBar").style.width = "0%";
    stopPTimer();
    return;
  }
  pAnswers = new Array(pActive.length).fill(-1);
  pIdx = 0;
  byId("passageFormResult").innerHTML = "";
  byId("passageFormReport").innerHTML = "";
  renderPCurrent();
  startPTimer(Number(byId("passageMinutes").value || 15));
}

async function submitPassageForm(auto = false){
  if(pSubmitted || !pActive.length) return;
  pSubmitted = true;
  stopPTimer();
  let score = 0;
  let gradable = 0;
  const mistakes = [];
  for(let i = 0; i < pActive.length; i++){
    const q = pActive[i];
    if(!Number.isInteger(q.answer)){
      continue;
    }
    gradable++;
    if(pAnswers[i] === q.answer) score++;
    else mistakes.push({
      n: i + 1,
      q: q.question,
      your: pAnswers[i] === -1 ? "بدون إجابة" : q.options[pAnswers[i]],
      ok: q.options[q.answer],
      reason: reasonForPassageWrongAnswer(q),
      qAr: await trAsync(q.question),
      yourAr: pAnswers[i] === -1 ? "بدون إجابة" : await trAsync(q.options[pAnswers[i]]),
      okAr: await trAsync(q.options[q.answer]),
      reasonAr: await trAsync(reasonForPassageWrongAnswer(q))
    });
  }
  const pct = gradable ? Math.round((score / gradable) * 100) : 0;
  byId("passageFormResult").innerHTML = `
    <div class="score">
      <div class="main">${pct}%</div>
      <div class="sub">${auto ? "انتهى الوقت وتم التسليم" : "تم التسليم"}</div>
      <div class="stats">
        <div class="stat"><div class="n ok">${score}</div><div>صحيح</div></div>
        <div class="stat"><div class="n danger">${Math.max(gradable - score, 0)}</div><div>خاطئ/فارغ</div></div>
        <div class="stat"><div class="n">${gradable}</div><div>عدد الأسئلة المحتسبة</div></div>
      </div>
      <div class="muted" style="margin-top:8px">الأسئلة غير المحتسبة لا تدخل بالدرجة النهائية.</div>
    </div>
  `;
  if(!mistakes.length){
    byId("passageFormReport").innerHTML = `<div class="report"><h3>نتيجة ممتازة</h3><div class="ok">بدون أخطاء.</div></div>`;
    return;
  }
  byId("passageFormReport").innerHTML = `
    <div class="report">
      <h3>أخطاء فورمة القطعة</h3>
      ${mistakes.map(m => `
        <div class="report-item">
          <div class="q">س${m.n}: ${m.q}</div>
          <div class="muted">${m.qAr}</div>
          <div class="danger">إجابتك: ${m.your}</div>
          <div class="muted">${m.yourAr}</div>
          <div class="ok">الصحيح: ${m.ok}</div>
          <div class="muted">${m.okAr}</div>
          <div>السبب: ${m.reason}</div>
          <div class="muted">الترجمة: ${m.reasonAr}</div>
        </div>
      `).join("")}
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  hydrateTranslationCache();
  populatePassageSelect();
  byId("startPassageForm").addEventListener("click", startPassageForm);
  byId("pPrevBtn").addEventListener("click", () => { if(pIdx > 0){ pIdx--; renderPCurrent(); }});
  byId("pNextBtn").addEventListener("click", () => { if(pIdx < pActive.length - 1){ pIdx++; renderPCurrent(); }});
  byId("pFinishBtn").addEventListener("click", async () => { await submitPassageForm(false); });
  startPassageForm();
});
