export const fontConfigs = [
  { family: "Gujarati", src: "/fonts/shruti.ttf" },
  { family: "Hindi", src: "/fonts/mangal.ttf" },
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
