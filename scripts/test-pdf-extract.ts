import { parseHourglassPDFs } from '../src/parser/index.js';

async function test() {
  try {
    console.log('=== COMBINED PARSER TEST ===\n');

    const weeks = await parseHourglassPDFs(
      './midweek_2026-02.pdf',
      './weekend_2026-02.pdf'
    );

    for (const week of weeks) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`WEEK OF: ${week.weekOf}`);
      console.log(`Midweek: ${week.midweekDate} | Weekend: ${week.weekendDate}`);
      console.log(`WT Conductor: ${week.wtConductor}`);
      console.log(`${'='.repeat(60)}`);

      console.log('\n--- Unavailable for ALL AV ---');
      console.log(week.unavailableForAV.join(', ') || '(none)');

      console.log('\n--- Unavailable for MIC only ---');
      console.log(week.unavailableForMic.join(', ') || '(none)');

      console.log('\n--- Midweek Parts ---');
      for (const part of week.midweekParts) {
        const constraint = part.partType.includes('chairman') ? '[NO AV]' :
                          part.partType.includes('gems') || part.partType.includes('reading') ? '[NO MIC]' : '';
        console.log(`  ${part.partType}: ${part.assignedBrother} ${constraint}`);
      }

      console.log('\n--- Weekend Parts ---');
      for (const part of week.weekendParts) {
        const constraint = part.partType === 'wt_conductor' ? '[NO AV]' :
                          part.partType.includes('chairman') || part.partType.includes('talk') || part.partType.includes('reader') ? '[NO MIC]' : '';
        console.log(`  ${part.partType}: ${part.assignedBrother} ${constraint}`);
      }
    }
  } catch (e) {
    console.error('Error:', (e as Error).message);
    console.error(e);
  }
}

test();
