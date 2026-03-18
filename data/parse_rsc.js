const fs = require('fs');
const filePath = process.argv[2];
const data = fs.readFileSync(filePath, 'utf-8');

const lines = data.split('\n');
const refs = {};
for (const line of lines) {
  const match = line.match(/^([0-9a-f]+):(.+)$/);
  if (match) refs[match[1]] = match[2];
}

// Build ID to name map
const idMap = {};
const idPattern = /"id":"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})","slug":"[^"]+","factionId":"[^"]+","name":"([^"]+)"/g;
let m;
while ((m = idPattern.exec(data)) !== null) {
  idMap[m[1]] = m[2];
}

// Find all upgrade objects
const upgradePattern = /"id":"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})","slug":"([^"]+)","factionId":"[^"]+","name":"([^"]+)","category":"([^"]+)","description":"([^"]*)","iconUrl":[^,]+,"positionX":(\d+),"positionY":(\d+),"maxTiers":(\d+),"tiers":"\$([0-9a-f]+)","prerequisites":"\$([0-9a-f]+)"/g;
const seen = new Set();
const upgrades = [];

while ((m = upgradePattern.exec(data)) !== null) {
  const id = m[1];
  if (seen.has(id)) continue;
  seen.add(id);

  upgrades.push({
    id: m[1], slug: m[2], name: m[3], category: m[4], description: m[5],
    posX: parseInt(m[6]), posY: parseInt(m[7]), maxTiers: parseInt(m[8]),
    tiersRef: m[9], prereqRef: m[10]
  });
}

// Resolve tiers
for (const u of upgrades) {
  u.tiers = [];
  if (refs[u.tiersRef]) {
    const tierRefs = [...refs[u.tiersRef].matchAll(/"\$([0-9a-f]+)"/g)].map(m => m[1]);
    for (const tRef of tierRefs) {
      if (!refs[tRef]) continue;
      const t = refs[tRef];
      const tierNum = t.match(/"tierNumber":(\d+)/);
      const cost = t.match(/"cost":(\d+)/);
      const rank = t.match(/"requiredRank":"([^"]*)"/);
      const effect = t.match(/"effectText":"([^"]*)"/);
      const titleMatch = t.match(/"levelTitle":"([^"]*)"/);
      const costReqMatch = t.match(/"costRequirements":"\$([0-9a-f]+)"/);

      let salvage = [];
      let creditCost = cost ? parseInt(cost[1]) : 0;

      if (costReqMatch && refs[costReqMatch[1]]) {
        const costArr = refs[costReqMatch[1]];
        const costItemRefs = [...costArr.matchAll(/"\$([0-9a-f]+)"/g)].map(m => m[1]);
        for (const cRef of costItemRefs) {
          if (!refs[cRef]) continue;
          const item = refs[cRef];
          const itemName = item.match(/"name":"([^"]+)"/);
          const amount = item.match(/"amount":(\d+)/);
          const category = item.match(/"category":"([^"]+)"/);
          if (itemName && amount) {
            if (category && (category[1] === 'Salvage' || category[1] === 'MATERIAL') && itemName[1] !== 'Credits') {
              salvage.push({ name: itemName[1], quantity: parseInt(amount[1]) });
            } else if (itemName[1] === 'Credits') {
              creditCost = parseInt(amount[1]);
            }
          }
        }
      }

      u.tiers.push({
        tier: tierNum ? parseInt(tierNum[1]) : 0,
        creditCost: creditCost,
        rank: rank ? rank[1] : '',
        effect: effect ? effect[1] : '',
        salvage: salvage,
        title: titleMatch ? titleMatch[1] : ''
      });
    }
  }

  // Resolve prerequisites
  u.prereqNames = [];
  if (refs[u.prereqRef]) {
    const prereqIds = [...refs[u.prereqRef].matchAll(/"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/g)].map(m => m[1]);
    u.prereqNames = prereqIds.map(id => idMap[id] || id);
  }
}

// Sort by position
upgrades.sort((a, b) => a.posX - b.posX || a.posY - b.posY);

// Print
const capstones = upgrades.filter(u => u.category === 'rank');
const regular = upgrades.filter(u => u.category !== 'rank');

console.log('=== CAPSTONES (' + capstones.length + ') ===\n');
for (const u of capstones) {
  const nodesMatch = u.description.match(/Nodes Required: (\d+)/);
  console.log('  ' + u.name + (nodesMatch ? ' (Nodes: ' + nodesMatch[1] + ')' : '') + ' | Rank ' + (u.tiers[0] ? u.tiers[0].rank : '?'));
  console.log('    ' + u.description.substring(0, 120));
}

console.log('\n=== REGULAR UPGRADES (' + regular.length + ') ===\n');
for (const u of regular) {
  console.log(u.name + ' [' + u.category + '] maxTiers=' + u.maxTiers);
  console.log('  Desc: ' + u.description.substring(0, 120));
  if (u.prereqNames.length > 0) console.log('  Prereqs: ' + u.prereqNames.join(', '));
  for (const t of u.tiers) {
    const salvStr = t.salvage.length > 0 ? ' + ' + t.salvage.map(s => s.name + ' x' + s.quantity).join(', ') : '';
    const titleStr = t.title ? ' [' + t.title + ']' : '';
    console.log('    Tier ' + t.tier + ': Rank ' + t.rank + ', ' + t.creditCost + ' cr' + salvStr + (t.effect ? ' -> ' + t.effect : '') + titleStr);
  }
  console.log();
}
