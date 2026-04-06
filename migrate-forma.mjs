import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const conn = await mysql.createConnection(url);

const statements = [
  `CREATE TABLE IF NOT EXISTS \`forma_briefings\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`title\` varchar(200) NOT NULL,
    \`projectType\` varchar(64) NOT NULL,
    \`clientName\` varchar(200) NOT NULL,
    \`clientEmail\` varchar(200) NOT NULL,
    \`publicToken\` varchar(64) NOT NULL,
    \`brandLogoUrl\` text,
    \`brandColorPrimary\` varchar(16) NOT NULL DEFAULT '#000000',
    \`brandColorSecondary\` varchar(16) NOT NULL DEFAULT '#ffffff',
    \`brandNameDisplay\` varchar(200),
    \`openingMessage\` text,
    \`closingMessage\` text,
    \`questionIds\` json NOT NULL,
    \`status\` varchar(32) NOT NULL DEFAULT 'draft',
    \`aiSummary\` text,
    \`aiConcept\` text,
    \`aiNextSteps\` text,
    \`aiGeneratedAt\` timestamp NULL,
    \`sentAt\` timestamp NULL,
    \`answeredAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`forma_briefings_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`forma_responses\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`briefingId\` int NOT NULL,
    \`questionId\` varchar(64) NOT NULL,
    \`questionText\` text NOT NULL,
    \`answer\` text NOT NULL,
    \`isFollowup\` boolean NOT NULL DEFAULT false,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`forma_responses_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`forma_followups\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`briefingId\` int NOT NULL,
    \`question\` text NOT NULL,
    \`answer\` text,
    \`status\` varchar(32) NOT NULL DEFAULT 'pending',
    \`sentAt\` timestamp NOT NULL DEFAULT (now()),
    \`answeredAt\` timestamp NULL,
    CONSTRAINT \`forma_followups_id\` PRIMARY KEY(\`id\`)
  )`,
  `ALTER TABLE \`forma_briefings\` ADD CONSTRAINT \`forma_briefings_userId_fk\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE`,
  `ALTER TABLE \`forma_responses\` ADD CONSTRAINT \`forma_responses_briefingId_fk\` FOREIGN KEY (\`briefingId\`) REFERENCES \`forma_briefings\`(\`id\`) ON DELETE CASCADE`,
  `ALTER TABLE \`forma_followups\` ADD CONSTRAINT \`forma_followups_briefingId_fk\` FOREIGN KEY (\`briefingId\`) REFERENCES \`forma_briefings\`(\`id\`) ON DELETE CASCADE`,
];

for (const sql of statements) {
  try {
    await conn.execute(sql);
    console.log("✓", sql.slice(0, 60).replace(/\n/g, " ").trim());
  } catch (e) {
    if (e.code === "ER_TABLE_EXISTS_ERROR" || e.code === "ER_DUP_KEYNAME" || e.errno === 1826) {
      console.log("⚠ already exists, skipping:", sql.slice(0, 60).replace(/\n/g, " ").trim());
    } else {
      console.error("✗", e.message);
    }
  }
}

await conn.end();
console.log("Migration complete.");
