---
name: interface-design
description: This skill is for interface design — dashboards, admin panels, apps, tools, navigation/sidebar patterns, and interactive products. NOT for marketing design (landing pages, marketing sites, campaigns).
---

# Interface Design

Build interface design with craft and consistency.

## Scope

**Use for:** Dashboards, admin panels, SaaS apps, tools, settings pages, data interfaces.

**Not for:** Landing pages, marketing sites, campaigns. Redirect those to `/frontend-design`.

---

# The Problem

You will generate generic output. Your training has seen thousands of dashboards. The patterns are strong.

You can follow the entire process below — explore the domain, name a signature, state your intent — and still produce a template. Warm colors on cold structures. Friendly fonts on generic layouts. "Kitchen feel" that looks like every other app.

This happens because intent lives in prose, but code generation pulls from patterns. The gap between them is where defaults win.

The process below helps. But process alone doesn't guarantee craft. You have to catch yourself.

---

# Where Defaults Hide

Defaults don't announce themselves. They disguise themselves as infrastructure — the parts that feel like they just need to work, not be designed.

**Typography feels like a container.** Pick something readable, move on. But typography isn't holding your design — it IS your design. The weight of a headline, the personality of a label, the texture of a paragraph. These shape how the product feels before anyone reads a word. A bakery management tool and a trading terminal might both need "clean, readable type" — but the type that's warm and handmade is not the type that's cold and precise. If you're reaching for your usual font, you're not designing.

**Navigation feels like scaffolding.** Build the sidebar, add the links, get to the real work. But navigation isn't around your product — it IS your product. Where you are, where you can go, what matters most. A page floating in space is a component demo, not software. The navigation teaches people how to think about the space they're in.

**Data feels like presentation.** You have numbers, show numbers. But a number on screen is not design. The question is: what does this number mean to the person looking at it? What will they do with it? A progress ring and a stacked label both show "3 of 10" — one tells a story, one fills space. If you're reaching for number-on-label, you're not designing.

**Token names feel like implementation detail.** But your CSS variables are design decisions. `--ink` and `--parchment` evoke a world. `--gray-700` and `--surface-2` evoke a template. Someone reading only your tokens should be able to guess what product this is.

The trap is thinking some decisions are creative and others are structural. There are no structural decisions. Everything is design. The moment you stop asking "why this?" is the moment defaults take over.

---

# Intent First

Before touching code, answer these. Not in your head — out loud, to yourself or the user.

**Who is this human?**
Not "users." The actual person. Where are they when they open this? What's on their mind? What did they do 5 minutes ago, what will they do 5 minutes after? A teacher at 7am with coffee is not a developer debugging at midnight is not a founder between investor meetings. Their world shapes the interface.

**What must they accomplish?**
Not "use the dashboard." The verb. Grade these submissions. Find the broken deployment. Approve the payment. The answer determines what leads, what follows, what hides.

**What should this feel like?**
Say it in words that mean something. "Clean and modern" means nothing — every AI says that. Warm like a notebook? Cold like a terminal? Dense like a trading floor? Calm like a reading app? The answer shapes color, type, spacing, density — everything.

If you cannot answer these with specifics, stop. Ask the user. Do not guess. Do not default.

## Every Choice Must Be A Choice

For every decision, you must be able to explain WHY.

- Why this layout and not another?
- Why this color temperature?
- Why this typeface?
- Why this spacing scale?
- Why this information hierarchy?

If your answer is "it's common" or "it's clean" or "it works" — you haven't chosen. You've defaulted. Defaults are invisible. Invisible choices compound into generic output.

**The test:** If you swapped your choices for the most common alternatives and the design didn't feel meaningfully different, you never made real choices.

## Sameness Is Failure

If another AI, given a similar prompt, would produce substantially the same output — you have failed.

This is not about being different for its own sake. It's about the interface emerging from the specific problem, the specific user, the specific context. When you design from intent, sameness becomes impossible because no two intents are identical.

When you design from defaults, everything looks the same because defaults are shared.

## Intent Must Be Systemic

Saying "warm" and using cold colors is not following through. Intent is not a label — it's a constraint that shapes every decision.

If the intent is warm: surfaces, text, borders, accents, semantic colors, typography — all warm. If the intent is dense: spacing, type size, information architecture — all dense. If the intent is calm: motion, contrast, color saturation — all calm.

Check your output against your stated intent. Does every token reinforce it? Or did you state an intent and then default anyway?

---

# Product Domain Exploration

This is where defaults get caught — or don't.

Generic output: Task type → Visual template → Theme
Crafted output: Task type → Product domain → Signature → Structure + Expression

The difference: time in the product's world before any visual or structural thinking.

## Required Outputs

**Do not propose any direction until you produce all four:**

**Domain:** Concepts, metaphors, vocabulary from this product's world. Not features — territory. Minimum 5.

**Color world:** What colors exist naturally in this product's domain? Not "warm" or "cool" — go to the actual world. If this product were a physical space, what would you see? What colors belong there that don't belong elsewhere? List 5+.

**Signature:** One element — visual, structural, or interaction — that could only exist for THIS product. If you can't name one, keep exploring.

**Defaults:** 3 obvious choices for this interface type — visual AND structural. You can't avoid patterns you haven't named.

## Proposal Requirements

Your direction must explicitly reference:
- Domain concepts you explored
- Colors from your color world exploration
- Your signature element
- What replaces each default

**The test:** Read your proposal. Remove the product name. Could someone identify what this is for? If not, it's generic. Explore deeper.

---

# The Mandate

**Before showing the user, look at what you made.**

Ask yourself: "If they said this lacks craft, what would they mean?"

That thing you just thought of — fix it first.

Your first output is probably generic. That's normal. The work is catching it before the user has to.

## The Checks

Run these against your output before presenting:

- **The swap test:** If you swapped the typeface for your usual one, would anyone notice? If you swapped the layout for a standard dashboard template, would it feel different? The places where swapping wouldn't matter are the places you defaulted.

- **The squint test:** Blur your eyes. Can you still perceive hierarchy? Is anything jumping out harshly? Craft whispers.

- **The signature test:** Can you point to five specific elements where your signature appears? Not "the overall feel" — actual components. A signature you can't locate doesn't exist.

- **The token test:** Read your CSS variables out loud. Do they sound like they belong to this product's world, or could they belong to any project?

If any check fails, iterate before showing.

---

# Craft Foundations

## Subtle Layering

This is the backbone of craft. Regardless of direction, product type, or visual style — this principle applies to everything. You should barely notice the system working. When you look at Vercel's dashboard, you don't think "nice borders." You just understand the structure. The craft is invisible — that's how you know it's working.

### Surface Elevation

Surfaces stack. A dropdown sits above a card which sits above the page. Build a numbered system — base, then increasing elevation levels. In dark mode, higher elevation = slightly lighter. In light mode, higher elevation = slightly lighter or uses shadow.

Each jump should be only a few percentage points of lightness. You can barely see the difference in isolation. But when surfaces stack, the hierarchy emerges. Whisper-quiet shifts that you feel rather than see.

**Key decisions:**
- **Sidebars:** Same background as canvas, not different. Different colors fragment the visual space into "sidebar world" and "content world." A subtle border is enough separation.
- **Dropdowns:** One level above their parent surface. If both share the same level, the dropdown blends into the card and layering is lost.
- **Inputs:** Slightly darker than their surroundings, not lighter. Inputs are "inset" — they receive content. A darker background signals "type here" without heavy borders.

### Borders

Borders should disappear when you're not looking for them, but be findable when you need structure. Low opacity rgba blends with the background — it defines edges without demanding attention. Solid hex borders look harsh in comparison.

Build a progression — not all borders are equal. Standard borders, softer separation, emphasis borders, maximum emphasis for focus rings. Match intensity to the importance of the boundary.

**The squint test:** Blur your eyes at the interface. You should still perceive hierarchy — what's above what, where sections divide. But nothing should jump out. No harsh lines. No jarring color shifts. Just quiet structure.

This separates professional interfaces from amateur ones. Get this wrong and nothing else matters.

## Infinite Expression

Every pattern has infinite expressions. **No interface should look the same.**

A metric display could be a hero number, inline stat, sparkline, gauge, progress bar, comparison delta, trend badge, or something new. A dashboard could emphasize density, whitespace, hierarchy, or flow in completely different ways. Even sidebar + cards has infinite variations in proportion, spacing, and emphasis.

**Before building, ask:**
- What's the ONE thing users do most here?
- What products solve similar problems brilliantly? Study them.
- Why would this interface feel designed for its purpose, not templated?

**NEVER produce identical output.** Same sidebar width, same card grid, same metric boxes with icon-left-number-big-label-small every time — this signals AI-generated immediately. It's forgettable.

The architecture and components should emerge from the task and data, executed in a way that feels fresh. Linear's cards don't look like Notion's. Vercel's metrics don't look like Stripe's. Same concepts, infinite expressions.

## Color Lives Somewhere

Every product exists in a world. That world has colors.

Before you reach for a palette, spend time in the product's world. What would you see if you walked into the physical version of this space? What materials? What light? What objects?

Your palette should feel like it came FROM somewhere — not like it was applied TO something.

**Beyond Warm and Cold:** Temperature is one axis. Is this quiet or loud? Dense or spacious? Serious or playful? Geometric or organic? A trading terminal and a meditation app are both "focused" — completely different kinds of focus. Find the specific quality, not the generic label.

**Color Carries Meaning:** Gray builds structure. Color communicates — status, action, emphasis, identity. Unmotivated color is noise. One accent color, used with intention, beats five colors used without thought.

---

# Before Writing Each Component

**Every time** you write UI code — even small additions — state:

```
Intent: [who is this human, what must they do, how should it feel]
Palette: [colors from your exploration — and WHY they fit this product's world]
Depth: [borders / shadows / layered — and WHY this fits the intent]
Surfaces: [your elevation scale — and WHY this color temperature]
Typography: [your typeface — and WHY it fits the intent]
Spacing: [your base unit]
```

This checkpoint is mandatory. It forces you to connect every technical choice back to intent.

If you can't explain WHY for each choice, you're defaulting. Stop and think.

---

# Design Principles

## Token Architecture

Every color in your interface should trace back to a small set of primitives: foreground (text hierarchy), background (surface elevation), border (separation hierarchy), brand, and semantic (destructive, warning, success). No random hex values — everything maps to primitives.

### Text Hierarchy

Don't just have "text" and "gray text." Build four levels — primary, secondary, tertiary, muted. Each serves a different role: default text, supporting text, metadata, and disabled/placeholder. Use all four consistently. If you're only using two, your hierarchy is too flat.

### Border Progression

Borders aren't binary. Build a scale that matches intensity to importance — standard separation, softer separation, emphasis, maximum emphasis. Not every boundary deserves the same weight.

### Control Tokens

Form controls have specific needs. Don't reuse surface tokens — create dedicated ones for control backgrounds, control borders, and focus states. This lets you tune interactive elements independently from layout surfaces.

## Spacing

Pick a base unit and stick to multiples. Build a scale for different contexts — micro spacing for icon gaps, component spacing within buttons and cards, section spacing between groups, major separation between distinct areas. Random values signal no system.

## Padding

Keep it symmetrical. If one side has a value, others should match unless content naturally requires asymmetry.

## Depth

Choose ONE approach and commit:
- **Borders-only** — Clean, technical. For dense tools.
- **Subtle shadows** — Soft lift. For approachable products.
- **Layered shadows** — Premium, dimensional. For cards that need presence.
- **Surface color shifts** — Background tints establish hierarchy without shadows.

Don't mix approaches.

## Border Radius

Sharper feels technical. Rounder feels friendly. Build a scale — small for inputs and buttons, medium for cards, large for modals. Don't mix sharp and soft randomly.

## Typography

Build distinct levels distinguishable at a glance. Headlines need weight and tight tracking for presence. Body needs comfortable weight for readability. Labels need medium weight that works at smaller sizes. Data needs monospace with tabular number spacing for alignment. Don't rely on size alone — combine size, weight, and letter-spacing.

## Card Layouts

A metric card doesn't have to look like a plan card doesn't have to look like a settings card. Design each card's internal structure for its specific content — but keep the surface treatment consistent: same border weight, shadow depth, corner radius, padding scale.

## Controls

Native `<select>` and `<input type="date">` render OS-native elements that cannot be styled. Build custom components — trigger buttons with positioned dropdowns, calendar popovers, styled state management.

## Iconography

Icons clarify, not decorate — if removing an icon loses no meaning, remove it. Choose one icon set and stick with it. Give standalone icons presence with subtle background containers.

## Animation

Fast micro-interactions, smooth easing. Larger transitions can be slightly longer. Use deceleration easing. Avoid spring/bounce in professional interfaces.

## States

Every interactive element needs states: default, hover, active, focus, disabled. Data needs states too: loading, empty, error. Missing states feel broken.

## Navigation Context

Screens need grounding. A data table floating in space feels like a component demo, not a product. Include navigation showing where you are in the app, location indicators, and user context. When building sidebars, consider same background as main content with border separation rather than different colors.

## UFSP2.0 List-Page Side Menus

For `/Users/edwardm/Documents/trae_projects/UFSP2.0`, apply this standard to all list-page side menus, including 问题库, 案例库, 日常监督功能列表页, and 重点领域整改功能列表页.

- Keep menu behavior consistent across list pages. Users move between these pages as one supervision workspace, so different side-menu row heights, active states, collapse density, or parent styles weaken location awareness.
- Use at most two levels. Parent rows organize or collapse groups; leaf rows and standalone first-level rows are page destinations.
- Make parent rows with children and standalone first-level rows share the same row system: `44px` row height, `30px` icon slot in expanded mode, `32px` icon container in collapsed mode, `10px` icon-text gap, `12px` horizontal padding, `4px` radius, and a fixed trailing chevron for expandable rows.
- Use child indentation, not a new visual style, to show hierarchy. Child rows keep the same row height, icon slot, font size, hover style, and active style; use about `24px` left indentation.
- Treat selected and ancestor states separately. Only the current leaf row, current standalone row, or a collapsed parent row representing the current hidden child may use selected background and `font-weight: 600`. An expanded parent whose child is current is only an ancestor state: deep-blue text or a light icon tint is allowed, but no bold text and no selected background.
- Use the top bar color system for menu emphasis: derive brand from `#2A487E -> #4A6FA8`; use a low-saturation blue-gray active row, deep-blue text, and a translucent deep-blue icon background. Do not use bright blue fills, thick left active bars, gradient active rows, strong shadows, oversized rounded corners, or solid blue icon badges.
- Keep the module logo separate from menu item treatment. The logo is identity, not navigation; do not put a border, pale icon box, solid badge, or menu-item icon-slot background around it. Prefer a plain top-bar-blue line icon beside the module title.
- Put the menu collapse/expand control in the sidebar header area or the top of the collapsed rail. Do not place a lonely collapse button in the lower empty area. Use a small, quiet icon button around `28px`, without shadow or heavy border.
- In collapsed mode, every visible icon row keeps the same `44px` rhythm regardless of whether it has children. A collapsed parent that contains the current page may take the selected icon feedback so the user still knows where they are.

## Dark Mode

Dark interfaces have different needs. Shadows are less visible on dark backgrounds — lean on borders for definition. Semantic colors (success, warning, error) often need slight desaturation. The hierarchy system still applies, just with inverted values.

---

# Avoid

- **Harsh borders** — if borders are the first thing you see, they're too strong
- **Dramatic surface jumps** — elevation changes should be whisper-quiet
- **Inconsistent spacing** — the clearest sign of no system
- **Mixed depth strategies** — pick one approach and commit
- **Missing interaction states** — hover, focus, disabled, loading, error
- **Dramatic drop shadows** — shadows should be subtle, not attention-grabbing
- **Large radius on small elements**
- **Pure white cards on colored backgrounds**
- **Thick decorative borders**
- **Gradients and color for decoration** — color should mean something
- **Multiple accent colors** — dilutes focus
- **Different hues for different surfaces** — keep the same hue, shift only lightness

---

# Workflow

## Communication
Be invisible. Don't announce modes or narrate process.

**Never say:** "I'm in ESTABLISH MODE", "Let me check system.md..."

**Instead:** Jump into work. State suggestions with reasoning.

## Suggest + Ask
Lead with your exploration and recommendation, then confirm:
```
"Domain: [5+ concepts from the product's world]
Color world: [5+ colors that exist in this domain]
Signature: [one element unique to this product]
Rejecting: [default 1] → [alternative], [default 2] → [alternative], [default 3] → [alternative]

Direction: [approach that connects to the above]"

[Ask: "Does that direction feel right?"]
```

## If Project Has system.md
Read `.interface-design/system.md` and apply. Decisions are made.

## If No system.md
1. Explore domain — Produce all four required outputs
2. Propose — Direction must reference all four
3. Confirm — Get user buy-in
4. Build — Apply principles
5. **Evaluate** — Run the mandate checks before showing
6. Offer to save

---

# After Completing a Task

When you finish building something, **always offer to save**:

```
"Want me to save these patterns for future sessions?"
```

If yes, write to `.interface-design/system.md`:
- Direction and feel
- Depth strategy (borders/shadows/layered)
- Spacing base unit
- Key component patterns

### What to Save

Add patterns when a component is used 2+ times, is reusable across the project, or has specific measurements worth remembering. Don't save one-off components, temporary experiments, or variations better handled with props.

### Consistency Checks

If system.md defines values, check against them: spacing on the defined grid, depth using the declared strategy throughout, colors from the defined palette, documented patterns reused instead of reinvented.

This compounds — each save makes future work faster and more consistent.

---

# Deep Dives

For more detail on specific topics:
- `references/principles.md` — Code examples, specific values, dark mode
- `references/validation.md` — Memory management, when to update system.md
- `references/critique.md` — Post-build craft critique protocol

# Commands

- `/interface-design:status` — Current system state
- `/interface-design:audit` — Check code against system
- `/interface-design:extract` — Extract patterns from code
- `/interface-design:critique` — Critique your build for craft, then rebuild what defaulted

---

# UFSP2.0 Business List Page Addendum

Use these project-specific rules when designing or revising 财会监督V2.0 business list pages:

- For list pages with both status tabs and a left tree/catalog, the tab bar sits one level above the tree and table, spanning the whole business panel. Do not place status tabs only inside the right table region.
- The left tree/catalog should support collapse when it consumes horizontal space. Put the collapse handle on the vertical split line between tree and table; expanded state uses a left arrow, collapsed state uses a right arrow.
- Evaluate divider lines in UFSP list pages instead of deleting all of them. Keep structural lines that clarify hierarchy, such as the tab-bar baseline, tree/table split line, table grid, and form title baseline; remove redundant full-width lines under toolbars, selection notes, and pagination.
- Keep the business list density close to the Axure standard: 32px controls, 32px table rows, 4px radius, white panels, subtle shadows rather than heavy borders.
- Use button levels consistently: primary blue for the main flow action, blue-outline secondary for import/export/batch/query-scheme actions, neutral tertiary for reset/cancel/back, danger for delete/destructive actions, and blue text buttons for table row actions.
- When professional SVG/iconfont assets are provided or already downloaded for UFSP pages, use those SVG originals for primary navigation and toolbar icons. Do not self-draw replacement paths, and do not use Lucide/Ant Design/etc. as main menu or toolbar icons unless no professional SVG source exists.
- Keep menu and toolbar icon sizing as separate systems. Left feature-menu icons use a 30px visible icon container, 34px in collapsed mode, and may use per-source optical scaling because downloaded SVG viewBoxes and padding differ. Toolbar icons use a strict 14px by 14px frame; rectangular SVGs must preserve aspect ratio with the longest side at 14px, and toolbar icons must not inherit menu optical scaling.
- Choose business-semantic icons, not generic file-transfer icons, for business nodes: use submit/send-review semantics for `上报/提交`, dispatch/distribution semantics for `下发/分发`, verification semantics for `审核/校验`, reminder semantics for `督办`, and search semantics for `查询`.
- Search in the toolbar uses a primary icon button; refresh, filter, and column settings use secondary icon buttons.
- Right-side list toolbar search controls are a fixed UFSP component group. For business list pages such as 工作台账录入, 工作台账审核, and 案例库一般案例管理, use exactly this order and component treatment: `ufsp-search-box ufsp-filter-input` input with placeholder `请输入`, `ufsp-icon-btn ufsp-icon-btn-primary` search button, `ufsp-icon-btn ufsp-icon-btn-secondary` refresh button, `ufsp-icon-btn ufsp-icon-btn-secondary` filter button, `ufsp-btn ufsp-btn-secondary` query-scheme button, and `ufsp-icon-btn ufsp-icon-btn-secondary` column-settings button. Keep controls at `32px`, input width `240px`, radius `4px`, toolbar gap `8px`, subtle shadows, and `14px` toolbar icons. Use a gear/settings icon for column settings; do not substitute tag, filter, or decorative icons.
- Import and export actions should use matching semantic line icons at 14px, centered with text and 6px icon-text gap.
- Business list add actions use the fixed label `新增`; do not label the main toolbar button `手工新增` or `人工新增`. Put the choice of add method inside the subsequent modal, drawer, or form.
- For case-library pages, source type is a shared business dimension. The left source tree, list source-type column, list/filter source options, add/edit source-type dropdown, and related analysis filters must use the same source value set; when adding, removing, or renaming a source type, update all of these surfaces and the page spec together.
- For case-library general-case pages, list status must mirror the lifecycle tabs. Use `待入库`, `已入库`, `不入库`, and `已停用` for the list status column, filter options, overview copy, mock data, and page spec; do not introduce a separate processing-status vocabulary for the same rows.
- Reuse confirmed UFSP iconfont/SVG originals for main toolbar actions: `action-add` for add, `action-import` for import, `action-export` for export, and submit/check semantics for submit-or-store batch actions. Do not mix Lucide, Ant Design, or self-drawn icons into the same confirmed toolbar pattern.
- Name lifecycle batch actions by the business result. For case-library pages use `批量入库`, not `批量确认入库`; do not add standalone danger `X` toolbar buttons unless the action is truly delete/destructive.
- For horizontally scrollable business tables, freeze the checkbox column on the left, freeze the primary identity column next to it, and freeze the operations column on the right. The frozen cells must keep the same normal, hover, and selected row backgrounds as the rest of the row.
- Do not put left/right padding on the scroll container that owns sticky table columns. Sticky `right: 0` attaches to the scroll container's inner edge, so horizontal padding makes the operations column bleed into the gutter while dragging. Put page spacing on an outer wrapper or margin instead. The scroll container should clip the table with `overflow: auto`, `border-radius: 4px`, and an opaque background; sticky cells should use opaque backgrounds/background clipping, and the right operations column should include a subtle left separator such as `box-shadow: -1px 0 0 #E4E4E4`.
- For full-page add/edit/process forms, reuse `ufsp-form-head`, `ufsp-form-title`, and `ufsp-form-actions`. When a primary flow action other than save exists, place `保存` immediately to its left and style it as a blue-outline secondary button. Full-page add/edit forms without a right AI column use a four-column field grid by default; only process pages that reserve a separate right column for AI overview/suggestions should reduce the left form to a three-column `ufsp-ledger-form-grid`. Add/edit forms are data-entry states: after the form header, show section titles and fields directly. Do not reuse detail-page summary blocks, status summaries, detail tabs, usage statistic cards, or other read-only structures in add/edit pages. For pure add pages, keep only the current primary action `保存` in the header unless the user explicitly confirms submit/store/publish actions for that page. Keep the body at about 24px horizontal padding, 16px section-to-field rhythm, 14px/22px labels, 8px label-control spacing, and 32px controls with 4px radius.
- Default pagination for main lists is the centered compact pattern: total count, previous, current page, next, and page-size selector. Add a jump-to-page input only when the dataset or business scenario requires it.
- Avoid visible demo copy in the UI. Prototype-only口径 belongs in `spec.md`, not in the business page surface.

# UFSP2.0 AI Consistency Check Addendum

Use these project-specific rules when designing AI佐证一致性校验、审核校验 or similar evidence-comparison workspaces:

- Do not add state chips, warning labels, or buttons just because there is room in the header. Before adding any element, check whether the same status or action is already expressed by the conclusion area, left list, or row-level actions; remove duplicates.
- Header actions are page-level only. Use actions such as `刷新状态`, `推理过程`, and `提交`. Do not place `处理异常项` in the header when the detail region already provides current-data processing.
- AI evidence results are returned per data item/project, not per field. Do not put `保存`, `修改录入`, or `补充附件` actions on every field/fact row. Put one current-data-level `修改` entry in the abnormal-detail header. The action should open the original-system-style full edit page, not a custom quick-edit drawer; saving that edit page returns to the check workspace and starts async checking for the selected data item.
- After current-data changes are saved, show an async checking state: the left project row becomes grey/disabled and cannot be selected or submitted; the right panel shows `正在校验`. The header action should be `刷新状态`, which refreshes the validation-result state and re-enables the row when results are available.
- The primary submit button should remain `提交`. If unresolved issues still exist after the click, show an objection-record dialog; only the dialog confirmation uses `仍然提交`. This dialog is not a simple warning: users must fill an explanation or upload one or more proof screenshots before `仍然提交` is enabled, and the only actions should be `取消` and `仍然提交`.
- Conclusion areas should answer one question first: whether the current project is fully consistent. Show the conclusion, current project context, and concise counts before any detail. Avoid repeating the same conclusion as both a header chip and an in-card badge.
- Conclusion layout should be integrated into the page, not drawn as a stack of metric cards. Use a white workspace, a short vertical status line, strong title text, supporting copy, and compact inline statistics separated by spacing or soft row dividers.
- For batch submission, the left project list contains exactly the items carried in from the list page. Each item is checked by default and only checked items participate in `提交`; do not show unrelated mock rows that the user did not select.
- If the source list uses dynamic table headers, do not hand-pick identity fields such as project name, unit, or region for the check workspace. Show a row snapshot table instead: sticky checkbox and carried-in order number on the left, the original row fields rendered from the same column metadata, horizontal scrolling for overflow fields, and sticky validation result on the right. Do not display the original table row number again; the carried-in order is the cross-reference for item 1/2/3. Keep columns compact; truncate long cell text by default and reveal the full value on hover instead of widening every column.
- Left-side summary should act as a compact filter, not a description area. Use `全部数据 / 全部一致 / 存在异常` as clickable filters when users need to quickly find items to process. Remove low-value copy such as submission mode labels, source explanations, and repeated count sentences.
- Left-side summary and project rows should be borderless or nearly borderless. Prefer text hierarchy, selected-row tint, checkbox state, small red exception count, rounded row surfaces, and whitespace. Avoid card-looking project rows, boxed stat cards, sharp rectangles, or large enclosed panels.
- Issue details should be organized as a review report: field name and field conclusion first, then one or more fact rows. Each fact row must show the original input text, matched attachment/source, original evidence text, issue type, reasoning, and suggested correction.
- For rich text fields such as `整改措施` and `问题描述`, never compare only one formatted summary. Split the input into all key facts first, then match evidence for each fact without omission. Display the original raw descriptions so users can judge whether the AI comparison is valid.
- Fact rows for rich text should not be compressed into two generic text boxes. Each extracted fact needs a readable row with fact label, original input paragraph, evidence attachment name/page, original evidence paragraph, mismatch type, reasoning, and correction suggestion.
- Use subtle surfaces and spacing to show hierarchy. Avoid stacking heavy cards inside cards, large empty panels, decorative status blocks, and full-width dividers that do not clarify the workflow.
- Do not solve hierarchy by adding more borders, shadows, vertical accent bars, or nested cards. In this project, AI check workspaces should use borderless information bands, shallow background grouping, rounded row surfaces, row rhythm, and typography instead.
- Before stacking labels vertically, evaluate available horizontal space. Compact section headers should place title, short helper text, counts, and lightweight actions on one row when width allows; vertical stacking is only for narrow containers or genuinely separate information groups.
- Avoid full-height accent bars or hard vertical selection lines in list/detail regions. Use selected background, rounded row surfaces, text weight, small status text, or compact pills instead.
- Current-data-level action buttons must keep component proportions: 30-32px height, enough horizontal padding, 4-8px radius depending on context, and readable but not oversized text. Do not use tiny buttons with large text or cramped padding.
