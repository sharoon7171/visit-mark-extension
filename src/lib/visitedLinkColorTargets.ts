export const visitedLinkColorDomQuery =
  "a:visited, [role=\"link\"]:visited";

export const visitedLinkColorAriaRole = "link";

export const visitedLinkColorSelectors = [
  "html body a:visited",
  "html body a:visited *",
  "html body [role=\"link\"]:visited",
  "html body [role=\"link\"]:visited *",
  "html body div a:visited",
  "html body div a:visited *",
  "html body section a:visited",
  "html body section a:visited *",
  "html body article a:visited",
  "html body article a:visited *",
  "html body main a:visited",
  "html body main a:visited *",
  "html body nav a:visited",
  "html body nav a:visited *",
  "html body header a:visited",
  "html body header a:visited *",
  "html body footer a:visited",
  "html body footer a:visited *",
  "html body .link:visited",
  "html body .link:visited *",
  "html body .url:visited",
  "html body .url:visited *",
  "html body .external:visited",
  "html body .external:visited *",
  "html body a:visited span",
  "html body a:visited div",
  "html body a:visited p",
  "html body a:visited h1",
  "html body a:visited h2",
  "html body a:visited h3",
  "html body a:visited h4",
  "html body a:visited h5",
  "html body a:visited h6",
  "html body a:visited strong",
  "html body a:visited em",
  "html body a:visited b",
  "html body a:visited i",
  "html body a:visited u",
] as const;

export const visitedLinkColorAncestorTagsAroundAnchor = [
  "div",
  "section",
  "article",
  "main",
  "nav",
  "header",
  "footer",
] as const;

export const visitedLinkColorClassNamesOnAnchor = [
  "link",
  "url",
  "external",
] as const;

export const visitedLinkColorInnerElementTags = [
  "span",
  "div",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "b",
  "i",
  "u",
] as const;
