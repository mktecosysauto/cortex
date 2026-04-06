import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

const sqls = [
  `CREATE TABLE IF NOT EXISTS verso_brand_voice (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    brandName VARCHAR(100) NOT NULL DEFAULT '',
    brandDesc TEXT,
    toneKeywords JSON,
    toneAvoid JSON,
    exampleText TEXT,
    persona TEXT,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS verso_texts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    title VARCHAR(200) NOT NULL DEFAULT 'Sem título',
    category VARCHAR(64) NOT NULL,
    templateId VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    toneSnapshot JSON,
    inputFields JSON,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  )`,
];

for (const sql of sqls) {
  try {
    await conn.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    console.error("ERR:", e.message);
  }
}

await conn.end();
console.log("Migration complete");
