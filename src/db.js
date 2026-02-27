import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// 1️⃣ Create connection pool
export const db = await mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,   
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
});

// 2️⃣ Initialize Database & Table
export const initDB = async () => {
  try {
    // Create DB if not exists
    await db.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);

    // Use DB
    await db.query(`USE ${process.env.DB_NAME}`);

    // Create Contact table
    await db.query(`
      CREATE TABLE IF NOT EXISTS Contact (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255),
        phoneNumber VARCHAR(20),
        linkedId INT,
        linkPrecedence ENUM('primary','secondary') DEFAULT 'primary',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt TIMESTAMP NULL
      );
    `);

    console.log("✅ Database & Contact table ready");
  } catch (err) {
    console.error("❌ DB Init Error:", err);
  }
};