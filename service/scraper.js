const axios = require("axios");
const cheerio = require("cheerio");

async function getProduct(url) {
  try {
    // Fetch the HTML content of the webpage
    const { data } = await axios.get(url);

    // Load HTML into Cheerio
    const $ = cheerio.load(data);

    // Extract the page title
    const title = $("div#centerCol span#productTitle").text();

    // Extract product price
    const price = $("span.a-price-whole").first().text().trim();

    // Extract product image URL
    const image = $("div.imgTagWrapper img").attr("src");

    const graph = await fetchGraphTitle(title, url);

    // Extract product specifications
    const specifications = $("#productOverview_feature_div").html();

    // Extract product description
    const description = $("#feature-bullets > ul").html();

    // Create the product object
    const product = {
      productUrl: url,
      productTitle: title,
      productImageUrl: image,
      productPrice: price,
      productGraph: graph,
      productSpecs: specifications,
      productDescription: description,
    };

    return product; // Return the product object
  } catch (error) {
    console.error("Error fetching product:", error);
  }
}

async function fetchGraphTitle(title, url) {
  try {
    // Define query parameters
    let query = title;
    const api = process.env.GOOGLE_API_KEY;
    const id = process.env.GOOGLE_SEARCH_ENGINE_ID;

    let params = {
      q: query,
      key: api,
      cx: id,
    };

    let response = await axios.get(
      "https://www.googleapis.com/customsearch/v1",
      { params }
    );
    let data = response.data;

    if (data.items && data.items.length > 0) {
      return data.items[0].link.split("/")[4];
    } else {
      // Update query and retry
      params.q = url.split("/")[3];
      response = await axios.get("https://www.googleapis.com/customsearch/v1", {
        params,
      });
      data = response.data;

      if (data.items && data.items.length > 0) {
        const linkSegment = data.items[0].link.split("/")[4];
        return linkSegment;
      } else {
        console.log("No items found even after retrying.");
      }
    }
  } catch (error) {
    console.error("Error fetching data:", error.message);
  }
}

// async function getProduct(url) {
//   try {
//     const browser = await puppeteer.launch(); // Launch browser in headless mode
//     const page = await browser.newPage(); // Create a new tab
//     await page.goto(url); // Go to the target URL

//     // Get page title
//     const title = await page.title();
//     console.log(`Page Title: ${title}`);

//     // Get the price
//     // method 1
//     // const price = await page.evaluate(() => {
//     //   return document.querySelector("span.a-price-whole").innerText;
//     // });

//     // method 2
//     const price = await page.$eval(
//       "span.a-price-whole",
//       (el) => el.textContent
//     );
//     console.log(`price: ${price}`);

//     // Get image
//     const image = await page.$eval("div.imgTagWrapper img", (img) => img.src);

//     // Get specifications
//     const specifications = await page.$eval(
//       "#productOverview_feature_div",
//       (element) => element.outerHTML
//     );

//     // Get description
//     const description = await page.$eval(
//       "#feature-bullets > ul",
//       (element) => element.outerHTML
//     );

//     const product = {
//       productUrl: url,
//       productTitle: title,
//       productImageUrl: image,
//       productPrice: price,
//       productSpecs: specifications,
//       ProductDescription: description,
//     };

//     await browser.close(); // Close the browser
//     return product;
//   } catch (error) {
//     console.error(error);
//   }
// }

async function getFromFlipkart(url) {
  try {
    // Fetch the HTML content of the webpage
    const { data } = await axios.get(url);

    // Load HTML into Cheerio
    const $ = cheerio.load(data);

    // Extract product title
    const title = $("span.B_NuCI").text().trim();

    // Extract product price
    const price = $("div._30jeq3._16Jk6d").first().text().trim();

    // Extract product image URL
    const image = $("div._396cs4._2amPTt img").attr("src");

    // Extract product specifications (example for key-value specs)
    const specifications = {};
    $("div._1UhVsV > div").each((_, el) => {
      const key = $(el).find("td:nth-child(1)").text().trim();
      const value = $(el).find("td:nth-child(2)").text().trim();
      if (key && value) specifications[key] = value;
    });

    // Extract product description
    const description = $("div._1mXcCf").text().trim();

    // Create the product object
    const product = {
      productUrl: url,
      productTitle: title,
      productImageUrl: image,
      productPrice: price,
      productSpecs: specifications,
      productDescription: description,
    };

    return product; // Return the product object
  } catch (error) {
    console.error("Error fetching Flipkart product:", error);
  }
}

module.exports = {
  getProduct,
};
