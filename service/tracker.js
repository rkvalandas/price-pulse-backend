const axios = require("axios");
const cheerio = require("cheerio");
const Alert = require("../models/alert");
const sendEmail = require("../utils/sendEmail");

const MAX_CONCURRENT_REQUESTS = process.env.MAX_CONCURRENT_REQUESTS || 5; // Number of simultaneous requests
const RETRY_COUNT = process.env.RETRY_COUNT || 3; // Retry limit for failed network requests

// Helper function to fetch HTML with retries
async function fetchHTMLWithRetry(url, retries = RETRY_COUNT) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios.get(url);
    } catch (error) {
      if (attempt === retries) {
        throw new Error(
          `Failed to fetch URL after ${retries} attempts: ${url}`
        );
      }
      console.warn(`Retrying fetch for URL: ${url}, Attempt: ${attempt + 1}`);
    }
  }
}

// Helper function to process alerts in batches
async function processAlertsBatch(alerts) {
  const promises = alerts.map(async (alert) => {
    try {
      const { data } = await fetchHTMLWithRetry(alert.url);
      const $ = cheerio.load(data);

      // Extract the price
      const priceText = $("span.a-price-whole")
        .first()
        .text()
        .replace(/,/g, "")
        .trim();
      const currentPrice = parseFloat(priceText);

      // Check if the price is below the target
      if (currentPrice <= alert.targetPrice) {
        const emailContent = generateEmailTemplate(
          alert.title,
          currentPrice,
          alert.url
        );

        // Send email
        await sendEmail(
          alert.userEmail,
          "🚨 Price Drop Alert for Your Tracked Product!",
          emailContent
        );

        console.log(
          `Price drop email sent to ${alert.userEmail} for ${alert.url}`
        );

        // Remove alert from the database
        await Alert.findByIdAndDelete(alert._id);
      }
    } catch (error) {
      console.error(`Error processing alert for URL: ${alert.url}`, error);
    }
  });

  await Promise.all(promises); // Wait for all alerts in the batch to finish
}

// Helper function to generate an email template
function generateEmailTemplate(title, currentPrice, url) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; color: #333; }
        .container { max-width: 600px; margin: 20px auto; background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .header h1 { margin: 0; color: #007BFF; }
        .content { margin-top: 20px; }
        .content p { line-height: 1.6; font-size: 16px; }
        .content a { display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #007BFF; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold; }
        .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #888; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Price Drop Alert!</h1></div>
        <div class="content">
          <h4>${title}</h4>
          <p>Good news! The price for the product you are tracking has dropped to <strong>${currentPrice}</strong>.</p>
          <p>Don't miss this opportunity to grab the product at a discounted price.</p>
          <a href="${url}" target="_blank">View Product</a>
        </div>
        <div class="footer">
          <p>You are receiving this email because you subscribed to price alerts on our platform.</p>
          <p>&copy; ${new Date().getFullYear()} Price Tracker Inc. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Main function to handle price tracking
async function handlePriceTracker(req, res) {
  try {
    const alerts = await Alert.find();

    if (alerts.length === 0) {
      return res.status(200).json({ message: "No alerts to process." });
    }

    // Process alerts in batches
    for (let i = 0; i < alerts.length; i += MAX_CONCURRENT_REQUESTS) {
      const batch = alerts.slice(i, i + MAX_CONCURRENT_REQUESTS);
      await processAlertsBatch(batch); // Process the current batch
    }
  } catch (error) {
    console.error("Error in price tracking process:", error);
  }
}

module.exports = {
  handlePriceTracker,
};
