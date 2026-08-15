const autocannon = require("autocannon");

const PORT = process.env.PORT || 3000;

const instance = autocannon({
    url: `http://localhost:${PORT}/api/auth/register`,

    method: "POST",

    connections: 100,

    duration: 60,

    overallRate: 500,

    pipelining: 1,

    headers: {
        "content-type": "application/json"
    },

    timeout: 10,

    bailout: 100,

    setupClient(client) {
        client.setBody(JSON.stringify({
            first_name: "Load",
            last_name: "Test",

            email: `loadtest-${client.id}@example.com`,

            mobile_number:
                `+9199${String(client.id).padStart(8, "0")}`,

            alternative_number:
                `+9188${String(client.id).padStart(8, "0")}`,

            age: 25,

            appointment_date: "2026-08-20",

            password_hash: "LoadTest123"
        }));
    },

    title: "Patient Registration - 500 RPS"

}, finished);


function finished(err, result) {

    if (err) {
        console.error("Load test failed:", err);
        process.exit(1);
    }

    console.log("\n========== REGISTER LOAD TEST ==========\n");

    console.log("Target RPS:", 500);
    console.log("Actual RPS:", result.requests.average);
    console.log("Total requests:", result.requests.total);

    console.log("\nLatency:");
    console.log("Average:", result.latency.average, "ms");
    console.log("p50:", result.latency.p50, "ms");
    console.log("p90:", result.latency.p90, "ms");
    console.log("p99:", result.latency.p99, "ms");

    console.log("\nErrors:", result.errors);
    console.log("Timeouts:", result.timeouts);
    console.log("Non-2xx:", result.non2xx);

    console.log("\nStatus codes:");
    console.log(result.statusCodeStats);

    console.log("\n========================================\n");
}