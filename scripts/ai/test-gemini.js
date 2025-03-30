require('dotenv').config();
const { aiService } = require('../../dist/services/aiService');

(async () => {
  const prompt = process.argv[2] || 'Explain how AI works';
  console.log('Prompt:', prompt);

  try {
    const response = await aiService.generateWithGemini(prompt, {
      temperature: 0.7,
      maxOutputTokens: 500,
    });
    console.log('Response:', response);
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
