const express = require('express');
const { readAll } = require('../db');

const router = express.Router();

const DEFAULT_ENDPOINT = process.env.AI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(String).map(v => v.trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/[\n,]/)
      .map(v => v.trim())
      .filter(Boolean);
  }
  return [];
}

function parseModelJson(content) {
  if (!content || typeof content !== 'string') return null;
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(content.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function sanitizeOutput(result) {
  return {
    hook: String(result?.hook || '').trim(),
    caption: String(result?.caption || '').trim(),
    hashtags: normalizeArray(result?.hashtags).slice(0, 20),
    imagePrompts: normalizeArray(result?.imagePrompts).slice(0, 5),
    cta: String(result?.cta || '').trim(),
    bestPostTime: String(result?.bestPostTime || '').trim(),
    trendAngle: String(result?.trendAngle || '').trim(),
  };
}

function normalizeRows(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => row && row.provider)
    .map((row) => ({
      provider: String(row.provider).toLowerCase(),
      label: String(row.label || '').trim(),
      client_id: String(row.client_id || ''),
      client_secret: String(row.client_secret || ''),
      is_active: !!row.is_active,
      updated_at: row.updated_at || '',
    }));
}

function chooseActive(rows, provider) {
  const candidates = rows.filter((row) => row.provider === provider);
  if (candidates.length === 0) return null;
  const active = candidates.find((row) => row.is_active);
  if (active) return active;
  return candidates
    .slice()
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))[0];
}

function resolveApiKey(body) {
  const directKey = String(body?.apiKey || '').trim();
  if (directKey) return directKey;

  const rows = normalizeRows(readAll());
  const active = chooseActive(rows, 'openai');
  if (active?.client_id) return String(active.client_id).trim();

  return String(process.env.AI_API_KEY || '').trim();
}

router.post('/generate', async (req, res) => {
  try {
    const {
      topic,
      platform = 'instagram',
      audience = 'Indian young adults',
      tone = 'bold and energetic',
      goal = 'engagement and shares',
      language = 'Hinglish',
      includeEmojis = true,
      brandVoice = '',
      keyPoints = '',
      model,
      apiKey,
    } = req.body || {};

    if (!topic || !String(topic).trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const token = resolveApiKey(req.body || {});
    if (!token) {
      return res.status(400).json({
        error: 'AI API key missing. Save an active OpenAI credential in Admin UI or provide apiKey in the form.',
      });
    }

    const prompt = [
      `Topic: ${topic}`,
      `Platform: ${platform}`,
      `Audience: ${audience}`,
      `Tone: ${tone}`,
      `Goal: ${goal}`,
      `Language: ${language}`,
      `Use emojis: ${includeEmojis ? 'yes' : 'no'}`,
      brandVoice ? `Brand voice: ${brandVoice}` : null,
      keyPoints ? `Must include points: ${keyPoints}` : null,
      `Date context: ${new Date().toISOString().slice(0, 10)}`,
    ].filter(Boolean).join('\n');

    const response = await fetch(DEFAULT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        temperature: 0.85,
        messages: [
          {
            role: 'system',
            content:
              'You are a high-performing social media strategist. Create trendy, tasteful, high-engagement social copy for Indian audiences. Return ONLY valid JSON with keys hook, caption, hashtags, imagePrompts, cta, bestPostTime, trendAngle. Keep hashtags relevant and not spammy.',
          },
          {
            role: 'user',
            content: `${prompt}\n\nOutput schema:\n{\n  "hook": "string",\n  "caption": "string",\n  "hashtags": ["#one", "#two"],\n  "imagePrompts": ["prompt 1", "prompt 2"],\n  "cta": "string",\n  "bestPostTime": "string",\n  "trendAngle": "string"\n}`,
          },
        ],
      }),
    });

    const raw = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({ error: `AI generation failed: ${raw.slice(0, 500)}` });
    }

    const payload = JSON.parse(raw);
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = parseModelJson(content);
    if (!parsed) {
      return res.status(502).json({ error: 'AI returned non-JSON output. Try again with simpler topic.' });
    }

    const output = sanitizeOutput(parsed);
    if (!output.caption) {
      return res.status(502).json({ error: 'AI result missing caption. Try regenerating.' });
    }

    return res.json(output);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'AI generation failed' });
  }
});

module.exports = router;