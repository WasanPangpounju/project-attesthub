export type WcagLevel = "A" | "AA" | "AAA"

export interface WcagCriterion {
  id: string          // e.g. "1.1.1"
  level: WcagLevel
  title: string       // e.g. "Non-text Content"
  principle: string   // "Perceivable" | "Operable" | "Understandable" | "Robust"
}

export const WCAG_CRITERIA: WcagCriterion[] = [
  // 1. Perceivable
  { id: "1.1.1", level: "A",   title: "Non-text Content",              principle: "Perceivable" },
  { id: "1.2.1", level: "A",   title: "Audio-only and Video-only",     principle: "Perceivable" },
  { id: "1.2.2", level: "A",   title: "Captions (Prerecorded)",        principle: "Perceivable" },
  { id: "1.2.3", level: "A",   title: "Audio Description or Media Alternative", principle: "Perceivable" },
  { id: "1.2.4", level: "AA",  title: "Captions (Live)",               principle: "Perceivable" },
  { id: "1.2.5", level: "AA",  title: "Audio Description (Prerecorded)", principle: "Perceivable" },
  { id: "1.2.6", level: "AAA", title: "Sign Language",                 principle: "Perceivable" },
  { id: "1.2.7", level: "AAA", title: "Extended Audio Description",    principle: "Perceivable" },
  { id: "1.2.8", level: "AAA", title: "Media Alternative",             principle: "Perceivable" },
  { id: "1.2.9", level: "AAA", title: "Audio-only (Live)",             principle: "Perceivable" },
  { id: "1.3.1", level: "A",   title: "Info and Relationships",        principle: "Perceivable" },
  { id: "1.3.2", level: "A",   title: "Meaningful Sequence",           principle: "Perceivable" },
  { id: "1.3.3", level: "A",   title: "Sensory Characteristics",       principle: "Perceivable" },
  { id: "1.3.4", level: "AA",  title: "Orientation",                   principle: "Perceivable" },
  { id: "1.3.5", level: "AA",  title: "Identify Input Purpose",        principle: "Perceivable" },
  { id: "1.3.6", level: "AAA", title: "Identify Purpose",              principle: "Perceivable" },
  { id: "1.4.1", level: "A",   title: "Use of Color",                  principle: "Perceivable" },
  { id: "1.4.2", level: "A",   title: "Audio Control",                 principle: "Perceivable" },
  { id: "1.4.3", level: "AA",  title: "Contrast (Minimum)",            principle: "Perceivable" },
  { id: "1.4.4", level: "AA",  title: "Resize Text",                   principle: "Perceivable" },
  { id: "1.4.5", level: "AA",  title: "Images of Text",                principle: "Perceivable" },
  { id: "1.4.6", level: "AAA", title: "Contrast (Enhanced)",           principle: "Perceivable" },
  { id: "1.4.7", level: "AAA", title: "Low or No Background Audio",    principle: "Perceivable" },
  { id: "1.4.8", level: "AAA", title: "Visual Presentation",           principle: "Perceivable" },
  { id: "1.4.9", level: "AAA", title: "Images of Text (No Exception)", principle: "Perceivable" },
  { id: "1.4.10", level: "AA", title: "Reflow",                        principle: "Perceivable" },
  { id: "1.4.11", level: "AA", title: "Non-text Contrast",             principle: "Perceivable" },
  { id: "1.4.12", level: "AA", title: "Text Spacing",                  principle: "Perceivable" },
  { id: "1.4.13", level: "AA", title: "Content on Hover or Focus",     principle: "Perceivable" },
  // 2. Operable
  { id: "2.1.1", level: "A",   title: "Keyboard",                      principle: "Operable" },
  { id: "2.1.2", level: "A",   title: "No Keyboard Trap",              principle: "Operable" },
  { id: "2.1.3", level: "AAA", title: "Keyboard (No Exception)",       principle: "Operable" },
  { id: "2.1.4", level: "A",   title: "Character Key Shortcuts",       principle: "Operable" },
  { id: "2.2.1", level: "A",   title: "Timing Adjustable",             principle: "Operable" },
  { id: "2.2.2", level: "A",   title: "Pause, Stop, Hide",             principle: "Operable" },
  { id: "2.2.3", level: "AAA", title: "No Timing",                     principle: "Operable" },
  { id: "2.2.4", level: "AAA", title: "Interruptions",                 principle: "Operable" },
  { id: "2.2.5", level: "AAA", title: "Re-authenticating",             principle: "Operable" },
  { id: "2.2.6", level: "AAA", title: "Timeouts",                      principle: "Operable" },
  { id: "2.3.1", level: "A",   title: "Three Flashes or Below Threshold", principle: "Operable" },
  { id: "2.3.2", level: "AAA", title: "Three Flashes",                 principle: "Operable" },
  { id: "2.3.3", level: "AAA", title: "Animation from Interactions",   principle: "Operable" },
  { id: "2.4.1", level: "A",   title: "Bypass Blocks",                 principle: "Operable" },
  { id: "2.4.2", level: "A",   title: "Page Titled",                   principle: "Operable" },
  { id: "2.4.3", level: "A",   title: "Focus Order",                   principle: "Operable" },
  { id: "2.4.4", level: "A",   title: "Link Purpose (In Context)",     principle: "Operable" },
  { id: "2.4.5", level: "AA",  title: "Multiple Ways",                 principle: "Operable" },
  { id: "2.4.6", level: "AA",  title: "Headings and Labels",           principle: "Operable" },
  { id: "2.4.7", level: "AA",  title: "Focus Visible",                 principle: "Operable" },
  { id: "2.4.8", level: "AAA", title: "Location",                      principle: "Operable" },
  { id: "2.4.9", level: "AAA", title: "Link Purpose (Link Only)",      principle: "Operable" },
  { id: "2.4.10", level: "AAA",title: "Section Headings",              principle: "Operable" },
  { id: "2.5.1", level: "A",   title: "Pointer Gestures",              principle: "Operable" },
  { id: "2.5.2", level: "A",   title: "Pointer Cancellation",          principle: "Operable" },
  { id: "2.5.3", level: "A",   title: "Label in Name",                 principle: "Operable" },
  { id: "2.5.4", level: "A",   title: "Motion Actuation",              principle: "Operable" },
  { id: "2.5.5", level: "AAA", title: "Target Size",                   principle: "Operable" },
  { id: "2.5.6", level: "AAA", title: "Concurrent Input Mechanisms",   principle: "Operable" },
  // 3. Understandable
  { id: "3.1.1", level: "A",   title: "Language of Page",              principle: "Understandable" },
  { id: "3.1.2", level: "AA",  title: "Language of Parts",             principle: "Understandable" },
  { id: "3.1.3", level: "AAA", title: "Unusual Words",                 principle: "Understandable" },
  { id: "3.1.4", level: "AAA", title: "Abbreviations",                 principle: "Understandable" },
  { id: "3.1.5", level: "AAA", title: "Reading Level",                 principle: "Understandable" },
  { id: "3.1.6", level: "AAA", title: "Pronunciation",                 principle: "Understandable" },
  { id: "3.2.1", level: "A",   title: "On Focus",                      principle: "Understandable" },
  { id: "3.2.2", level: "A",   title: "On Input",                      principle: "Understandable" },
  { id: "3.2.3", level: "AA",  title: "Consistent Navigation",         principle: "Understandable" },
  { id: "3.2.4", level: "AA",  title: "Consistent Identification",     principle: "Understandable" },
  { id: "3.2.5", level: "AAA", title: "Change on Request",             principle: "Understandable" },
  { id: "3.3.1", level: "A",   title: "Error Identification",          principle: "Understandable" },
  { id: "3.3.2", level: "A",   title: "Labels or Instructions",        principle: "Understandable" },
  { id: "3.3.3", level: "AA",  title: "Error Suggestion",              principle: "Understandable" },
  { id: "3.3.4", level: "AA",  title: "Error Prevention (Legal, Financial, Data)", principle: "Understandable" },
  { id: "3.3.5", level: "AAA", title: "Help",                          principle: "Understandable" },
  { id: "3.3.6", level: "AAA", title: "Error Prevention (All)",        principle: "Understandable" },
  // 4. Robust
  { id: "4.1.1", level: "A",   title: "Parsing",                       principle: "Robust" },
  { id: "4.1.2", level: "A",   title: "Name, Role, Value",             principle: "Robust" },
  { id: "4.1.3", level: "AA",  title: "Status Messages",               principle: "Robust" },
]

export const WCAG_CRITERIA_MAP: Record<string, WcagCriterion> = Object.fromEntries(
  WCAG_CRITERIA.map((c) => [c.id, c])
)
