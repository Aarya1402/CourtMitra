import type { OrderData } from "./OrderForm";

export const initialOrderData: OrderData = {
  header: {
    court_name: "",
    case_number: "",
    case_type: "",
    location: "",
    dates: {
      filing_date: "",
      registration_date: "",
      decision_date: "",
      other_dates: [],
    },
  },
  case_title: { petitioner: "", respondent: "", full_title_text: "" },
  parties: {
    petitioners: [],
    respondents: [],
    accused: [],
    complainant: [],
    other_parties: [],
  },
  advocates: {
    petitioner_side: [],
    respondent_side: [],
    government_side: [],
    other: [],
  },
  appearance_mode: "",
  case_details: {
    acts_sections: "",
    case_category: "",
    police_station: "",
    property_details: "",
    other_details: "",
  },
  procedural_history: "",
  issues_framed: "",
  evidence: { oral_evidence: "", documentary_evidence: "" },
  arguments: "",
  reasoning_points: [],
  operative_order: { full_text: "", directions: [], final_outcome: "" },
  final_order: "",
  signature: {
    judge_name: "",
    designation: "",
    court: "",
    date: "",
    place: "",
  },
  raw_text: "",
};
