// ai-server.js - simple proxy to OpenAI for the local dev environment
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = global.fetch || require('node-fetch');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY not set. The /api/ai endpoint will return an error.');
}

app.post('/api/ai', async (req, res) => {
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server.' });

  const { lang = 'en', prompt = '', history = [] } = req.body || {};

  try {
    const system = `You are a concise, factual assistant specialized in Indian election processes, registration, polling, deadlines, and ID requirements. Answer in the user's language (${lang === 'hi' ? 'Hindi' : 'English'}) and prioritize short, actionable steps and official resources where possible.`;

    const messages = [
      { role: 'system', content: system },
      ...history,
      { role: 'user', content: prompt }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 800 })
    });

    if (!response.ok) {
      const txt = await response.text();
      return res.status(response.status).json({ error: txt });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    return res.json({ reply: content });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

// Return top FAQs for UI display. Query param: ?lang=en|hi
app.get('/api/topfaqs', (req, res) => {
  const lang = (req.query.lang || 'en').toLowerCase();
  const faqs = {
    en: [
      { q: 'How do I register to vote?', a: 'Visit the NVSP portal at voters.eci.gov.in and follow the registration steps. You will generally need proof of residence and a photo ID. If you tell us your state, we can point to local deadlines and resources.' },
      { q: 'What documents do I need?', a: 'Commonly accepted IDs: Aadhaar, passport, driver\'s license, or voter ID. Proof of address may be required by some states.' },
      { q: 'How can I check my registration status?', a: 'Use the ECI voter status portal at voters.eci.gov.in to enter your details and verify registration.' },
      { q: 'When is the next election?', a: 'Election dates vary by state and election type. Check the ECI schedules at eci.gov.in/elections/election-schedules/ or ask with your state name.' },
      { q: 'How do I find my polling place?', a: 'Use the Electoral Search at electoralsearch.eci.gov.in or your local election office; you can also search by PIN or district.' }
    ],
    hi: [
      { q: 'मैं वोट के लिए कैसे पंजीकृत करूँ?', a: 'NVSP पोर्टल (voters.eci.gov.in) पर जाएँ और पंजीकरण के निर्देश फॉलो करें। आपको सामान्यतः निवास प्रमाण और फोटो ID की आवश्यकता होगी। अपना राज्य बताइए तो हम स्थानीय समय-सीमाएँ बता सकते हैं।' },
      { q: 'मुझे कौन से दस्तावेज चाहिए?', a: 'सामान्यत: स्वीकार किए जाने वाले ID: Aadhaar, पासपोर्ट, ड्राइविंग लाइसेंस, या वोटर ID। कुछ राज्यों में पता प्रमाण भी चाहिए।' },
      { q: 'मैं अपनी पंजीकरण स्थिति कैसे जाँचूँ?', a: 'ECI वोटर स्टेटस पोर्टल (voters.eci.gov.in) पर अपनी जानकारी दर्ज करके जाँच कर सकते हैं।' },
      { q: 'अगला चुनाव कब है?', a: 'चुनाव की तारीखें राज्य और चुनाव के प्रकार के हिसाब से अलग होती हैं। ECI की समय-सारिणी देखें या अपना राज्य बताइए।' },
      { q: 'मैं अपना मतदान स्थल कैसे ढूँढ़ूं?', a: 'Electoral Search (electoralsearch.eci.gov.in) या अपने स्थानीय निर्वाचन कार्यालय का उपयोग करें; आप PIN या जिले से भी खोज सकते हैं।' }
    ]
  };

  res.json({ faqs: faqs[lang] || faqs.en });
});

app.listen(PORT, () => {
  console.log(`AI proxy and static server listening on http://localhost:${PORT}`);
});
