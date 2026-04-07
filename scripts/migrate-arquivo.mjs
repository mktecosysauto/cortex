import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("NO DATABASE_URL"); process.exit(1); }

const conn = await mysql.createConnection(url);

try {
  // arquivo_collections already created in previous run, skip
  console.log("✓ arquivo_collections already exists");

  // Create arquivo_prompts (without JSON default — TiDB doesn't support it inline)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS \`arquivo_prompts\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`collectionId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`title\` varchar(200) NOT NULL,
      \`tags\` json,
      \`prompt\` text NOT NULL,
      \`imgUrl\` text,
      \`isSystem\` boolean NOT NULL DEFAULT false,
      \`displayOrder\` int NOT NULL DEFAULT 0,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`arquivo_prompts_id\` PRIMARY KEY(\`id\`)
    )
  `);
  console.log("✓ arquivo_prompts created");

  // Add FKs (ignore if already exist)
  try {
    await conn.execute(`
      ALTER TABLE \`arquivo_collections\`
      ADD CONSTRAINT \`arquivo_collections_userId_users_id_fk\`
      FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    console.log("✓ FK arquivo_collections -> users");
  } catch (e) { console.log("FK already exists or skipped:", e.message); }

  try {
    await conn.execute(`
      ALTER TABLE \`arquivo_prompts\`
      ADD CONSTRAINT \`arquivo_prompts_collectionId_arquivo_collections_id_fk\`
      FOREIGN KEY (\`collectionId\`) REFERENCES \`arquivo_collections\`(\`id\`)
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    console.log("✓ FK arquivo_prompts -> arquivo_collections");
  } catch (e) { console.log("FK already exists or skipped:", e.message); }

  try {
    await conn.execute(`
      ALTER TABLE \`arquivo_prompts\`
      ADD CONSTRAINT \`arquivo_prompts_userId_users_id_fk\`
      FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    console.log("✓ FK arquivo_prompts -> users");
  } catch (e) { console.log("FK already exists or skipped:", e.message); }

  console.log("\n✅ Migration complete");
} finally {
  await conn.end();
}
