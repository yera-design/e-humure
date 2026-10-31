var LANGUAGE_DEFAULT = "en";

var PHQ9_OPTIONS = [
  { value: 0, en: "Not at all", rw: "Nta nagato" },
  { value: 1, en: "Several days", rw: "Iminsi mike" },
  { value: 2, en: "More than half the days", rw: "Birenze iminsi myinshi iruta kimwe cya kabiri cy’ibyumweru bibiri bishize" },
  { value: 3, en: "Nearly every day", rw: "Hafi ya buri munsi" }
];

var PHQ9_STEM = {
  en: "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
  rw: "Mubyumweru 2 bishize, ni inshuro zingahe waba warabangamiwe na bimwe mubibazo bikurikira?"
};

// Order is fixed. The ninth question is the emergency one and scoring finds it by position.
var PHQ9_QUESTIONS = [
  { en: "Little interest or pleasure in doing things",
    rw: "Kudashishikarira ibyo ukora cyangwa ntushimishwe nabyo." },
  { en: "Feeling down, depressed, or hopeless",
    rw: "Kumva utameze neza, kugira agahinda gakabije cyangwa se kwiheba." },
  { en: "Trouble falling or staying asleep, or sleeping too much",
    rw: "Kubura ibitotsi cyangwa se kudashobora gusinzira, cyangwa se gusinzira bikabije." },
  { en: "Feeling tired or having little energy",
    rw: "Kumva unaniwe cyangwa ufite imbaraga nkeya cyane." },
  { en: "Poor appetite or overeating",
    rw: "Kumva udashaka kurya cyangwa kurya birenze urugero." },
  { en: "Feeling bad about yourself, or that you are a failure or have let yourself or your family down",
    rw: "Kwitekerezaho cyane kandi nabi, kumva nta kamaro ufite, kumva ntacyo wimariye cyangwa umariye umuryango wawe." },
  { en: "Trouble concentrating on things, such as reading the newspaper or watching television",
    rw: "Kunanirwa gukurikirina ibintu, harimo nko kunanirwa gusoma ibinyamakuru byanditse cyangwa se kureba inyerekamashusho (Tereviziyo)." },
  { en: "Moving or speaking so slowly that other people could have noticed, or the opposite, being so fidgety or restless that you have been moving around a lot more than usual",
    rw: "Kugenda cyangwa ukavuga buhoro kuburyo budasanzwe bikagaragarira abandi cyangwa se bitandukanye ukaba wihuta cyane, kubura umutuzo, ugahorana umuvuduko ukabije (udasanzwe) mu byo ukora." },
  { en: "Thoughts that you would be better off dead or of hurting yourself in some way",
    rw: "Gutekereza ko wakumva umeze neza wapfuye cyangwa se ukumva ushaka kwigirira nabi." }
];

var QUICK_STEM = {
  en: "During the past month, have you often been bothered by any of the following?",
  rw: "Mu kwezi gushize, waba warabangamiwe kenshi na bimwe mubibazo bikurikira?"
};

// Symptom wording copied from PHQ-9 items 2 and 1. Only the time window in the stem differs.
var QUICK_QUESTIONS = [
  { en: "Feeling down, depressed, or hopeless",
    rw: "Kumva utameze neza, kugira agahinda gakabije cyangwa se kwiheba." },
  { en: "Little interest or pleasure in doing things",
    rw: "Kudashishikarira ibyo ukora cyangwa ntushimishwe nabyo." }
];

var CONSENT_TEXT = {
  title: { en: "Before we start", rw: "Mbere yo gutangira" },
  body: {
    en: "I agree to answer a few short questions about how I have been feeling. My answers help the nurse decide if I need extra support with my mental health. I can stop at any time and my care will not change. No name is saved.",
    rw: "Nemeye gusubiza ibibazo bike bigufi ku bijyanye n’uko numva meze. Ibisubizo byanjye bifasha umuforomo kumenya niba nkeneye ubufasha bw’inyongera mu buzima bwo mu mutwe. Nshobora guhagarika igihe cyose, kandi ubuvuzi bwanjye ntibuzahinduka. Nta zina ribitswe."
  }
};

var UI_TEXT = {
  appName: { en: "e-Humure", rw: "e-Humure" },
  consentAgree: { en: "I agree", rw: "Ndabyemeye" },
  consentDecline: { en: "Not today", rw: "Si uyu munsi" },
  answerYes: { en: "Yes", rw: "Yego" },
  answerNo: { en: "No", rw: "Oya" },
  next: { en: "Next", rw: "Komeza" },
  back: { en: "Back", rw: "Subira inyuma" },
  seeResult: { en: "See result", rw: "Reba igisubizo" },
  startOver: { en: "Start a new screening", rw: "Tangira isuzuma rishya" },
  quickTitle: { en: "Quick questions", rw: "Ibibazo bibiri bigufi" },
  fullTitle: { en: "Full questionnaire", rw: "Ibibazo byose icyenda" },
  resultTitle: { en: "Result", rw: "Igisubizo" },
  totalLabel: { en: "PHQ-9 total", rw: "Igiteranyo cya PHQ-9" },
  outOf: { en: "out of 27", rw: "kuri 27" },
  riskWordLow: { en: "low risk", rw: "ibyago bike" },
  riskWordModerate: { en: "moderate risk", rw: "ibyago biringaniye" },
  riskWordHigh: { en: "high risk", rw: "ibyago byinshi" },
  declined: { en: "Screening stopped. Continue the normal chronic-disease visit.", rw: "Isuzuma rirahagaze. Komeza isura risanzwe ry’indwara idakira." },
  riskLow: { en: "Low risk. Screen again at the next routine visit.", rw: "Ibyago bike. Ongera usuzume mu isura risanzwe rikurikira." },
  riskModerate: { en: "Moderate risk. Add to the psychologist review list.", rw: "Ibyago biringaniye. Shyira uyu murwayi ku rutonde rw’abasuzumwa n’umuhanga mu buzima bwo mu mutwe." },
  riskHigh: { en: "High risk. Priority psychologist appointment.", rw: "Ibyago byinshi. Tegura gahunda yihutirwa yo kubonana n’umuhanga mu buzima bwo mu mutwe." },
  quickNegative: { en: "Both answers are No. Low risk, screen again at the next routine visit.", rw: "Ibisubizo byombi ni Oya. Ibyago bike, ongera usuzume mu isura risanzwe rikurikira." },
  quickPositive: { en: "At least one Yes. Continue to the full questionnaire.", rw: "Hari nibura igisubizo kimwe cya Yego. Komeza ku bibazo byose icyenda." },
  emergency: { en: "EMERGENCY: the patient reported thoughts of self-harm. Follow the emergency referral steps now and call the on-duty psychologist.", rw: "BYIHUTIRWA: umurwayi avuze ko afite ibitekerezo byo kwigirira nabi. Kurikiza inzira yihutirwa yo kohereza umurwayi ubu, kandi uhamagare umuhanga mu buzima bwo mu mutwe uri ku kazi." },
  notDiagnosis: { en: "This screen supports the nurse. It does not diagnose.", rw: "Iki gikoresho gifasha umuforomo. Ntigisuzuma indwara." },
  answerAll: { en: "Please answer every question first.", rw: "Banza usubize ibibazo byose." }
};

var RW_NEEDS_CLINICIAN_CHECK = [
  "QUICK_STEM", "CONSENT_TEXT.title", "CONSENT_TEXT.body",
  "UI_TEXT.declined", "UI_TEXT.riskLow", "UI_TEXT.riskModerate", "UI_TEXT.riskHigh",
  "UI_TEXT.quickNegative", "UI_TEXT.quickPositive", "UI_TEXT.emergency", "UI_TEXT.notDiagnosis"
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    LANGUAGE_DEFAULT: LANGUAGE_DEFAULT,
    PHQ9_OPTIONS: PHQ9_OPTIONS,
    PHQ9_STEM: PHQ9_STEM,
    PHQ9_QUESTIONS: PHQ9_QUESTIONS,
    QUICK_STEM: QUICK_STEM,
    QUICK_QUESTIONS: QUICK_QUESTIONS,
    CONSENT_TEXT: CONSENT_TEXT,
    UI_TEXT: UI_TEXT,
    RW_NEEDS_CLINICIAN_CHECK: RW_NEEDS_CLINICIAN_CHECK
  };
}
