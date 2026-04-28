# CLAUDE.local.md

Fork-specific notes for this customised TwentyCRM instance. Loaded alongside `CLAUDE.md` (upstream).

## Context

This is a customised TwentyCRM for a financial services business. Customers are companies of three types:

- **Insurance Premium** — insurance brokers (GWP, finance firm relationships, Acturis usage)
- **Accountancy Fee** — accountancy practices (fee income, partners, software stack, accountancy body)
- **Legal Fee** — law firms (fee income, partners, software stack)

The owner is non-developer; engage Claude to implement features and verify in browser.

Dev mode: `yarn start` (WSL2 Ubuntu, local Postgres + Redis). Frontend on `:3001`, backend on `:3000`.

## Customisations in place

### Custom company onboarding form (`/onboard-company`)
- **Page:** `packages/twenty-front/src/pages/companies/OnboardCompany.tsx`
- **Route:** `AppPath.OnboardCompany` in `packages/twenty-shared/src/types/AppPath.ts`, wired in `packages/twenty-front/src/modules/app/hooks/useCreateAppRouter.tsx`
- **Nav entry:** `packages/twenty-front/src/modules/navigation/components/NavigationDrawerOtherSection.tsx` (Other section)
- **Intercept:** all "+ New Company" buttons in record table redirect here via early-return in `packages/twenty-front/src/modules/object-record/record-table/hooks/useCreateNewIndexRecord.ts` (checks `objectMetadataItem.nameSingular === 'company'`)

The form has a `companyType` SELECT and conditionally reveals the right field set:
- Insurance: GWP, GWP Financed, finance firm chain (toggle → name → exclusive → date), Acturis toggle
- Accountancy/Legal: fee income, partner/director count, intl network, practice mgmt sw, GL sw, online payment toggle
- Accountancy only: accountancy body
- Always: domain (mandatory), social media toggle (LinkedIn, X, Bluesky)

### Custom Company fields
Custom fields added via Settings → Data Model → Companies. API names (camelCase) used in form submission:

| Field | Type | Notes |
|---|---|---|
| `companyType` | SELECT | values: `INSURANCE_PREMIUM`, `ACCOUNTANCY_FEE`, `LEGAL_FEE` |
| `grossWrittenPremium` | CURRENCY | GBP, store as `amountMicros` |
| `gwpFinanced` | CURRENCY | |
| `hasOtherFinanceFirm` | BOOLEAN | |
| `otherFinanceFirm` | TEXT | |
| `otherFinanceFirmExclusive` | BOOLEAN | |
| `otherFinanceFirmExclusiveUntil` | DATE | |
| `usesActuris` | BOOLEAN | |
| `feeIncome` | CURRENCY | |
| `partnerDirectorsCount` | NUMBER | note the singular `Partner` |
| `internationalNetwork` | TEXT | |
| `practiceManagementSoftware` | TEXT | |
| `generalLedgerSoftware` | TEXT | |
| `onlinePaymentOption` | BOOLEAN | |
| `accountancyBody` | TEXT | |
| `bluesky` | LINKS | |

`linkedinLink` and `xLink` are built-in Twenty fields (LINKS type).

To verify field API names: query `core."fieldMetadata"` directly (psql isn't installed; use Node + `pg` or the read-only Postgres MCP).

### Field type conventions
- **CURRENCY**: `{ amountMicros: pounds * 1_000_000, currencyCode: 'GBP' }`
- **LINKS**: `{ primaryLinkUrl: 'https://...', primaryLinkLabel: '' }`
- **SELECT**: SCREAMING_SNAKE_CASE string
- After adding any custom field: `npx nx run twenty-front:graphql:generate`

## In-progress / planned

### Companies House lookup on company creation
**Goal:** when a user types a company name in the onboard form, search Companies House and auto-populate company number, registered address, incorporation date, SIC codes.

**Plan:**
1. NestJS endpoint `GET /api/companies-house/search?q=<name>` returning mock data shaped like the real Companies House API response
2. Frontend "Search Companies House" button in `OnboardCompany.tsx` → calls endpoint → shows results dropdown → selecting a result pre-fills fields
3. Later swap mock implementation for real call to `https://api.company-information.service.gov.uk/search/companies` (free API, requires API key)

The fake/mock layer lives on the backend so the frontend doesn't change when real API is wired in.

## Conventions for this fork

- Style with Linaria + `themeCssVariables` from `twenty-ui/theme-constants`
- Use `Toggle`, `Button` from `twenty-ui/input` for native look
- `TextInput` from `@/ui/input/components/TextInput` — `onChange(value: string)` (not an event), no `instanceId` prop
- `PagePanel` is `overflow-y: hidden` — pages that need to scroll must set their own `height: 100%; overflow-y: auto` on a wrapper inside `PageBody`
- `useNavigateApp` for app-route navigation, `useNavigateSettings` for settings
- Currency display: raw number on focus, formatted (`£1,234`) on blur — see `CurrencyInput` in `OnboardCompany.tsx`

## Things to check before changing the form

- Does the field exist in `core."fieldMetadata"` with the API name the form expects?
- Has `graphql:generate` been run since the last field added?
- If adding a SELECT option, the option value is SCREAMING_SNAKE_CASE in submission

## Database access for debugging

Read-only Postgres MCP server is configured (see `.mcp.json`). Use it to verify field metadata, inspect company records, check schema. For writes use the CLI commands in `CLAUDE.md`.
