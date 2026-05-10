import { createConnection } from "mysql2/promise";
import { env } from "../api/lib/env";

async function main() {
  const url = new URL(env.databaseUrl);
  const connection = await createConnection({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.replace("/", ""),
    ssl: { rejectUnauthorized: false },
  });

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS crawl_tasks (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      source_url TEXT NOT NULL,
      platform VARCHAR(50) NOT NULL,
      status ENUM('pending','running','completed','failed') DEFAULT 'pending',
      title VARCHAR(500),
      content TEXT,
      extracted_company VARCHAR(255),
      extracted_position VARCHAR(255),
      extracted_tags TEXT,
      interview_id BIGINT UNSIGNED,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
    )
  `);

  console.log("crawl_tasks table created successfully");

  const [tables] = await connection.execute("SHOW TABLES LIKE 'crawl%'");
  console.log("Tables:", tables);

  await connection.end();
}

main().catch(console.error);
