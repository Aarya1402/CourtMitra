export interface Dates {
  filing_date: string | null;
  registration_date: string | null;
  decision_date: string | null;
  other_dates: string[];
}

export interface Header {
  court_name: string | null;
  case_number: string | null;
  case_type: string | null;
  location: string | null;
  dates: Dates;
}

export interface CaseTitle {
  petitioner: string | null;
  respondent: string | null;
  full_title_text: string | null;
}

export interface Parties {
  petitioners: string[];
  respondents: string[];
  accused: string[];
  complainant: string[];
  other_parties: string[];
}

export interface Advocates {
  petitioner_side: string[];
  respondent_side: string[];
  government_side: string[];
  other: string[];
}

export interface CaseDetails {
  acts_sections: string | null;
  case_category: string | null;
  police_station: string | null;
  property_details: string | null;
  other_details: string | null;
}

export interface Evidence {
  oral_evidence: string | null;
  documentary_evidence: string | null;
}

export interface OperativeOrder {
  full_text: string | null;
  directions: string[];
  final_outcome: string | null;
}

export interface Signature {
  judge_name: string | null;
  designation: string | null;
  court: string | null;
  date: string | null;
  place: string | null;
}

export interface LegalOrderData {
  header: Header;
  case_title: CaseTitle;
  parties: Parties;
  advocates: Advocates;
  appearance_mode: string | null;
  case_details: CaseDetails;
  procedural_history: string | null;
  issues_framed: string | null;
  evidence: Evidence;
  arguments: string | null;
  reasoning_points: string[];
  operative_order: OperativeOrder;
  final_order: string | null;
  signature: Signature;
}

// Sarvam AI specific
export interface SarvamTranscriptSegment {
  transcript?: string;
  text?: string;
  speaker?: string;
  start_time?: number;
  end_time?: number;
}

export interface SarvamChatResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
    index: number;
  }>;
  id: string;
  model: string;
  object: string;
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
}
