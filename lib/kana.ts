export type KanaItem = { kana: string; romaji: string };
export type KanaCategory = "core" | "dakuten" | "handakuten" | "combination" | "small";
export type KanaGroup = { title: string; note: string; category: KanaCategory; items: KanaItem[] };

const base: KanaItem[] = [
  ["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"],
  ["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"],
  ["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"],
  ["た", "ta"], ["ち", "chi"], ["つ", "tsu"], ["て", "te"], ["と", "to"],
  ["な", "na"], ["に", "ni"], ["ぬ", "nu"], ["ね", "ne"], ["の", "no"],
  ["は", "ha"], ["ひ", "hi"], ["ふ", "fu"], ["へ", "he"], ["ほ", "ho"],
  ["ま", "ma"], ["み", "mi"], ["む", "mu"], ["め", "me"], ["も", "mo"],
  ["や", "ya"], ["ゆ", "yu"], ["よ", "yo"],
  ["ら", "ra"], ["り", "ri"], ["る", "ru"], ["れ", "re"], ["ろ", "ro"],
  ["わ", "wa"], ["を", "wo (usually pronounced o)"], ["ん", "n"],
].map(([kana, romaji]) => ({ kana, romaji }));

const dakuten: KanaItem[] = [
  ["が", "ga"], ["ぎ", "gi"], ["ぐ", "gu"], ["げ", "ge"], ["ご", "go"],
  ["ざ", "za"], ["じ", "ji"], ["ず", "zu"], ["ぜ", "ze"], ["ぞ", "zo"],
  ["だ", "da"], ["ぢ", "ji"], ["づ", "zu"], ["で", "de"], ["ど", "do"],
  ["ば", "ba"], ["び", "bi"], ["ぶ", "bu"], ["べ", "be"], ["ぼ", "bo"],
].map(([kana, romaji]) => ({ kana, romaji }));

const handakuten: KanaItem[] = [
  ["ぱ", "pa"], ["ぴ", "pi"], ["ぷ", "pu"], ["ぺ", "pe"], ["ぽ", "po"],
].map(([kana, romaji]) => ({ kana, romaji }));

const combinations: KanaItem[] = [
  ["きゃ", "kya"], ["きゅ", "kyu"], ["きょ", "kyo"], ["ぎゃ", "gya"], ["ぎゅ", "gyu"], ["ぎょ", "gyo"],
  ["しゃ", "sha"], ["しゅ", "shu"], ["しょ", "sho"], ["じゃ", "ja"], ["じゅ", "ju"], ["じょ", "jo"],
  ["ちゃ", "cha"], ["ちゅ", "chu"], ["ちょ", "cho"], ["にゃ", "nya"], ["にゅ", "nyu"], ["にょ", "nyo"],
  ["ひゃ", "hya"], ["ひゅ", "hyu"], ["ひょ", "hyo"], ["びゃ", "bya"], ["びゅ", "byu"], ["びょ", "byo"],
  ["ぴゃ", "pya"], ["ぴゅ", "pyu"], ["ぴょ", "pyo"], ["みゃ", "mya"], ["みゅ", "myu"], ["みょ", "myo"],
  ["りゃ", "rya"], ["りゅ", "ryu"], ["りょ", "ryo"],
].map(([kana, romaji]) => ({ kana, romaji }));

const small: KanaItem[] = [
  ["っ", "double the next consonant"], ["ゃ", "small ya"], ["ゅ", "small yu"], ["ょ", "small yo"],
  ["ぁ", "small a"], ["ぃ", "small i"], ["ぅ", "small u"], ["ぇ", "small e"], ["ぉ", "small o"],
].map(([kana, romaji]) => ({ kana, romaji }));

const toKatakana = (kana: string) => [...kana].map((character) => {
  const code = character.codePointAt(0)!;
  return code >= 0x3041 && code <= 0x3096 ? String.fromCodePoint(code + 0x60) : character;
}).join("");

const katakana = (items: KanaItem[]) => items.map(({ kana, romaji }) => ({ kana: toKatakana(kana), romaji }));

export const kanaGroups: Record<"hiragana" | "katakana", KanaGroup[]> = {
  hiragana: [
    { title: "The 46 core sounds", note: "Read across each row: a, i, u, e, o.", category: "core", items: base },
    { title: "Dakuten", note: "The two strokes (゛) make these sounds voiced.", category: "dakuten", items: dakuten },
    { title: "Handakuten", note: "The small circle (゜) turns the h-row into the p-row.", category: "handakuten", items: handakuten },
    { title: "Combined sounds", note: "A small ゃ, ゅ, or ょ joins the sound before it.", category: "combination", items: combinations },
    { title: "Small kana", note: "The small っ creates a brief pause and doubles the following consonant.", category: "small", items: small },
  ],
  katakana: [
    { title: "The 46 core sounds", note: "Katakana represents the same sounds; it is common in loanwords and names.", category: "core", items: katakana(base) },
    { title: "Dakuten", note: "The two strokes (゛) make these sounds voiced.", category: "dakuten", items: katakana(dakuten) },
    { title: "Handakuten", note: "The small circle (゜) turns the h-row into the p-row.", category: "handakuten", items: katakana(handakuten) },
    { title: "Combined sounds", note: "These appear often in borrowed words and onomatopoeia.", category: "combination", items: katakana(combinations) },
    { title: "Small kana", note: "The long-vowel mark ー is also common in katakana words.", category: "small", items: [...katakana(small), { kana: "ー", romaji: "lengthen the vowel before it" }] },
  ],
};
