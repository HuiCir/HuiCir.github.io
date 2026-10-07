# KaTeX 0.19.0

Official package: https://registry.npmjs.org/katex/-/katex-0.19.0.tgz

The downloaded archive was verified against its npm SHA512 integrity.
`SOURCE.json` records the archive and retained file hashes. The MIT license is
retained in `LICENSE`.

This project serves only the stylesheet and WOFF2 fonts. The stylesheet was
modified only to remove WOFF/TTF fallback URLs; every retained URL resolves to
a local file under `fonts/`. No external stylesheet, font or renderer is used.

The three formulas in `../../../math.js` were statically compiled through
KaTeX `renderToString` with display mode, HTML+MathML, strict errors and trust
disabled. They can be recompiled with that file's `compile(katex)` API;
`toHTML()` returns the full semantic markup for insertion into `index.html`.
The web page needs only a local stylesheet link, never a JavaScript KaTeX
runtime. Keep `fonts/` beside `katex.min.css` when deploying.
