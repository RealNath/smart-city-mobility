const Intersection = require('../models/Intersection');
const Incident = require('../models/Incident');

// Function to call Gemini 3.1 Flash-Lite to generate a realistic traffic incident
const generateAIAccident = async () => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('[AI] GEMINI_API_KEY not set. Skipping AI incident generation.');
      return;
    }

    // Pick a random intersection from the database
    const intersections = await Intersection.find();
    if (intersections.length === 0) return;

    const randomIntersection = intersections[Math.floor(Math.random() * intersections.length)];

    const prompt = `You are an autonomous Smart City Monitoring AI. 
A traffic accident has just been detected at the following intersection: ${randomIntersection.name}.
Invent a realistic, brief (1 sentence) description of this traffic incident. (e.g. "Minor fender bender blocking the left lane." or "A delivery truck broke down in the middle of the intersection.")
Return ONLY raw, valid JSON with exactly one key "description". Do not use markdown blocks, just raw JSON.`;

    const https = require('https');

    const postData = JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    });

    const model = 'gemini-3.1-flash-lite-preview';
    const url = `/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const data = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path: url,
        method: 'POST',
        family: 4, // Force IPv4
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 400) {
            reject(new Error(`Gemini API error: ${res.statusCode} - ${body}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Failed to parse JSON from Gemini API'));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    // Extract the text content from the Gemini response
    const content = data.candidates[0].content.parts[0].text;

    // Attempt to parse the JSON
    let description = "Unknown accident";
    try {
      // In case the AI still wraps it in markdown like ```json ... ```
      const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      description = parsed.description;
    } catch (e) {
      console.error('[AI] Failed to parse Gemini response as JSON:', content);
      description = content; // Fallback to raw text
    }

    // Save it to the database
    const newIncident = new Incident({
      type: 'ACCIDENT',
      lat: randomIntersection.lat,
      lng: randomIntersection.lng,
      description: description,
      verified: false, // Starts unverified!
      reporter: 'Gemini AI Vision'
    });

    await newIncident.save();
    console.log(`[AI] Generated new unverified incident at ${randomIntersection.name}: ${description}`);

  } catch (err) {
    console.error('[AI] Error generating AI accident:', err.message);
  }
};

module.exports = { generateAIAccident };
