import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import OrderForm from "../components/OrderForm/OrderForm";
import * as useTranscriberHook from "../hooks/useTranscriber";
import { initialOrderData } from "../components/OrderForm/OrderForm.logic";

// Mock @react-pdf/renderer
vi.mock("@react-pdf/renderer", () => ({
  pdf: vi.fn().mockReturnValue({
    toBlob: async () => new Blob(["mock pdf"], { type: "application/pdf" }),
  }),
  Document: ({ children }: React.PropsWithChildren) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: React.PropsWithChildren) => <div data-testid="pdf-page">{children}</div>,
  Text: ({ children }: React.PropsWithChildren) => <span data-testid="pdf-text">{children}</span>,
  View: ({ children }: React.PropsWithChildren) => <div data-testid="pdf-view">{children}</div>,
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
  Font: {
    register: vi.fn(),
  },
}));

// Mock useTranscriber
vi.mock("../hooks/useTranscriber", () => ({
  useTranscriber: vi.fn(),
}));

describe("OrderForm Component", () => {
  const mockOnUpdate = vi.fn();
  const mockOnLanguageChange = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    (useTranscriberHook.useTranscriber as unknown as import("vitest").Mock).mockReturnValue({
      isRecording: false,
      transcript: "",
      start: vi.fn(),
      stop: vi.fn(),
      error: null,
    });
    
    // Mock URL methods
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  it("renders the order form with basic headers", () => {
    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    // English translation for order_title is "Court Order"
    expect(screen.getByText("Court Order")).toBeInTheDocument();
  });

  it("updates field when text is entered in Court Name", () => {
    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    // Placeholder for court_name in English is "In the Court of"
    // Multiple fields use this placeholder (header and signature), so we pick the first one
    const courtNameInputs = screen.getAllByPlaceholderText("In the Court of");
    fireEvent.change(courtNameInputs[0], { target: { value: "Supreme Court" } });

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({
          court_name: "Supreme Court",
        }),
      })
    );
  });

  it("handles resetting the form", () => {
    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    const resetBtn = screen.getByText("Reset Form");
    fireEvent.click(resetBtn);

    expect(mockOnUpdate).toHaveBeenCalledWith(initialOrderData);
  });

  it("calls onLanguageChange when language is changed via select", () => {
    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "gu-IN" } });

    expect(mockOnLanguageChange).toHaveBeenCalledWith("gu-IN");
  });

  it("shows loader when isProcessing is true", () => {
    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
        isProcessing={true}
      />
    );

    // translation for filling_order is "Filling Order..."
    expect(screen.getAllByText("Filling Order...")).toHaveLength(2); // One in toolbar, one in overlay
  });

  it("updates petitioner details when entered", () => {
    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    const petitionerInput = screen.getByPlaceholderText("Petitioner Full Name and Address");
    fireEvent.change(petitionerInput, { target: { value: "John Doe" } });

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        case_title: expect.objectContaining({
          petitioner: "John Doe",
        }),
      })
    );
  });

  it("can add and remove a reasoning point", () => {
    const dataWithPoint = {
      ...initialOrderData,
      reasoning_points: ["Point 1"]
    };
    
    render(
      <OrderForm
        data={dataWithPoint}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    // Test addition
    const addBtn = screen.getByText("+ Add Reasoning Point");
    fireEvent.click(addBtn);
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        reasoning_points: ["Point 1", ""]
      })
    );

    // Test removal (x button)
    const removeBtn = screen.getByTitle("Remove Point");
    fireEvent.click(removeBtn);
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        reasoning_points: []
      })
    );
  });

  it("opens language sheet on mobile", () => {
    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
        isMobile={true}
      />
    );

    // Language button on mobile
    const langBtn = screen.getByText("English");
    fireEvent.click(langBtn);

    // Should show language menu (e.g. "Gujarati")
    expect(screen.getByText("Gujarati")).toBeInTheDocument();
    
    // Choose Gujarati
    fireEvent.click(screen.getByText("Gujarati"));
    expect(mockOnLanguageChange).toHaveBeenCalledWith("gu-IN");
  });

  it("toggles voice recording when mic button is clicked", async () => {
    const mockStart = vi.fn();
    (useTranscriberHook.useTranscriber as unknown as import("vitest").Mock).mockReturnValue({
      isRecording: false,
      transcript: "",
      start: mockStart,
      stop: vi.fn(),
      error: null,
    });

    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    // Mic button for reasoning points
    const micBtn = screen.getByTitle("Add Point via Audio");
    fireEvent.click(micBtn);

    expect(mockStart).toHaveBeenCalledWith("en-IN");
  });

  it("updates procedural history when text is entered", () => {
    const dataWithHistory = {
      ...initialOrderData,
      procedural_history: "Initial history"
    };

    render(
      <OrderForm
        data={dataWithHistory}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    const historyInput = screen.getByPlaceholderText("Procedural history of the case");
    fireEvent.change(historyInput, { target: { value: "Updated history..." } });

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        procedural_history: "Updated history...",
      })
    );
  });

  it("updates decision date in dates section", () => {
    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    // Decision date placeholder is "DD/MM/YYYY" but multiple inputs use it.
    // OrderForm.tsx line 431 uses t.decision_date label and renderInline
    // indices: 0: filing, 1: registration, 2: decision
    const decisionDateInput = screen.getAllByPlaceholderText("DD/MM/YYYY")[2];
    fireEvent.change(decisionDateInput, { target: { value: "01/01/2024" } });

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({
          dates: expect.objectContaining({
            decision_date: "01/01/2024",
          }),
        }),
      })
    );
  });

  it("updates operative order details", () => {
    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    const operativeInput = screen.getByPlaceholderText("Operative Order");
    fireEvent.change(operativeInput, { target: { value: "Final directions..." } });

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        operative_order: expect.objectContaining({
          full_text: "Final directions...",
        }),
      })
    );
  });

  it("uses initialOrderData when data prop is null", () => {
    render(
      <OrderForm
        data={null}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    expect(screen.getByText("Court Order")).toBeInTheDocument();
  });

  it("handles PDF generation", async () => {
    const mockLink = {
      click: vi.fn(),
      href: "",
      download: "",
    };
    
    // Explicitly mock pdf().toBlob() for this test
    const { pdf } = await import("@react-pdf/renderer");
    (pdf as any).mockReturnValue({
      toBlob: async () => new Blob(["mock pdf"], { type: "application/pdf" }),
    });

    const originalCreateElement = document.createElement;
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "a") return mockLink as any;
      return originalCreateElement.call(document, tagName);
    });

    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    const pdfBtn = screen.getByTitle("Generates a multi-page PDF (handles overflow)");
    fireEvent.click(pdfBtn);

    // PDF generation is async
    await vi.waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  it("updates case details fields (acts, sections, category)", () => {
    const dataWithDetails = {
      ...initialOrderData,
      case_details: {
        ...initialOrderData.case_details,
        acts_sections: "Section 302 IPC",
        case_category: "Criminal",
        police_station: "Central PS",
      },
    };

    render(
      <OrderForm
        data={dataWithDetails}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    const actsInput = screen.getByPlaceholderText("Relevant acts and sections");
    fireEvent.change(actsInput, { target: { value: "Section 307 IPC" } });
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        case_details: expect.objectContaining({
          acts_sections: "Section 307 IPC",
        }),
      })
    );

    const categoryInput = screen.getByPlaceholderText("Case category");
    fireEvent.change(categoryInput, { target: { value: "Civil" } });
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        case_details: expect.objectContaining({
          case_category: "Civil",
        }),
      })
    );

    const psInput = screen.getByPlaceholderText("Police station name");
    fireEvent.change(psInput, { target: { value: "Town PS" } });
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        case_details: expect.objectContaining({
          police_station: "Town PS",
        }),
      })
    );
  });

  it("adds and removes operative order directions", () => {
    const dataWithDir = {
      ...initialOrderData,
      operative_order: {
        ...initialOrderData.operative_order,
        directions: ["Dir 1"],
      },
    };

    render(
      <OrderForm
        data={dataWithDir}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    const addBtn = screen.getByText("+ Add Direction");
    fireEvent.click(addBtn);
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        operative_order: expect.objectContaining({
          directions: ["Dir 1", ""],
        }),
      })
    );

    const removeBtn = screen.getByTitle("Remove Direction");
    fireEvent.click(removeBtn);
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        operative_order: expect.objectContaining({
          directions: [],
        }),
      })
    );
  });

  it("updates appearance mode", () => {
    const dataWithMode = {
      ...initialOrderData,
      appearance_mode: "Video Conference",
    };

    render(
      <OrderForm
        data={dataWithMode}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    const modeInput = screen.getByPlaceholderText("e.g. In Person / Video Conference");
    fireEvent.change(modeInput, { target: { value: "In Person" } });

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        appearance_mode: "In Person",
      })
    );
  });

  it("updates signature fields", () => {
    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    const judgeInputs = screen.getAllByPlaceholderText("Judge");
    fireEvent.change(judgeInputs[judgeInputs.length - 1], { target: { value: "Hon'ble Judge A" } });
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        signature: expect.objectContaining({ judge_name: "Hon'ble Judge A" }),
      })
    );

    const desigInput = screen.getByPlaceholderText("Designation");
    fireEvent.change(desigInput, { target: { value: "District Judge" } });
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        signature: expect.objectContaining({ designation: "District Judge" }),
      })
    );
  });

  it("updates final outcome and final order", () => {
    const data = {
      ...initialOrderData,
      operative_order: { ...initialOrderData.operative_order, final_outcome: "Outcome" },
      final_order: "Final order text",
    };

    render(
      <OrderForm
        data={data}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    const outcomeInput = screen.getByPlaceholderText("Final outcome of the case");
    fireEvent.change(outcomeInput, { target: { value: "Updated Outcome" } });
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        operative_order: expect.objectContaining({ final_outcome: "Updated Outcome" }),
      })
    );

    const finalOrderInput = screen.getByPlaceholderText("Final order text");
    fireEvent.change(finalOrderInput, { target: { value: "Updated Order" } });
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        final_order: "Updated Order",
      })
    );
  });

  it("safeJoinArray handles different object types in parties/advocates", () => {
    const data = {
      ...initialOrderData,
      parties: {
        ...initialOrderData.parties,
        complainant: [{ name: "Comp 1" } as any],
        accused: [{ text: "Acc 1" } as any],
        other_parties: [{ advocate_name: "Adv 1" } as any, "Other"],
      },
    };

    render(
      <OrderForm
        data={data}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    expect(screen.getByDisplayValue("Comp 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Acc 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Adv 1, Other")).toBeInTheDocument();
  });

  it("handles voice recording flow for different fields", async () => {
    const mockStart = vi.fn();
    const mockStop = vi.fn();
    const { rerender } = render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    // Mock hook for starting recording
    (useTranscriberHook.useTranscriber as any).mockReturnValue({
      isRecording: false,
      transcript: "",
      start: mockStart,
      stop: mockStop,
    });

    rerender(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    const micBtn = screen.getByTitle("Add Point via Audio");
    fireEvent.click(micBtn);
    expect(mockStart).toHaveBeenCalled();

    // Now mock it as recording
    (useTranscriberHook.useTranscriber as any).mockReturnValue({
      isRecording: true,
      transcript: "Recorded Text",
      start: mockStart,
      stop: mockStop,
    });

    rerender(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    // Stop recording
    fireEvent.click(micBtn);
    expect(mockStop).toHaveBeenCalled();

    // Finalize check (after stop it goes to finalizeTranscription via useEffect)
    (useTranscriberHook.useTranscriber as any).mockReturnValue({
      isRecording: false,
      transcript: "Recorded Text",
      start: mockStart,
      stop: mockStop,
    });

    rerender(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    // finalizeTranscription should have been called
    expect(mockOnUpdate).toHaveBeenCalled();
  });

  it("updates location and case type in header", () => {
    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    const locationInput = screen.getByPlaceholderText("Location");
    fireEvent.change(locationInput, { target: { value: "High Court" } });
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({ location: "High Court" }),
      })
    );

    const caseTypeInput = screen.getByPlaceholderText("Case Type");
    fireEvent.change(caseTypeInput, { target: { value: "Writ Petition" } });
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({ case_type: "Writ Petition" }),
      })
    );
  });

  it("handles voice recording for operative order directions", async () => {
    const mockStart = vi.fn();
    (useTranscriberHook.useTranscriber as any).mockReturnValue({
      isRecording: false,
      transcript: "",
      start: mockStart,
      stop: vi.fn(),
    });

    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    const micBtn = screen.getByTitle("Add Direction via Audio");
    fireEvent.click(micBtn);
    expect(mockStart).toHaveBeenCalled();
  });

  it("handles PDF generation error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { pdf } = await import("@react-pdf/renderer");
    (pdf as any).mockImplementation(() => ({
      toBlob: () => Promise.reject(new Error("PDF Error")),
    }));

    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    const pdfBtn = screen.getByTitle("Generates a multi-page PDF (handles overflow)");
    fireEvent.click(pdfBtn);

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("PDF generation error:", expect.any(Error));
    });
    consoleSpy.mockRestore();
  });

  it("updates case number in header", () => {
    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
      />
    );

    const caseNumberInput = screen.getByPlaceholderText("Case Number");
    fireEvent.change(caseNumberInput, { target: { value: "ABC-123" } });
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({ case_number: "ABC-123" }),
      })
    );
  });

  it("closes language menu when backdrop is clicked on mobile", () => {
    render(
      <OrderForm
        data={initialOrderData}
        onUpdate={mockOnUpdate}
        onLanguageChange={mockOnLanguageChange}
        language="en-IN"
        isMobile={true}
      />
    );

    // Open menu
    fireEvent.click(screen.getByText("English"));
    expect(screen.getByText("Gujarati")).toBeInTheDocument();

    // Click backdrop
    const backdrop = screen.getByLabelText("Close language menu");
    fireEvent.click(backdrop);

    // Menu should be gone
    expect(screen.queryByText("Gujarati")).not.toBeInTheDocument();
  });
});
