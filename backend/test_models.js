require('dotenv').config();
const axios = require('axios');

async function getModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
  try {
    const res = await axios.get(url);
    console.log(res.data.models.map(m => m.name));
  } catch (err) {
    console.error(err.message);
  }
}
getModels();
