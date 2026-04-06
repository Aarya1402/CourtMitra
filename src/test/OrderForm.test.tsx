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
    // Let's find the decision date input near "Decision Date" label
    const decisionDateInput = screen.getAllByPlaceholderText("DD/MM/YYYY")[2]; // indices: 0: filing, 1: registration, 2: decision
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
});
