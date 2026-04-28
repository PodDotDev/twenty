// Promotes a tab to the first position on the record page layout for an object,
// and sets it as the default focused tab. Use --reset to restore standard
// positions and clear the default-focus override.
//
// Usage:
//   node packages/twenty-server/scripts/promote-record-page-tab.js company Tasks
//   node packages/twenty-server/scripts/promote-record-page-tab.js company --reset
//   node packages/twenty-server/scripts/promote-record-page-tab.js person Notes
//
// Object name is the singular metadata name (company, person, opportunity, …).
// Tab title is the visible label, case-insensitive.

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const PG_URL = (() => {
  const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  const m = env.match(/^PG_DATABASE_URL=(.+)$/m);
  if (!m) throw new Error('PG_DATABASE_URL missing from packages/twenty-server/.env');
  return m[1].trim();
})();

const WORKSPACE_DISPLAY_NAME = 'Keys Finance';
const PROMOTED_POSITION = 5;

// Standard positions Twenty ships with (see standard-page-layout-tabs.template.ts)
const STANDARD_POSITIONS = {
  Home: 10,
  Timeline: 20,
  Tasks: 30,
  Notes: 40,
  Files: 50,
  Emails: 60,
  Calendar: 70,
};

const usage = () => {
  console.error(
    'Usage:\n' +
      '  node promote-record-page-tab.js <objectSingular> <Tab Title>\n' +
      '  node promote-record-page-tab.js <objectSingular> --reset',
  );
  process.exit(2);
};

const main = async () => {
  const objectSingular = process.argv[2];
  const arg = process.argv[3];
  if (!objectSingular || !arg) usage();
  const isReset = arg === '--reset';

  const client = new Client({ connectionString: PG_URL });
  await client.connect();
  try {
    const wsRes = await client.query(
      'SELECT id FROM core.workspace WHERE "displayName" = $1',
      [WORKSPACE_DISPLAY_NAME],
    );
    if (wsRes.rows.length !== 1) {
      throw new Error(`Workspace "${WORKSPACE_DISPLAY_NAME}" not found`);
    }
    const workspaceId = wsRes.rows[0].id;

    const layoutRes = await client.query(
      `SELECT pl.id, pl.name
       FROM core."pageLayout" pl
       JOIN core."objectMetadata" om ON pl."objectMetadataId" = om.id
       WHERE pl."workspaceId" = $1
         AND om."nameSingular" = $2
         AND pl.type = 'RECORD_PAGE'
         AND pl."deletedAt" IS NULL`,
      [workspaceId, objectSingular],
    );
    if (layoutRes.rows.length === 0) {
      throw new Error(`No RECORD_PAGE layout found for object "${objectSingular}"`);
    }
    const layout = layoutRes.rows[0];
    console.log(`Layout: ${layout.name} (${layout.id})`);

    const tabsRes = await client.query(
      `SELECT id, title, position FROM core."pageLayoutTab"
       WHERE "pageLayoutId" = $1 AND "deletedAt" IS NULL
       ORDER BY position`,
      [layout.id],
    );
    console.log('\nBefore:');
    console.table(tabsRes.rows.map(({ title, position }) => ({ title, position })));

    if (isReset) {
      for (const tab of tabsRes.rows) {
        const standard = STANDARD_POSITIONS[tab.title];
        if (standard !== undefined && standard !== Number(tab.position)) {
          await client.query(
            `UPDATE core."pageLayoutTab" SET position = $1 WHERE id = $2`,
            [standard, tab.id],
          );
        }
      }
      await client.query(
        `UPDATE core."pageLayout" SET "defaultTabToFocusOnMobileAndSidePanelId" = NULL WHERE id = $1`,
        [layout.id],
      );
      console.log('\nReset to standard positions; cleared default-focus override.');
    } else {
      const target = tabsRes.rows.find(
        (t) => t.title.toLowerCase() === arg.toLowerCase(),
      );
      if (!target) {
        throw new Error(
          `Tab "${arg}" not found on ${objectSingular} layout. Available: ` +
            tabsRes.rows.map((t) => t.title).join(', '),
        );
      }
      await client.query(
        `UPDATE core."pageLayoutTab" SET position = $1 WHERE id = $2`,
        [PROMOTED_POSITION, target.id],
      );
      await client.query(
        `UPDATE core."pageLayout" SET "defaultTabToFocusOnMobileAndSidePanelId" = $1 WHERE id = $2`,
        [target.id, layout.id],
      );
      console.log(
        `\nPromoted "${target.title}" to position ${PROMOTED_POSITION}; set as default focused tab.`,
      );
    }

    const after = await client.query(
      `SELECT title, position FROM core."pageLayoutTab"
       WHERE "pageLayoutId" = $1 AND "deletedAt" IS NULL
       ORDER BY position`,
      [layout.id],
    );
    console.log('\nAfter:');
    console.table(after.rows);
  } finally {
    await client.end();
  }
};

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
