export const fontConfigs = [
  { family: "Gujarati", src: "/fonts/NotoSerifGujarati-Regular.ttf" },
  { family: "Hindi", src: "/fonts/NotoSerifDevanagari-Regular.ttf" },
];

export const getFontFamily = (language: string) => {
  switch (language) {
    case "gu-IN":
      return "Gujarati";
    case "hi-IN":
      return "Hindi";
    default:
      return "Times-Roman";
  }
};
