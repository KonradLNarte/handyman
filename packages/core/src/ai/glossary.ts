export interface GlossaryTerm {
  source: string;
  target: string;
}

/**
 * Platform painting/construction industry glossary.
 * ~30 terms per language pair as required by Phase 2 spec.
 */
const GLOSSARY: Record<string, GlossaryTerm[]> = {
  "sv→ar": [
    { source: "spackling", target: "معجون" },
    { source: "grundning", target: "تأسيس" },
    { source: "slipning", target: "صنفرة" },
    { source: "täckmålning", target: "طلاء نهائي" },
    { source: "penselmålning", target: "طلاء بالفرشاة" },
    { source: "rollning", target: "طلاء بالرول" },
    { source: "sprutmålning", target: "طلاء بالرش" },
    { source: "tapetsering", target: "تعليق ورق جدران" },
    { source: "avslipning", target: "إزالة بالصنفرة" },
    { source: "våtrum", target: "غرفة رطبة" },
    { source: "underlag", target: "سطح أساسي" },
    { source: "NCS", target: "NCS" },
    { source: "kulör", target: "لون" },
    { source: "glanstal", target: "درجة اللمعان" },
    { source: "strykning", target: "طبقة طلاء" },
    { source: "torktid", target: "وقت التجفيف" },
    { source: "skyddsplast", target: "بلاستيك حماية" },
    { source: "maskeringstejp", target: "شريط لاصق تغطية" },
    { source: "fogmassa", target: "مادة ملء الفواصل" },
    { source: "puts", target: "جص" },
    { source: "betong", target: "خرسانة" },
    { source: "gips", target: "جبس" },
    { source: "tak", target: "سقف" },
    { source: "vägg", target: "جدار" },
    { source: "golv", target: "أرضية" },
    { source: "dörr", target: "باب" },
    { source: "fönster", target: "نافذة" },
    { source: "list", target: "قائمة زخرفية" },
    { source: "fasad", target: "واجهة" },
    { source: "ROT-avdrag", target: "خصم ROT" },
  ],
  "sv→pl": [
    { source: "spackling", target: "szpachlowanie" },
    { source: "grundning", target: "gruntowanie" },
    { source: "slipning", target: "szlifowanie" },
    { source: "täckmålning", target: "malowanie nawierzchniowe" },
    { source: "penselmålning", target: "malowanie pędzlem" },
    { source: "rollning", target: "malowanie wałkiem" },
    { source: "sprutmålning", target: "malowanie natryskowe" },
    { source: "tapetsering", target: "tapetowanie" },
    { source: "avslipning", target: "ścieranie" },
    { source: "våtrum", target: "pomieszczenie mokre" },
    { source: "underlag", target: "podkład" },
    { source: "NCS", target: "NCS" },
    { source: "kulör", target: "kolor" },
    { source: "glanstal", target: "stopień połysku" },
    { source: "strykning", target: "warstwa malowania" },
    { source: "torktid", target: "czas schnięcia" },
    { source: "skyddsplast", target: "folia ochronna" },
    { source: "maskeringstejp", target: "taśma maskująca" },
    { source: "fogmassa", target: "masa fugowa" },
    { source: "puts", target: "tynk" },
    { source: "betong", target: "beton" },
    { source: "gips", target: "gips" },
    { source: "tak", target: "sufit" },
    { source: "vägg", target: "ściana" },
    { source: "golv", target: "podłoga" },
    { source: "dörr", target: "drzwi" },
    { source: "fönster", target: "okno" },
    { source: "list", target: "listwa" },
    { source: "fasad", target: "fasada" },
    { source: "ROT-avdrag", target: "odliczenie ROT" },
  ],
  "sv→en": [
    { source: "spackling", target: "spackling/filling" },
    { source: "grundning", target: "priming" },
    { source: "slipning", target: "sanding" },
    { source: "täckmålning", target: "topcoat painting" },
    { source: "penselmålning", target: "brush painting" },
    { source: "rollning", target: "roller painting" },
    { source: "sprutmålning", target: "spray painting" },
    { source: "tapetsering", target: "wallpapering" },
    { source: "avslipning", target: "sanding off" },
    { source: "våtrum", target: "wet room" },
    { source: "underlag", target: "substrate" },
    { source: "NCS", target: "NCS" },
    { source: "kulör", target: "colour" },
    { source: "glanstal", target: "gloss level" },
    { source: "strykning", target: "coat" },
    { source: "torktid", target: "drying time" },
    { source: "skyddsplast", target: "protective sheeting" },
    { source: "maskeringstejp", target: "masking tape" },
    { source: "fogmassa", target: "joint compound" },
    { source: "puts", target: "plaster" },
    { source: "betong", target: "concrete" },
    { source: "gips", target: "drywall" },
    { source: "tak", target: "ceiling" },
    { source: "vägg", target: "wall" },
    { source: "golv", target: "floor" },
    { source: "dörr", target: "door" },
    { source: "fönster", target: "window" },
    { source: "list", target: "trim/moulding" },
    { source: "fasad", target: "facade" },
    { source: "ROT-avdrag", target: "ROT deduction" },
  ],
};

/**
 * Returns glossary terms for a language pair.
 * Falls back to empty array if no glossary exists for the pair.
 */
export function getGlossaryTerms(
  sourceLocale: string,
  targetLocale: string
): GlossaryTerm[] {
  const key = `${sourceLocale}→${targetLocale}`;
  return GLOSSARY[key] ?? [];
}
