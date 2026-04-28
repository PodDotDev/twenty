// Seeds the Keys Finance workspace with 10 fictional UK insurance brokers
// across the customer lifecycle (just-onboarded → CH confirmed → contacted →
// active deal → customer), plus realistic contacts, notes, opportunities, and
// tasks distributed across TODO / IN_PROGRESS / DONE.
//
// Idempotent: wipes all CRM records in the workspace schema first.
//
// Pre-flight: `companyNumber` (TEXT), `incorporationDate` (DATE), and
// `sicCodes` (TEXT) must already exist as custom Company fields. Add them via
// Settings → Data Model → Companies, then run `npx nx run twenty-front:graphql:generate`.
//
// Run: node packages/twenty-server/scripts/seed-insurance-demo.js

const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ENV_PATH = path.join(__dirname, '..', '.env');
const PG_URL = (() => {
  const env = fs.readFileSync(ENV_PATH, 'utf8');
  const match = env.match(/^PG_DATABASE_URL=(.+)$/m);
  if (!match) throw new Error('PG_DATABASE_URL not found in ' + ENV_PATH);
  return match[1].trim();
})();

const WORKSPACE_DISPLAY_NAME = 'Keys Finance';

const uuidToBase36 = (uuid) =>
  BigInt('0x' + uuid.replace(/-/g, '')).toString(36);

const block = (text) =>
  JSON.stringify([
    {
      id: 'block-' + randomUUID().slice(0, 8),
      type: 'paragraph',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      },
      content: [{ type: 'text', text, styles: {} }],
      children: [],
    },
  ]);

const daysAgo = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
};
const daysAhead = (n) => daysAgo(-n);

// Lifecycle stages: onboarded → ch_confirmed → contacted → active → customer
const BROKERS = [
  {
    name: 'Penbridge Insurance Brokers Ltd',
    domain: 'penbridge.co.uk',
    city: 'London', postcode: 'EC2A 4DP', street: '12 Bishopsgate',
    employees: 42, gwp: 18_500_000, gwpFinanced: 6_200_000,
    companyNumber: '08293492', incorporationDate: '2012-11-04', sic: '66220',
    actuirs: true, daysAgo: 1, stage: 'onboarded', icp: false,
    linkedin: 'https://www.linkedin.com/company/penbridge-insurance',
  },
  {
    name: 'Hargate & Coombe Underwriting Ltd',
    domain: 'hargatecoombe.co.uk',
    city: 'Manchester', postcode: 'M2 4WU', street: '8 King Street',
    employees: 28, gwp: 9_750_000, gwpFinanced: 3_100_000,
    companyNumber: '11042857', incorporationDate: '2017-08-22', sic: '66220',
    actuirs: false, daysAgo: 3, stage: 'onboarded', icp: false,
    linkedin: 'https://www.linkedin.com/company/hargate-coombe',
  },
  {
    name: 'Westmere Risk Partners LLP',
    domain: 'westmere-risk.co.uk',
    city: 'Bristol', postcode: 'BS1 4ST', street: '40 Queen Square',
    employees: 56, gwp: 24_300_000, gwpFinanced: 9_800_000,
    companyNumber: 'OC396521', incorporationDate: '2014-03-17', sic: '66220',
    actuirs: true, daysAgo: 16, stage: 'ch_confirmed', icp: true,
    linkedin: 'https://www.linkedin.com/company/westmere-risk-partners',
  },
  {
    name: 'Northwood Marine & Cargo Ltd',
    domain: 'northwoodmarine.com',
    city: 'Southampton', postcode: 'SO14 3HG', street: '22 Ocean Way',
    employees: 19, gwp: 7_200_000, gwpFinanced: 2_400_000,
    companyNumber: '09418273', incorporationDate: '2015-01-29', sic: '66220',
    actuirs: false, daysAgo: 21, stage: 'ch_confirmed', icp: false,
    linkedin: 'https://www.linkedin.com/company/northwood-marine',
  },
  {
    name: 'Cresswell Insurance Services Ltd',
    domain: 'cresswell-ins.co.uk',
    city: 'Leeds', postcode: 'LS1 5DL', street: '5 Park Row',
    employees: 73, gwp: 31_400_000, gwpFinanced: 12_700_000,
    companyNumber: '07215984', incorporationDate: '2010-05-11', sic: '66220',
    actuirs: true, daysAgo: 33, stage: 'contacted', icp: true,
    linkedin: 'https://www.linkedin.com/company/cresswell-insurance',
  },
  {
    name: 'Ardenfield Specialty Risk Ltd',
    domain: 'ardenfield.co.uk',
    city: 'Birmingham', postcode: 'B3 2DT', street: '15 Colmore Row',
    employees: 34, gwp: 13_900_000, gwpFinanced: 4_800_000,
    companyNumber: '10573642', incorporationDate: '2016-12-08', sic: '66220',
    actuirs: false, daysAgo: 39, stage: 'contacted', icp: false,
    linkedin: 'https://www.linkedin.com/company/ardenfield-specialty',
  },
  {
    name: 'Tarrington Commercial Insurance Ltd',
    domain: 'tarrington-ci.co.uk',
    city: 'Edinburgh', postcode: 'EH2 4DR', street: '60 George Street',
    employees: 47, gwp: 19_800_000, gwpFinanced: 7_300_000,
    companyNumber: 'SC487192', incorporationDate: '2014-09-19', sic: '66220',
    actuirs: true, daysAgo: 45, stage: 'contacted', icp: true,
    linkedin: 'https://www.linkedin.com/company/tarrington-commercial',
  },
  {
    name: 'Mossvale Insurance Group Ltd',
    domain: 'mossvale.co.uk',
    city: 'Glasgow', postcode: 'G2 4JR', street: '110 St Vincent Street',
    employees: 91, gwp: 42_100_000, gwpFinanced: 17_400_000,
    companyNumber: 'SC392841', incorporationDate: '2008-04-02', sic: '66220',
    actuirs: true, daysAgo: 54, stage: 'active', icp: true,
    linkedin: 'https://www.linkedin.com/company/mossvale-group',
  },
  {
    name: 'Holbrook Underwriting Solutions Ltd',
    domain: 'holbrook-uw.co.uk',
    city: 'Reading', postcode: 'RG1 1AX', street: '3 Forbury Square',
    employees: 38, gwp: 15_600_000, gwpFinanced: 5_400_000,
    companyNumber: '09782314', incorporationDate: '2015-07-14', sic: '66220',
    actuirs: false, daysAgo: 61, stage: 'active', icp: true,
    linkedin: 'https://www.linkedin.com/company/holbrook-underwriting',
  },
  {
    name: 'Gravenhurst Insurance Brokers Ltd',
    domain: 'gravenhurst.co.uk',
    city: 'Cambridge', postcode: 'CB2 1RY', street: '18 Trumpington Street',
    employees: 64, gwp: 28_900_000, gwpFinanced: 11_200_000,
    companyNumber: '06481923', incorporationDate: '2008-02-26', sic: '66220',
    actuirs: true, daysAgo: 87, stage: 'customer', icp: true,
    linkedin: 'https://www.linkedin.com/company/gravenhurst-brokers',
  },
];

const PEOPLE_TEMPLATES = [
  { firstName: 'Eleanor', lastName: 'Whitfield', jobTitle: 'Managing Director' },
  { firstName: 'James', lastName: 'Holloway', jobTitle: 'Finance Director' },
  { firstName: 'Priya', lastName: 'Shah', jobTitle: 'Head of Operations' },
  { firstName: 'Oliver', lastName: 'Bennett', jobTitle: 'Senior Account Executive' },
  { firstName: 'Sophie', lastName: 'Marlow', jobTitle: 'Compliance Officer' },
  { firstName: 'Daniel', lastName: 'Carrington', jobTitle: 'Director of Underwriting' },
  { firstName: 'Charlotte', lastName: 'Pemberton', jobTitle: 'Head of Broking' },
  { firstName: 'Hassan', lastName: 'Iqbal', jobTitle: 'Commercial Director' },
  { firstName: 'Rebecca', lastName: 'Tindall', jobTitle: 'Client Services Manager' },
  { firstName: 'Marcus', lastName: 'Endicott', jobTitle: 'IT & Systems Lead' },
];

const NOTE_TEMPLATES = {
  onboarded: [
    { title: 'Initial CH match review', body: 'Companies House search returned a single high-confidence match. Awaiting owner confirmation before backfilling financial fields.' },
  ],
  ch_confirmed: [
    { title: 'Companies House match confirmed', body: 'CH match confirmed by Padraig. Filed accounts pulled — turnover and headcount look consistent with stated GWP.' },
  ],
  contacted: [
    { title: 'Intro call recap', body: 'Spoke to MD for ~30 mins. They currently use one main IPF — open to a second relationship if pricing on smaller commercial premiums is competitive.' },
    { title: 'Follow-up areas', body: 'They want to see indicative rates on £5k-£25k commercial premiums and a sample portal walkthrough. Send by end of week.' },
  ],
  active: [
    { title: 'Pricing discussion summary', body: 'Walked through tiered pricing model. They pushed back on the >12-month payment plan rate — sending a revised proposal at 11.4% APR.' },
    { title: 'Decision-maker mapping', body: 'MD signs off. FD reviews commercials. Compliance Officer reviews the broker agreement before any go-live.' },
  ],
  customer: [
    { title: 'Onboarding kickoff', body: 'Kickoff call scheduled. Agreed integration approach and a 6-week ramp before full premium routing. Quarterly review cadence agreed.' },
    { title: 'Year-1 GWP target', body: 'Modelled £8m GWP through us in year one based on their commercial book mix. Will track monthly against this target.' },
  ],
};

const TASKS_BY_STAGE = (broker) => {
  const tasks = [];
  const num = broker.companyNumber;
  switch (broker.stage) {
    case 'onboarded':
      tasks.push({ title: `Confirm Companies House match — ${num}`, body: `Verify the CH match for ${broker.name} (number ${num}, incorporated ${broker.incorporationDate}). If correct, the system will backfill turnover, employees and SIC codes from the latest filed accounts.`, status: 'TODO', dueIn: 2 });
      break;
    case 'ch_confirmed':
      tasks.push({ title: 'Update GWP / employees from filed accounts', body: `CH match confirmed. Latest filed accounts pulled — ${broker.employees} employees, GWP ${(broker.gwp/1_000_000).toFixed(1)}m. Verify and adjust if needed.`, status: 'DONE', dueIn: -3 });
      tasks.push({ title: 'Make initial contact', body: 'Open with a short intro: who we are, the IPF model, and a question about their existing finance arrangements. Aim for a 20-min discovery call.', status: 'TODO', dueIn: 4 });
      break;
    case 'contacted':
      tasks.push({ title: 'Update GWP / employees from filed accounts', body: 'Backfilled from filed accounts.', status: 'DONE', dueIn: -25 });
      tasks.push({ title: 'Make initial contact', body: 'Outreach email sent — replied within 48h. Intro call booked.', status: 'DONE', dueIn: -18 });
      tasks.push({ title: 'Follow up after intro call', body: 'Send the indicative rate card and a short pricing example for £5k-£25k commercial premiums. Suggest a follow-up call in 7-10 days.', status: 'IN_PROGRESS', dueIn: 3 });
      break;
    case 'active':
      tasks.push({ title: 'Update GWP / employees from filed accounts', body: 'Backfilled.', status: 'DONE', dueIn: -45 });
      tasks.push({ title: 'Make initial contact', body: 'Done.', status: 'DONE', dueIn: -38 });
      tasks.push({ title: 'Follow up after intro call', body: 'Rate card sent, pricing call held.', status: 'DONE', dueIn: -20 });
      tasks.push({ title: 'Send proposal draft for review', body: 'Draft commercial terms in the proposal template. FD wants 11.4% APR on >12-month plans — confirm we can hit that and send by Friday.', status: 'IN_PROGRESS', dueIn: 5 });
      break;
    case 'customer':
      tasks.push({ title: 'Update GWP / employees from filed accounts', body: 'Done.', status: 'DONE', dueIn: -75 });
      tasks.push({ title: 'Make initial contact', body: 'Done.', status: 'DONE', dueIn: -65 });
      tasks.push({ title: 'Follow up after intro call', body: 'Done.', status: 'DONE', dueIn: -50 });
      tasks.push({ title: 'Send proposal draft for review', body: 'Sent and accepted.', status: 'DONE', dueIn: -28 });
      tasks.push({ title: 'Onboarding kickoff scheduled', body: 'Kickoff call held, integration approach agreed. Quarterly review cadence locked in.', status: 'DONE', dueIn: -10 });
      break;
  }
  return tasks;
};

const OPP_BY_STAGE = (broker) => {
  switch (broker.stage) {
    case 'contacted': return { stage: ['NEW', 'SCREENING'][broker.daysAgo % 2], amount: 120_000, closeIn: 60 };
    case 'active': return { stage: broker.daysAgo > 58 ? 'PROPOSAL' : 'MEETING', amount: 250_000, closeIn: 30 };
    case 'customer': return { stage: 'CUSTOMER', amount: 480_000, closeIn: -5 };
    default: return null;
  }
};

const personEmail = (firstName, lastName, domain) =>
  `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;

const COMPANY_COLS = [
  'id', 'createdAt', 'updatedAt',
  'name',
  'domainNamePrimaryLinkUrl', 'domainNamePrimaryLinkLabel', 'domainNameSecondaryLinks',
  'addressAddressStreet1', 'addressAddressCity', 'addressAddressPostcode', 'addressAddressCountry',
  'employees',
  'linkedinLinkPrimaryLinkUrl', 'linkedinLinkPrimaryLinkLabel', 'linkedinLinkSecondaryLinks',
  'xLinkPrimaryLinkUrl', 'xLinkPrimaryLinkLabel', 'xLinkSecondaryLinks',
  'annualRecurringRevenueAmountMicros', 'annualRecurringRevenueCurrencyCode',
  'idealCustomerProfile', 'position',
  'createdBySource', 'createdByWorkspaceMemberId', 'createdByName', 'createdByContext',
  'updatedBySource', 'updatedByWorkspaceMemberId', 'updatedByName', 'updatedByContext',
  'accountOwnerId',
  'companyType',
  'grossWrittenPremiumAmountMicros', 'grossWrittenPremiumCurrencyCode',
  'gwpFinancedAmountMicros', 'gwpFinancedCurrencyCode',
  'usesActuris', 'hasOtherFinanceFirm',
  'companyNumber', 'incorporationDate', 'sicCodes',
  'pipelineStage',
];

const PIPELINE_STAGE_BY_LIFECYCLE = {
  onboarded: 'NEEDS_ACTION',
  ch_confirmed: 'HIGH_VALUE_LEAD',
  contacted: 'IN_CONVERSATION',
  active: 'ACTIVE_DEAL',
  customer: 'CUSTOMER',
};

const PERSON_COLS = [
  'id', 'createdAt', 'updatedAt',
  'nameFirstName', 'nameLastName',
  'emailsPrimaryEmail', 'emailsAdditionalEmails',
  'jobTitle', 'city',
  'phonesPrimaryPhoneNumber', 'phonesPrimaryPhoneCountryCode', 'phonesPrimaryPhoneCallingCode', 'phonesAdditionalPhones',
  'linkedinLinkPrimaryLinkUrl', 'linkedinLinkPrimaryLinkLabel', 'linkedinLinkSecondaryLinks',
  'xLinkPrimaryLinkUrl', 'xLinkPrimaryLinkLabel', 'xLinkSecondaryLinks',
  'position',
  'createdBySource', 'createdByWorkspaceMemberId', 'createdByName', 'createdByContext',
  'updatedBySource', 'updatedByWorkspaceMemberId', 'updatedByName', 'updatedByContext',
  'companyId',
];

const TASK_COLS = [
  'id', 'createdAt', 'updatedAt',
  'position', 'title', 'bodyV2Blocknote', 'bodyV2Markdown',
  'dueAt', 'status', 'assigneeId',
  'createdBySource', 'createdByWorkspaceMemberId', 'createdByName', 'createdByContext',
  'updatedBySource', 'updatedByWorkspaceMemberId', 'updatedByName', 'updatedByContext',
];

const TASK_TARGET_COLS = [
  'id', 'createdAt', 'updatedAt', 'position',
  'createdBySource', 'createdByWorkspaceMemberId', 'createdByName', 'createdByContext',
  'updatedBySource', 'updatedByWorkspaceMemberId', 'updatedByName', 'updatedByContext',
  'taskId', 'targetCompanyId',
];

const NOTE_COLS = [
  'id', 'createdAt', 'updatedAt',
  'position', 'title', 'bodyV2Blocknote', 'bodyV2Markdown',
  'createdBySource', 'createdByWorkspaceMemberId', 'createdByName', 'createdByContext',
  'updatedBySource', 'updatedByWorkspaceMemberId', 'updatedByName', 'updatedByContext',
];

const NOTE_TARGET_COLS = [
  'id', 'createdAt', 'updatedAt', 'position',
  'createdBySource', 'createdByWorkspaceMemberId', 'createdByName', 'createdByContext',
  'updatedBySource', 'updatedByWorkspaceMemberId', 'updatedByName', 'updatedByContext',
  'noteId', 'targetCompanyId',
];

const OPPORTUNITY_COLS = [
  'id', 'createdAt', 'updatedAt',
  'name', 'amountAmountMicros', 'amountCurrencyCode',
  'closeDate', 'stage', 'position',
  'createdBySource', 'createdByWorkspaceMemberId', 'createdByName', 'createdByContext',
  'updatedBySource', 'updatedByWorkspaceMemberId', 'updatedByName', 'updatedByContext',
  'companyId', 'pointOfContactId', 'ownerId',
];

const insert = async (client, schema, table, columns, rows) => {
  if (rows.length === 0) return;
  const colList = columns.map((c) => `"${c}"`).join(', ');
  const placeholders = rows
    .map(
      (_, rowIdx) =>
        '(' +
        columns
          .map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`)
          .join(', ') +
        ')',
    )
    .join(', ');
  const values = rows.flatMap((row) => columns.map((c) => row[c] ?? null));
  await client.query(
    `INSERT INTO "${schema}"."${table}" (${colList}) VALUES ${placeholders}`,
    values,
  );
};

const main = async () => {
  const client = new Client({ connectionString: PG_URL });
  await client.connect();
  try {
    const wsRes = await client.query(
      'SELECT id FROM core.workspace WHERE "displayName" = $1',
      [WORKSPACE_DISPLAY_NAME],
    );
    if (wsRes.rows.length !== 1) {
      throw new Error(
        `Expected exactly 1 workspace named "${WORKSPACE_DISPLAY_NAME}", found ${wsRes.rows.length}`,
      );
    }
    const workspaceId = wsRes.rows[0].id;
    const schema = 'workspace_' + uuidToBase36(workspaceId);
    console.log(`Workspace: ${workspaceId}  schema: ${schema}`);

    const memberRes = await client.query(
      `SELECT id, "nameFirstName", "nameLastName" FROM "${schema}"."workspaceMember"`,
    );
    if (memberRes.rows.length === 0)
      throw new Error('No workspaceMember rows found');
    const member = memberRes.rows[0];
    const memberId = member.id;
    const memberName = `${member.nameFirstName} ${member.nameLastName}`;
    console.log(`Owner: ${memberName} (${memberId})`);

    const requiredCustomCols = ['companyNumber', 'incorporationDate', 'sicCodes'];
    const colCheck = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'company' AND column_name = ANY($2)`,
      [schema, requiredCustomCols],
    );
    const present = new Set(colCheck.rows.map((r) => r.column_name));
    const missing = requiredCustomCols.filter((c) => !present.has(c));
    if (missing.length) {
      throw new Error(
        `Missing custom Company fields: ${missing.join(', ')}\n` +
          'Add them via Settings → Data Model → Companies before running this script.',
      );
    }

    await client.query('BEGIN');

    console.log('Wiping existing CRM records…');
    for (const table of [
      'taskTarget', 'noteTarget', 'attachment', 'timelineActivity',
      'task', 'note', 'opportunity', 'person', 'company',
    ]) {
      await client.query(`DELETE FROM "${schema}"."${table}"`);
    }

    const baseActor = {
      createdBySource: 'MANUAL',
      createdByWorkspaceMemberId: memberId,
      createdByName: memberName,
      createdByContext: '{}',
      updatedBySource: 'MANUAL',
      updatedByWorkspaceMemberId: memberId,
      updatedByName: memberName,
      updatedByContext: '{}',
    };

    // --- Companies ----------------------------------------------------------
    const companyRows = [];
    const brokerById = new Map();
    BROKERS.forEach((b, idx) => {
      const id = randomUUID();
      brokerById.set(id, b);
      const created = daysAgo(b.daysAgo);
      companyRows.push({
        id, createdAt: created, updatedAt: created,
        name: b.name,
        domainNamePrimaryLinkUrl: `https://${b.domain}`,
        domainNamePrimaryLinkLabel: '',
        domainNameSecondaryLinks: '[]',
        addressAddressStreet1: b.street,
        addressAddressCity: b.city,
        addressAddressPostcode: b.postcode,
        addressAddressCountry: 'United Kingdom',
        employees: b.employees,
        linkedinLinkPrimaryLinkUrl: b.linkedin,
        linkedinLinkPrimaryLinkLabel: '',
        linkedinLinkSecondaryLinks: '[]',
        xLinkPrimaryLinkUrl: '',
        xLinkPrimaryLinkLabel: '',
        xLinkSecondaryLinks: '[]',
        annualRecurringRevenueAmountMicros: null,
        annualRecurringRevenueCurrencyCode: null,
        idealCustomerProfile: b.icp,
        position: (idx + 1) * 1024,
        ...baseActor,
        accountOwnerId: memberId,
        companyType: 'INSURANCE_PREMIUM',
        grossWrittenPremiumAmountMicros: BigInt(b.gwp) * 1_000_000n + '',
        grossWrittenPremiumCurrencyCode: 'GBP',
        gwpFinancedAmountMicros: BigInt(b.gwpFinanced) * 1_000_000n + '',
        gwpFinancedCurrencyCode: 'GBP',
        usesActuris: b.actuirs,
        hasOtherFinanceFirm: false,
        companyNumber: b.companyNumber,
        incorporationDate: b.incorporationDate,
        sicCodes: b.sic,
        pipelineStage: PIPELINE_STAGE_BY_LIFECYCLE[b.stage],
      });
    });
    await insert(client, schema, 'company', COMPANY_COLS, companyRows);

    // --- People (2-4 per broker, used later to set Opportunity pointOfContact)
    const personRows = [];
    const peopleByCompanyId = new Map();
    let personIdx = 0;
    for (const [companyId, broker] of brokerById.entries()) {
      const count = 2 + ((broker.daysAgo + broker.employees) % 3); // 2–4
      const list = [];
      for (let i = 0; i < count; i++) {
        const tpl = PEOPLE_TEMPLATES[(personIdx + i) % PEOPLE_TEMPLATES.length];
        const id = randomUUID();
        const created = daysAgo(broker.daysAgo - 1 < 0 ? 0 : broker.daysAgo - 1);
        list.push({ id, jobTitle: tpl.jobTitle });
        const phone = `7${(700000000 + personIdx * 73 + i * 11).toString().slice(0, 9)}`;
        personRows.push({
          id, createdAt: created, updatedAt: created,
          nameFirstName: tpl.firstName,
          nameLastName: tpl.lastName,
          emailsPrimaryEmail: personEmail(tpl.firstName, tpl.lastName, broker.domain),
          emailsAdditionalEmails: '[]',
          jobTitle: tpl.jobTitle,
          city: broker.city,
          phonesPrimaryPhoneNumber: phone,
          phonesPrimaryPhoneCountryCode: 'GB',
          phonesPrimaryPhoneCallingCode: '+44',
          phonesAdditionalPhones: '[]',
          linkedinLinkPrimaryLinkUrl: '',
          linkedinLinkPrimaryLinkLabel: '',
          linkedinLinkSecondaryLinks: '[]',
          xLinkPrimaryLinkUrl: '',
          xLinkPrimaryLinkLabel: '',
          xLinkSecondaryLinks: '[]',
          position: (personIdx + i + 1) * 1024,
          ...baseActor,
          companyId,
        });
      }
      personIdx += count;
      peopleByCompanyId.set(companyId, list);
    }
    await insert(client, schema, 'person', PERSON_COLS, personRows);

    // --- Opportunities ------------------------------------------------------
    const oppRows = [];
    let oppIdx = 0;
    for (const [companyId, broker] of brokerById.entries()) {
      const opp = OPP_BY_STAGE(broker);
      if (!opp) continue;
      const id = randomUUID();
      const created = daysAgo(Math.max(broker.daysAgo - 5, 1));
      const poc = peopleByCompanyId.get(companyId)?.[0];
      oppRows.push({
        id, createdAt: created, updatedAt: created,
        name: `${broker.name.replace(/ Ltd| LLP/g, '')} — IPF onboarding`,
        amountAmountMicros: BigInt(opp.amount) * 1_000_000n + '',
        amountCurrencyCode: 'GBP',
        closeDate: daysAhead(opp.closeIn),
        stage: opp.stage,
        position: (oppIdx + 1) * 1024,
        ...baseActor,
        companyId,
        pointOfContactId: poc ? poc.id : null,
        ownerId: memberId,
      });
      oppIdx++;
    }
    await insert(client, schema, 'opportunity', OPPORTUNITY_COLS, oppRows);

    // --- Notes --------------------------------------------------------------
    const noteRows = [];
    const noteTargetRows = [];
    let noteIdx = 0;
    for (const [companyId, broker] of brokerById.entries()) {
      const templates = NOTE_TEMPLATES[broker.stage] || [];
      for (const tpl of templates) {
        const id = randomUUID();
        const created = daysAgo(Math.max(broker.daysAgo - 2, 0));
        noteRows.push({
          id, createdAt: created, updatedAt: created,
          position: (noteIdx + 1) * 1024,
          title: tpl.title,
          bodyV2Blocknote: block(tpl.body),
          bodyV2Markdown: tpl.body,
          ...baseActor,
        });
        noteTargetRows.push({
          id: randomUUID(),
          createdAt: created, updatedAt: created,
          position: (noteIdx + 1) * 1024,
          ...baseActor,
          noteId: id,
          targetCompanyId: companyId,
        });
        noteIdx++;
      }
    }
    await insert(client, schema, 'note', NOTE_COLS, noteRows);
    await insert(client, schema, 'noteTarget', NOTE_TARGET_COLS, noteTargetRows);

    // --- Tasks --------------------------------------------------------------
    const taskRows = [];
    const taskTargetRows = [];
    let taskIdx = 0;
    for (const [companyId, broker] of brokerById.entries()) {
      const tasks = TASKS_BY_STAGE(broker);
      for (const t of tasks) {
        const id = randomUUID();
        // DONE tasks: createdAt close to dueAt; TODO/IN_PROGRESS: createdAt recent
        const createdOffset =
          t.status === 'DONE'
            ? Math.max(broker.daysAgo - Math.abs(t.dueIn) - 1, 0)
            : Math.max(broker.daysAgo - 1, 0);
        const created = daysAgo(createdOffset);
        const dueAt = t.dueIn === 0 ? null : daysAhead(t.dueIn);
        taskRows.push({
          id, createdAt: created, updatedAt: created,
          position: (taskIdx + 1) * 1024,
          title: t.title,
          bodyV2Blocknote: block(t.body),
          bodyV2Markdown: t.body,
          dueAt,
          status: t.status,
          assigneeId: memberId,
          ...baseActor,
        });
        taskTargetRows.push({
          id: randomUUID(),
          createdAt: created, updatedAt: created,
          position: (taskIdx + 1) * 1024,
          ...baseActor,
          taskId: id,
          targetCompanyId: companyId,
        });
        taskIdx++;
      }
    }
    await insert(client, schema, 'task', TASK_COLS, taskRows);
    await insert(client, schema, 'taskTarget', TASK_TARGET_COLS, taskTargetRows);

    await client.query('COMMIT');

    const summary = await client.query(`
      SELECT
        (SELECT count(*) FROM "${schema}".company) AS companies,
        (SELECT count(*) FROM "${schema}".person) AS people,
        (SELECT count(*) FROM "${schema}".opportunity) AS opportunities,
        (SELECT count(*) FROM "${schema}".note) AS notes,
        (SELECT count(*) FROM "${schema}".task) AS tasks
    `);
    const taskByStatus = await client.query(
      `SELECT status, count(*) FROM "${schema}".task GROUP BY status ORDER BY status`,
    );
    const oppByStage = await client.query(
      `SELECT stage, count(*) FROM "${schema}".opportunity GROUP BY stage ORDER BY stage`,
    );
    console.log('\nSeeded:', summary.rows[0]);
    console.log('Tasks by status:', taskByStatus.rows);
    console.log('Opportunities by stage:', oppByStage.rows);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    await client.end();
  }
};

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
