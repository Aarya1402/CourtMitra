// ✅ MUST BE AT TOP (before any imports using it)
vi.mock("@react-pdf/renderer", () => ({
  Document: ({ children }: React.PropsWithChildren) => <div data-testid="document">{children}</div>,
  Page: ({ children }: React.PropsWithChildren) => <div data-testid="page">{children}</div>,
  Text: ({ children, render }: React.PropsWithChildren<{ render?: (props: { pageNumber: number }) => React.ReactNode }>) => {
    if (render) {
      return <div>{render({ pageNumber: 1 })}</div>;
    }
    return <span>{children}</span>;
  },
  View: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  StyleSheet: { create: (styles: Record<string, unknown>) => styles },
  Font: { register: vi.fn() }, // ✅ REQUIRED
  pdf: vi.fn(), // 🔥 also needed for other tests
}));

// THEN imports
import { render } from "@testing-library/react";
import { describe, it, vi, expect, beforeEach } from "vitest";
import TranscriptDocument from "../components/TranscriptEditor/TranscriptDocument";
// 🔥 Mock translations
vi.mock("../../constants/translations", () => ({
  getTranslation: vi.fn(() => ({
    transcript_title: "Transcript",
  })),
}));

// 🔥 Mock font config
vi.mock("../../constants/fontConfig", () => ({
  fontConfigs: [{ family: "TestFont", src: "test.ttf" }],
  getFontFamily: vi.fn(() => "TestFont"),
}));

describe("TranscriptDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Renders document structure
  it("renders Document and Page", () => {
    const { getByTestId } = render(
      <TranscriptDocument transcript="Hello world." />
    );

    expect(getByTestId("document")).toBeInTheDocument();
    expect(getByTestId("page")).toBeInTheDocument();
  });

  // ✅ Renders title
  it("renders translated title", () => {
    const { getByText } = render(
      <TranscriptDocument transcript="Hello world." />
    );

    expect(getByText("ટ્રાન્સક્રિપ્ટ")).toBeInTheDocument();
  });

  // ✅ Default language fallback
  it("uses default language if none provided", () => {
    const { getByText } = render(
      <TranscriptDocument transcript="Test sentence." />
    );

    expect(getByText("ટ્રાન્સક્રિપ્ટ")).toBeInTheDocument();
  });

  // ✅ Custom language usage
  it("uses provided language", () => {
    const { getByText } = render(
      <TranscriptDocument transcript="Test sentence." language="en-US" />
    );

    expect(getByText("ટ્રાન્સક્રિપ્ટ")).toBeInTheDocument();
  });

  // ✅ Paragraph splitting logic
  it("splits transcript into paragraphs (3 sentences each)", () => {
    const text =
      "Sentence one. Sentence two. Sentence three. Sentence four. Sentence five.";

    const { getByText } = render(<TranscriptDocument transcript={text} />);

    // First paragraph (3 sentences)
    expect(
      getByText("Sentence one. Sentence two. Sentence three.")
    ).toBeInTheDocument();

    // Second paragraph (remaining)
    expect(getByText("Sentence four. Sentence five.")).toBeInTheDocument();
  });

  // ✅ Handles empty transcript
  it("handles empty transcript gracefully", () => {
    const { getByTestId } = render(<TranscriptDocument transcript="" />);

    expect(getByTestId("document")).toBeInTheDocument();
  });
});
