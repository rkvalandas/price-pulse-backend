const cron = require("node-cron");
const { handlePriceTracker } = require("./tracker"); // Adjust the path

cron.schedule(process.env.CRON_SCHEDULE || "*/15 * * * *", async () => {
  console.log("Running price tracker...");
  try {
    await handlePriceTracker();
  } catch (error) {
    console.error("Error running price tracker:", error);
  }
});

console.log("Scheduler is set up and running.");
