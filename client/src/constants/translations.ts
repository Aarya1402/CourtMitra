import { engTranslations } from "./orderLabels/engData";
import { gujTranslations } from "./orderLabels/gujData";
import { hinTranslations } from "./orderLabels/hinData";

export type TranslationKeys = {
  complainant: string;
  court_name: string;
  location: string;
  case_number: string;
  case_type: string;
  petitioner: string;
  respondent: string;
  versus: string;
  procedural_history: string;
  arguments: string;
  reasoning: string;
  final_order: string;
  date: string;
  place: string;
  judge: string;
  designation: string;
  advocate_petitioner: string;
  advocate_respondent: string;
  operative_order: string;
  directions: string;
  reset_form: string;
  save_pdf: string;
  generating: string;
  order_title: string;
  filling_order: string;
  full_name_address: string;
  additional_text: string;
  signature_placeholder: string;
  add_point: string;
  add_direction: string;
  final_order_header: string;
  transcript_title: string;
  copy_transcript: string;
  download_pdf: string;
  clear_transcript: string;
  clear_confirm: string;
  filing_date: string;
  registration_date: string;
  decision_date: string;
  accused: string;
  other_parties: string;
  government_advocate: string;
  other_advocate: string;
  appearance_mode: string;
  case_details: string;
  acts_sections: string;
  case_category: string;
  police_station: string;
  property_details: string;
  other_details: string;
  issues_framed: string;
  evidence: string;
  oral_evidence: string;
  documentary_evidence: string;
  final_outcome: string;
  listening: string;
  add_point_audio: string;
  add_direction_audio: string;
};

export const translations: Record<string, { [key: string]: string }> = {
  "en-IN": engTranslations,
  "hi-IN": hinTranslations,
  "gu-IN": gujTranslations,
};

export const getTranslation = (lang: string) => {
  return translations[lang] || translations["gu-IN"];
};

export const LANGUAGE_OPTIONS = [
  { value: "gu-IN", label: "Gujarati" },
  { value: "en-IN", label: "English" },
  { value: "hi-IN", label: "Hindi" },
] as const;
