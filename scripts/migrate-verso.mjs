import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const conn = await mysql.createConnection(url);

const sqls = [
  `CREATE TABLE IF NOT EXISTS \`verso_brand_voice\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`brandName\` varchar(100) NOT NULL DEFAULT '',
    \`brandDesc\` text,
    \`toneKeywords\` json,
    \`toneAvoid\` json,
    \`exampleText\` text,
    \`persona\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`verso_brand_voice_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`verso_brand_voice_userId_fk\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`verso_texts\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`title\` varchar(200) NOT NULL DEFAULT 'Sem título',
    \`category\` varchar(64) NOT NULL,
    \`templateId\` varchar(64) NOT NULL,
    \`content\` text NOT NULL,
    \`toneSnapshot\` json,
    \`inputFields\` json,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`verso_texts_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`verso_texts_userId_fk\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
  )`,
];

for (const sql of sqls) {
  try {
    await conn.execute(sql);
    console.log('✓ OK:', sql.trim().split('\n')[0]);
  } catch (err) {
    console.error('✗ ERROR:', err.message);
  }
}

await conn.end();
console.log('Migration complete.');
