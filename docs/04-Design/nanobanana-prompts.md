# Nanobanana Asset Prompts

Brand colors: Accent `#7C6AF7` · Background `#0D0F12` · Surface `#161920`

---

## App Icon (1024x1024)

**Primary:**
```
Minimal geometric logomark, letter "C" formed by two overlapping rounded brackets,
soft violet (#7C6AF7) gradient on dark charcoal (#0D0F12) background,
subtle inner glow, developer tool aesthetic, flat design, no text,
centered composition, 1024x1024, app icon style
```

**Variation:**
```
Monogram logo, stylized "C" made of terminal cursor and code brackets,
violet neon glow on near-black background, clean vector style,
silicon valley dev tool branding, square format with rounded corners
```

Export: `.ico` at 16/32/48/256px · `.icns` for macOS · `.png` 512x512 for Linux

---

## README Banner (1280x640)

```
Wide hero banner for developer tool, dark UI (#0D0F12) background with
subtle grid pattern, centered violet (#7C6AF7) glowing terminal window
showing code streaming, soft particle effects, text "Claudette" in
clean geometric sans-serif, tagline "The GUI that Claude Code should
have shipped with" in muted gray, minimal and premium feel, 1280x640
```

Output: `docs/screenshots/banner.png`

---

## Open Graph / Social Preview (1200x630)

```
Social media card for desktop developer app, dark mode screenshot mockup
showing IDE-like interface with sidebar and charts, violet accent color,
frosted glass overlay with app name "Claudette" and tagline,
professional SaaS product aesthetic, 1200x630
```

Output: `docs/screenshots/og-image.png` · also set in GitHub repo settings

---

## Empty State Illustrations (200x200 each)

**No project selected:**
```
Minimal line art illustration, empty chat bubble with subtle violet
outline on transparent/dark background, single color (#7C6AF7),
thin stroke, developer tool empty state, 200x200, flat vector style
```

**CLI not found (onboarding):**
```
Minimal line art, terminal window with question mark cursor,
violet monochrome on dark background, friendly and approachable,
thin geometric strokes, 200x200
```

**No agents yet:**
```
Minimal line art, friendly robot head outline with plus symbol,
violet monochrome (#7C6AF7) on dark background,
simple geometric shapes, 200x200
```

**No sessions:**
```
Minimal line art, empty document stack with clock icon,
violet monochrome (#7C6AF7) on dark (#0D0F12) background,
thin clean strokes, 200x200
```

**No git repo:**
```
Minimal line art, branching path ending in dotted lines,
violet monochrome (#7C6AF7) on dark background,
abstract git branch visualization, 200x200
```

Output: `assets/illustrations/` — use as `<img>` in empty state components

---

## Tips

- Generate at 2x resolution then downscale for HiDPI sharpness
- For the icon: generate 10+ variations, pick the cleanest
- Add "transparent background" or "PNG with alpha" if supported, otherwise use `#0D0F12` to blend
- Avoid "AI", "robot", "brain" imagery — lean into terminal/code/bracket aesthetics
