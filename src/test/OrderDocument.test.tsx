import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import OrderDocument from "../components/OrderForm/OrderDocument";
import { initialOrderData } from "../components/OrderForm/OrderForm.logic";

// Mock @react-pdf/renderer
vi.mock("@react-pdf/renderer", () => ({
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: any) => <div data-testid="pdf-page">{children}</div>,
  Text: ({ children, render }: any) => {
    if (render) {
      return <span data-testid="pdf-text-render">{render({ pageNumber: 1, totalPages: 1 })}</span>;
    }
    return <span data-testid="pdf-text">{children}</span>;
  },
  View: ({ children }: any) => <div data-testid="pdf-view">{children}</div>,
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Font: {
    register: vi.fn(),
  },
}));

describe("OrderDocument Component", () => {
  it("renders basic document structure", () => {
    render(<OrderDocument data={initialOrderData} language="en-IN" />);
    expect(screen.getByTestId("pdf-document")).toBeInTheDocument();
    expect(screen.getByTestId("pdf-page")).toBeInTheDocument();
  });

  it("renders header information when provided", () => {
    const customData = {
      ...initialOrderData,
      header: {
        ...initialOrderData.header,
        court_name: "Supreme Court of India",
        location: "New Delhi",
        case_number: "WP 123/2024",
      },
    };
    render(<OrderDocument data={customData} language="en-IN" />);
    expect(screen.getByText("Supreme Court of India")).toBeInTheDocument();
    expect(screen.getByText("New Delhi")).toBeInTheDocument();
    expect(screen.getByText("WP 123/2024")).toBeInTheDocument();
  });

  it("renders dates section when dates are present", () => {
    const customData = {
      ...initialOrderData,
      header: {
        ...initialOrderData.header,
        dates: {
          filing_date: "01/01/2024",
          registration_date: "02/01/2024",
          decision_date: "10/01/2024",
          other_dates: [],
        },
      },
    };
    render(<OrderDocument data={customData} language="en-IN" />);
    expect(screen.getByText("Filing Date")).toBeInTheDocument();
    expect(screen.getByText("01/01/2024")).toBeInTheDocument();
    expect(screen.getByText("Registration Date:")).toBeInTheDocument();
    expect(screen.getByText("02/01/2024")).toBeInTheDocument();
  });

  it("renders parties and advocates sections", () => {
    const customData = {
      ...initialOrderData,
      case_title: {
        petitioner: "John Doe",
        respondent: "State of Gujarat",
        full_title_text: "John Doe vs State",
      },
      advocates: {
        petitioner_side: ["Advocate A"],
        respondent_side: ["Advocate B"],
        government_side: ["Public Prosecutor"],
        other: ["Amicus Curiae"],
      },
    };
    render(<OrderDocument data={customData} language="en-IN" />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("State of Gujarat")).toBeInTheDocument();
    expect(screen.getByText("Advocate A")).toBeInTheDocument();
    expect(screen.getByText("Public Prosecutor")).toBeInTheDocument();
  });

  it("renders procedural history and reasoning points", () => {
    const customData = {
      ...initialOrderData,
      procedural_history: "This is the first sentence. This is the second. This is the third. This is the fourth.",
      reasoning_points: ["Point one", "Point two"],
    };
    render(<OrderDocument data={customData} language="en-IN" />);
    
    // Procedural history split into paragraphs (every 3 sentences)
    expect(screen.getByText("This is the first sentence. This is the second. This is the third.")).toBeInTheDocument();
    expect(screen.getByText("This is the fourth.")).toBeInTheDocument();
    
    expect(screen.getByText("Point one")).toBeInTheDocument();
    expect(screen.getByText("Point two")).toBeInTheDocument();
  });

  it("renders operative order and final outcome", () => {
    const customData = {
      ...initialOrderData,
      operative_order: {
        full_text: "The petition is allowed.",
        directions: ["Direction 1", "Direction 2"],
        final_outcome: "Allowed.",
      },
    };
    render(<OrderDocument data={customData} language="en-IN" />);
    expect(screen.getByText("The petition is allowed.")).toBeInTheDocument();
    expect(screen.getByText("Direction 1")).toBeInTheDocument();
    expect(screen.getByText("Direction 2")).toBeInTheDocument();
    expect(screen.getByText("Final Outcome:")).toBeInTheDocument();
    expect(screen.getByText("Allowed.")).toBeInTheDocument();
  });

  it("renders signature section", () => {
    const customData = {
      ...initialOrderData,
      signature: {
        judge_name: "Justice H.C. Shah",
        designation: "District Judge",
        court: "District Court Surat",
        date: "25/03/2024",
        place: "Surat",
      },
    };
    render(<OrderDocument data={customData} language="en-IN" />);
    expect(screen.getByText("Justice H.C. Shah")).toBeInTheDocument();
    expect(screen.getByText("District Judge")).toBeInTheDocument();
    expect(screen.getByText("District Court Surat")).toBeInTheDocument();
    // Use regex to match parts of the text because of fragmentation
    expect(screen.getByText(/25\/03\/2024/)).toBeInTheDocument();
    expect(screen.getAllByText(/Surat/).length).toBeGreaterThan(0);
  });

  it("calls Font.register on init", async () => {
    const { Font } = await import("@react-pdf/renderer");
    expect(Font.register).toHaveBeenCalled();
  });

  it("handles complex array data in safeJoin", () => {
    const customData = {
      ...initialOrderData,
      parties: {
        ...initialOrderData.parties,
        complainant: ["Simple String", { name: "Object Name" }, { text: "Object Text" }] as any,
        accused: [{ advocate_name: "Adv Name" }, { other: "Unknown" }] as any,
      },
    };
    render(<OrderDocument data={customData} language="en-IN" />);
    
    // safeJoin result for complainant: "Simple String, Object Name, Object Text"
    expect(screen.getByText("Simple String, Object Name, Object Text")).toBeInTheDocument();
    // safeJoin result for accused: "Adv Name, {\"other\":\"Unknown\"}"
    expect(screen.getByText("Adv Name, {\"other\":\"Unknown\"}")).toBeInTheDocument();
  });

  it("renders case details section", () => {
    const customData = {
      ...initialOrderData,
      case_details: {
        acts_sections: "Section 302 IPC",
        case_category: "Criminal",
        police_station: "Central PS",
        property_details: "Knife",
        other_details: "None",
      },
    };
    render(<OrderDocument data={customData} language="en-IN" />);
    expect(screen.getByText("Section 302 IPC")).toBeInTheDocument();
    expect(screen.getByText("Criminal")).toBeInTheDocument();
    expect(screen.getByText("Central PS")).toBeInTheDocument();
    expect(screen.getByText("Knife")).toBeInTheDocument();
  });

  it("renders correctly in different languages (Hindi)", () => {
    render(<OrderDocument data={initialOrderData} language="hi-IN" />);
    // Hindi translation for "versus" (बनाम)
    expect(screen.getByText("बनाम")).toBeInTheDocument();
  });

  it("handles non-array inputs in safeJoin helper via component render", () => {
    const customData = {
      ...initialOrderData,
      parties: {
        ...initialOrderData.parties,
        complainant: null as any,
      },
    };
    render(<OrderDocument data={customData} language="en-IN" />);
    // safeJoin(null) returns "" - no error expected
    expect(screen.queryByText(/Complainant:/)).not.toBeInTheDocument();
  });
});
