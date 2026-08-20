/**
 * Minimal glyph set for the page backdrop.
 *
 * Each entry is the inner markup of a 24×24 SVG, using `CC` as a colour
 * placeholder that the pattern builder substitutes per theme. Kept as raw
 * strings (not components) because these are serialised into a CSS
 * `background-image` data URI, never mounted into the React tree — a tiled
 * background costs one paint, whereas ~60 mounted SVG elements would cost
 * layout, style and composite work on every scroll.
 */
export type Glyph = string;

const S = 'stroke="CC" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="CC"';

export const GLYPHS: Record<string, Glyph> = {
  /* ---------------------------------------------------------- clothing */
  tshirt: `<path ${S} d="M8 3 4 5.5l1.5 3.5L7.5 8v13h9V8l2 1L20 5.5 16 3a4 4 0 0 1-8 0Z"/>`,
  dress: `<path ${S} d="M9 3h6l-1 4 4 12a18 18 0 0 1-12 0l4-12-1-4Z"/><path ${S} d="M9 7h6"/>`,
  pants: `<path ${S} d="M7 3h10v6l-1 12h-3l-1-9-1 9H8L7 9V3Z"/>`,
  sock: `<path ${S} d="M9 3h5v8.5c0 2 1 3 2.5 4S19 18.5 18 20a3.6 3.6 0 0 1-5.5.4L9 16.5V3Z"/>`,
  hanger: `<path ${S} d="M12 7a2 2 0 1 1 2-2M12 7v2M12 9 4 15.5c-1 .8-.5 2.5.9 2.5h14.2c1.4 0 1.9-1.7.9-2.5L12 9Z"/>`,
  jacket: `<path ${S} d="M8 3 5 5v16h14V5l-3-2-4 3-4-3Z"/><path ${S} d="M12 6v15"/>`,

  /* ---------------------------------------------------------- footwear */
  sneaker: `<path ${S} d="M2 17v-4h5l3.5-3 2 2.5 3 .5c2.5.4 6 1.4 6.5 4H2Z"/><path ${S} d="M7 13v4"/>`,
  boot: `<path ${S} d="M8 3h4v10l7 3.5V21H8V3Z"/><path ${S} d="M12 13H8"/>`,
  sandal: `<path ${S} d="M7 21c-2 0-3-1.5-3-4V7a3 3 0 0 1 6 0v10c0 2.5-1 4-3 4Z"/><path ${S} d="M4.5 9.5 9.5 12M9.5 9.5 4.5 12"/>`,

  /* -------------------------------------------------------------- toys */
  block: `<rect ${S} x="4" y="4" width="16" height="16" rx="3"/><circle ${F} cx="9" cy="9" r="1.4"/><circle ${F} cx="15" cy="15" r="1.4"/>`,
  ball: `<circle ${S} cx="12" cy="12" r="9"/><path ${S} d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>`,
  rocket: `<path ${S} d="M12 2c3 2.5 4.5 6 4.5 10L12 17l-4.5-5C7.5 8 9 4.5 12 2Z"/><path ${S} d="M7.5 14 5 20l4-1.5M16.5 14 19 20l-4-1.5"/><circle ${F} cx="12" cy="9" r="1.6"/>`,
  puzzle: `<path ${S} d="M4 4h6a2 2 0 1 1 4 0h6v6a2 2 0 1 0 0 4v6h-6a2 2 0 1 0-4 0H4v-6a2 2 0 1 0 0-4V4Z"/>`,
  robot: `<rect ${S} x="4" y="8" width="16" height="12" rx="3"/><path ${S} d="M12 4v4M8 4h8"/><circle ${F} cx="9.5" cy="13" r="1.4"/><circle ${F} cx="14.5" cy="13" r="1.4"/>`,

  /* --------------------------------------------------------- soft toys */
  teddy: `<circle ${S} cx="12" cy="14" r="6"/><circle ${S} cx="6.5" cy="7.5" r="3"/><circle ${S} cx="17.5" cy="7.5" r="3"/><circle ${F} cx="10" cy="13" r="1.1"/><circle ${F} cx="14" cy="13" r="1.1"/><path ${S} d="M10 16.5c1.2 1.2 2.8 1.2 4 0"/>`,
  bunny: `<ellipse ${S} cx="12" cy="16" rx="5.5" ry="5"/><path ${S} d="M9 11 7.5 4.5c-.3-1.4 1.4-2 2-.7L12 9M15 11l1.5-6.5c.3-1.4-1.4-2-2-.7L12 9"/><circle ${F} cx="10.3" cy="15.5" r="1"/><circle ${F} cx="13.7" cy="15.5" r="1"/>`,
  cloud: `<path ${S} d="M7 18a4 4 0 0 1 .6-8 5.5 5.5 0 0 1 10.3 1.6A3.4 3.4 0 0 1 17.5 18H7Z"/>`,

  /* ------------------------------------------------------- daily needs */
  bottle: `<path ${S} d="M10 2h4v3l1.5 2v12a3 3 0 0 1-3 3h-1a3 3 0 0 1-3-3V7L10 5V2Z"/><path ${S} d="M8.5 11h7"/>`,
  pacifier: `<circle ${S} cx="12" cy="14" r="4"/><path ${S} d="M4 14a8 8 0 0 1 4-3M20 14a8 8 0 0 0-4-3"/><path ${S} d="M10 8.5a2 2 0 1 1 4 0c0 1.2-2 1.5-2 1.5s-2-.3-2-1.5Z"/>`,
  droplet: `<path ${S} d="M12 3s6 6.4 6 10.4A6 6 0 0 1 6 13.4C6 9.4 12 3 12 3Z"/>`,
  duck: `<path ${S} d="M6 19c-1.5-1.5-2-3.5-2-5a6 6 0 0 1 6-6h1V6a3 3 0 1 1 3 3h-1"/><path ${S} d="M17 8h3l-2 2.5"/><path ${S} d="M4 19h13"/>`,

  /* ---------------------------------------------------------- school */
  backpack: `<path ${S} d="M6 9a6 6 0 0 1 12 0v11H6V9Z"/><path ${S} d="M9 9V6a3 3 0 0 1 6 0v3M6 14h12"/>`,
  pencil: `<path ${S} d="m4 20 1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z"/><path ${S} d="m15 6 3 3"/>`,
  book: `<path ${S} d="M4 4h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v14h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4V4Z"/><path ${S} d="M12 5v14"/>`,

  /* --------------------------------------------------------- nursery */
  crib: `<path ${S} d="M3 8v11M21 8v11M3 11h18M3 18h18"/><path ${S} d="M8 11v7M12 11v7M16 11v7"/>`,
  moon: `<path ${S} d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>`,

  /* ----------------------------------------------------------- shared */
  star: `<path ${F} d="m12 3 2.4 5.6 6 .5-4.6 4 1.4 5.9L12 15.9 6.8 19l1.4-5.9-4.6-4 6-.5L12 3Z"/>`,
  heart: `<path ${F} d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11Z"/>`,
  balloon: `<path ${S} d="M12 15c3.3 0 6-3 6-6.5S15.3 2 12 2 6 5 6 8.5 8.7 15 12 15Z"/><path ${S} d="M12 15v2m0 0-1.5 1.5L12 20l1.5-1.5L12 17Z"/>`,
  spark: `<path ${F} d="m12 5 1.6 4.4L18 11l-4.4 1.6L12 17l-1.6-4.4L6 11l4.4-1.6L12 5Z"/>`,
};

/* ------------------------------------------------- additional glyphs */
/* Added for product imagery and empty states; same CC colour contract. */
Object.assign(GLYPHS, {
  bike: `<circle ${S} cx="6" cy="17" r="3.5"/><circle ${S} cx="18" cy="17" r="3.5"/><path ${S} d="M6 17 10 8h5l3 9M9 8h5M14.5 8 17 13"/>`,
  lotion: `<path ${S} d="M9 8h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"/><path ${S} d="M10 8V5h4v3M13 5V3.5h3"/>`,
  wipes: `<rect ${S} x="3" y="7" width="18" height="12" rx="3"/><path ${S} d="M9 7V5h6v2M10.5 11.5c1.5-1 3 0 3 1.5"/>`,
  cup: `<path ${S} d="M6 8h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8Z"/><path ${S} d="M8 8V5h8v3M18 11h2a2 2 0 0 1 0 4h-2"/>`,
  lunchbox: `<rect ${S} x="3" y="8" width="18" height="12" rx="3"/><path ${S} d="M3 13h18M9 8V5h6v3"/>`,
  crayon: `<path ${S} d="M9 3h6l1 5v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8l1-5Z"/><path ${S} d="M8 8h8"/>`,
  chair: `<path ${S} d="M6 3v10h12V3M6 13v8M18 13v8M4 13h16"/>`,
  dungaree: `<path ${S} d="M7 6h10v15h-4v-8h-2v8H7V6Z"/><path ${S} d="M9 6V3l3 2 3-2v3"/>`,
  cart: `<path ${S} d="M3 4h2l2.5 11h10L20 7H6"/><circle ${F} cx="9" cy="19" r="1.6"/><circle ${F} cx="17" cy="19" r="1.6"/>`,
  bagEmpty: `<path ${S} d="M5 8h14l-1 12H6L5 8Z"/><path ${S} d="M9 8V6a3 3 0 0 1 6 0v2"/>`,
  searchOff: `<circle ${S} cx="11" cy="11" r="6.5"/><path ${S} d="m16 16 4.5 4.5M9 11h4"/>`,
  gift: `<rect ${S} x="3" y="9" width="18" height="12" rx="2"/><path ${S} d="M3 13h18M12 9v12"/><path ${S} d="M12 9S9.5 3.5 7 5.5 12 9 12 9ZM12 9s2.5-5.5 5-3.5S12 9 12 9Z"/>`,
  truck: `<path ${S} d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle ${S} cx="7" cy="18" r="2"/><circle ${S} cx="17.5" cy="18" r="2"/>`,
  shield: `<path ${S} d="M12 3l8 3v6c0 5-3.5 8.2-8 9-4.5-.8-8-4-8-9V6l8-3Z"/><path ${S} d="m9 12 2 2 4-4"/>`,
  leaf: `<path ${S} d="M4 20c0-9 6-15 16-16 0 10-5 15-12 15H4Z"/><path ${S} d="M9 15c2-3 5-5 8-6"/>`,
  refresh: `<path ${S} d="M20 12a8 8 0 1 1-2.3-5.6"/><path ${S} d="M20 3v5h-5"/>`,
  flame: `<path ${S} d="M12 3s5 4.5 5 9a5 5 0 0 1-10 0c0-1.6.6-3 1.5-4 .3 1.2 1 2 2 2 .8 0 1.3-.7 1.3-1.7C11.8 6.5 12 4.6 12 3Z"/>`,
});
