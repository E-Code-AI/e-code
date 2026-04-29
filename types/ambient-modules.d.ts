declare module 'cookie';
declare module 'cookie-signature';

// react-syntax-highlighter ships JS only; we only use it through the wrapper
// in LightSyntaxHighlighter.tsx and don't rely on its prop typing elsewhere.
declare module 'react-syntax-highlighter';
declare module 'react-syntax-highlighter/dist/cjs/styles/hljs';

// highlight.js language modules are JS-only side-effect imports; the language
// objects are passed straight back into highlight.js' registerLanguage().
declare module 'highlight.js/lib/languages/*';
