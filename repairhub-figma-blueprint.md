# RepairHub Figma Blueprint

## Source
- HTML source: `D:\RepairHub\UI_design_version2.html`
- Scope: multi-screen RepairHub product prototype
- Note: this blueprint was derived from the HTML and CSS because no active Figma target is connected in this session

## Design Direction
- Warm, editorial, sustainability-first product UI
- Cream base with deep green as the primary action color
- Amber for urgency and rewards, blue for trust and verification
- Serif display typography paired with a clean geometric sans
- Rounded cards, 1.5px borders, soft layered shadows, subtle organic blobs

## Figma File Structure
- `00 Cover`
- `01 Foundations`
- `02 Components`
- `10 Home`
- `20 Repair Request`
- `30 Repairer Dashboard`
- `40 Community`
- `50 Client Workspace`

## Frame System
- Desktop frame width: `1440`
- Tablet frame width: `834`
- Mobile frame width: `390`
- Desktop content container: `1120` max width, centered
- Desktop and tablet page padding: `24`
- Mobile page padding: `16`
- Default page top spacing under sticky app nav: `40`
- Standard section spacing: `48`

## Breakpoints From Source
- `900px`: major split layouts collapse to one column
- `700px`: home page link row hides
- `640px`: hero search stacks, mobile padding tightens, some header content wraps
- `600px`: generic 2/3/4-column grids collapse to one column

## Foundations To Build In Figma

### Color Variables
- Cream: `#F6F3EE`
- Cream 2: `#EDE8DF`
- Cream 3: `#E3DDD2`
- Green: `#1D4B20`
- Green Mid: `#2A6430`
- Green Soft: `#3F8447`
- Green Light: `#E6EFE7`
- Green Border: `#B8D4BA`
- Amber: `#B35A1E`
- Amber Mid: `#D06D28`
- Amber Light: `#F4E8DC`
- Amber Border: `#E0B899`
- Blue: `#1A4568`
- Blue Light: `#E2EDF6`
- Blue Border: `#A8C5DC`
- Ink: `#1A1916`
- Ink 60: `#585650`
- Ink 40: `#8F8D87`
- Ink 20: `#C9C7C1`
- Card: `#FDFCF9`
- White: `#FFFFFF`

### Typography Styles
- Display Hero: `Playfair Display`, 500, `44-64`, line height `1.08`, letter spacing `-2%`
- Display Section: `Playfair Display`, 500, `28-32`, line height `1.2`
- Display Stat: `Playfair Display`, 500, `32`
- Heading MD: `Playfair Display`, 500, `20-24`, line height `1.2`
- Body Base: `Plus Jakarta Sans`, 400, `14`, line height `1.6`
- Body SM: `Plus Jakarta Sans`, 400, `13`, line height `1.65`
- Body XS: `Plus Jakarta Sans`, 400, `12`, line height `1.5`
- Overline: `Plus Jakarta Sans`, 600, `11`, uppercase, letter spacing `10%`
- Button MD: `Plus Jakarta Sans`, 600, `13`
- Button LG: `Plus Jakarta Sans`, 600, `15`

### Radius
- `6`, `10`, `16`, `24`, `9999`

### Shadows
- Small: `0 1px 3px rgba(26,25,22,.06), 0 1px 2px rgba(26,25,22,.04)`
- Medium: `0 4px 12px rgba(26,25,22,.08), 0 2px 4px rgba(26,25,22,.04)`
- Large: `0 12px 32px rgba(26,25,22,.10), 0 4px 8px rgba(26,25,22,.04)`

### Core Spacing Scale
- `4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 52`

## Components To Create

### Navigation
- App page tab bar with five tabs: Home, Request, Dashboard, Community, Client
- Sticky top behavior
- Variants: default, hover, active
- Home-only site nav with logo, inline links, and action buttons

### Buttons
- Variants: Primary, Outline, Ghost, Amber
- Sizes: Small, Medium, Large, Full Width
- States: default, hover, disabled

### Tags And Status
- Badge variants: Green, Amber, Blue, Gray
- Dot-badge variant for live states
- Chip component for categories and skills

### Cards
- Base card
- Hover card
- Green card
- Amber card
- Cream card
- Stat card
- DIY tutorial card
- Repairer card
- AI insight card
- Impact banner
- Eco panel
- Chat panel
- Event row
- Forum thread row
- Repair journey card

### Inputs
- Text input
- Select field
- Textarea
- Upload zone
- Date input
- Search cluster for hero

### Identity
- Avatar sizes: `32`, `42`, `52`
- Device icon tile
- Logo mark + wordmark

### Progress And Flow
- Step indicator with four stages
- Progress bar
- Journey track with done, active, todo states
- Review stars
- Table row styles

## Page Inventory

### 10 Home
Create three frames:
- `Home / Desktop / 1440`
- `Home / Tablet / 834`
- `Home / Mobile / 390`

Section order:
- Sticky app tab bar
- Site nav
- Hero with organic blob graphic
- Category search card
- Hero stats row
- Category tiles
- How RepairHub Works
- Featured Repairers
- Impact banner
- Community teaser cards
- Forum and events preview

Responsive rules:
- Hero grid goes from `1.5fr / 1fr` to one column at tablet
- Search cluster becomes single-column at mobile
- Site links hide below `700px`
- Category grid stays two columns until narrow mobile, then stack only if content needs it

### 20 Repair Request
Create the full task flow as separate frames for each breakpoint:
- `Request Step 1 / Desktop`, `Tablet`, `Mobile`
- `Request Step 2 / Desktop`, `Tablet`, `Mobile`
- `Request Step 3 / Desktop`, `Tablet`, `Mobile`
- `Request Step 4 / Desktop`, `Tablet`, `Mobile`

Flow content:
- Step 1: describe item, category, issue, urgency, pickup preference, upload photos
- Step 2: AI diagnosis, severity, time estimate, cost range
- Step 3: choose repairer from compared options
- Step 4: confirm booking, date, notes, secure payment, escrow reassurance

Responsive rules:
- Two-column content stacks at mobile
- Keep step indicator visible at all sizes
- Preserve hierarchy between action buttons and analysis summary

### 30 Repairer Dashboard
Create:
- `Dashboard / Desktop / 1440`
- `Dashboard / Tablet / 834`
- `Dashboard / Mobile / 390`

Section order:
- Greeting header
- Profile completeness card + Go Online CTA
- Four stat cards
- Active Jobs list
- Job history table

Responsive rules:
- Four-up stat grid becomes two-up on tablet and one-up on mobile
- Job action buttons wrap instead of shrinking excessively
- Convert data table to stacked card rows on mobile

### 40 Community
Create:
- `Community / Desktop / 1440`
- `Community / Tablet / 834`
- `Community / Mobile / 390`

Section order:
- Community header
- Green points banner
- DIY tutorial cards
- Forum and events split layout

Responsive rules:
- Tutorial cards: 3-up desktop, 2-up tablet, 1-up mobile
- Forum and events become vertical stack below `600px`

### 50 Client Workspace
Create:
- `Client / Desktop / 1440`
- `Client / Tablet / 834`
- `Client / Mobile / 390`

Section order:
- Dark greeting banner with personal stats
- Filter tabs and new repair CTA
- Active repair journey cards
- Past repairs history
- Right rail: eco panel, chat panel, quick actions

Responsive rules:
- Main `1fr / 360` layout collapses to one column below `900px`
- Right rail moves below the main content on tablet and mobile
- Greeting banner stats stack vertically below `640px`
- Journey labels reduce in size on mobile

## Recommended Figma Improvements
- Inferred recommendation: make the top app tab bar horizontally scrollable on mobile rather than compressing labels
- Inferred recommendation: convert dashboard tables to card rows on mobile for better readability
- Inferred recommendation: keep the right rail cards as independent stacked sections after the main client content, not mixed into the journey list
- Inferred recommendation: use component properties for badge text, icon on/off, and status dot visibility to keep prototype maintenance low

## Prototype Links To Add In Figma
- App tab bar should switch between the five top-level surfaces
- Request flow buttons should move through Steps 1 to 4
- Client "New Repair Request" buttons should jump into the request flow
- Client chat CTA can open the chat panel state or scroll focus to it

## Build Order
1. Create pages and frame presets
2. Build foundations: colors, typography, radius, shadows, spacing
3. Build components with variants
4. Compose desktop frames first
5. Derive tablet frames from desktop
6. Derive mobile frames from tablet with layout reflow
7. Add prototype connections last
