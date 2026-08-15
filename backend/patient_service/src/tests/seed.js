const { Pool } = require("pg");
const bcrypt = require("bcrypt");
require("dotenv").config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

const TOTAL_USERS = 500;

async function seedUsers() {

    try {

        console.log("Connecting to:", process.env.DB_DATABASE);

        const passwordHash = await bcrypt.hash("LoadTest123", 10);

        for (let i = 1; i <= TOTAL_USERS; i++) {

            const email =
                `loadtest-${String(i).padStart(4, "0")}@example.com`;

            const mobile =
                `+919900${String(i).padStart(6, "0")}`;

            const alternative =
                `+918800${String(i).padStart(6, "0")}`;

            await pool.query(
                `
                INSERT INTO Patient
                (
                    first_name,
                    last_name,
                    email,
                    mobile_number,
                    alternative_number,
                    age,
                    appointment_date,
                    password_hash
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                ON CONFLICT (email) DO NOTHING
                `,
                [
                    "LoadTest",
                    `User${i}`,
                    email,
                    mobile,
                    alternative,
                    25,
                    "2026-08-20",
                    passwordHash
                ]
            );

            console.log(`Created user ${i}/${TOTAL_USERS}`);
        }

        console.log("\n=================================");
        console.log("500 load-test users created");
        console.log("=================================");
        console.log("Email range:");
        console.log("loadtest-0001@example.com");
        console.log("...");
        console.log("loadtest-0500@example.com");
        console.log("\nPassword for all users:");
        console.log("LoadTest123");

    } catch (error) {

        console.error("Seed failed:");
        console.error(error);

    } finally {

        await pool.end();

    }
}

seedUsers();