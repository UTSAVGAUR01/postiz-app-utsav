const express = require('express');
const { readAll } = require('../db');

const router = express.Router();

const DEFAULT_ENDPOINT = process.env.AI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const DEFAULT_IMAGE_ENDPOINT = process.env.AI_IMAGE_ENDPOINT || 'https://api.openai.com/v1/images/generations';
const DEFAULT_IMAGE_MODEL = process.env.AI_IMAGE_MODEL || 'gpt-image-1';
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';

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

function toHashtag(value) {
  return `#${String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '')
    .trim()}`;
}

function buildFallbackOutput({ topic, platform, tone, goal, audience, language }) {
  const topicText = String(topic || '').trim();
  const toneText = String(tone || 'bold and energetic').trim();
  const goalText = String(goal || 'engagement and shares').trim();
  const audienceText = String(audience || 'Indian young adults').trim();
  const platformText = String(platform || 'instagram').trim();
  const languageText = String(language || 'Hinglish').trim();

  const words = topicText.split(/\s+/).filter(Boolean);
  const topicShort = words.slice(0, 4).join(' ') || 'your next big idea';

  const baseTags = [
    toHashtag(topicShort),
    toHashtag(platformText),
    toHashtag(goalText.split(/\s+/).slice(0, 2).join(' ')),
    '#YehMeraIndia',
    '#PostizAI',
  ].filter((tag) => tag && tag !== '#');

  return sanitizeOutput({
    hook: `${topicShort} - made for scroll-stopping impact`,
    caption: `Fresh drop for ${audienceText}: ${topicText}. Keeping it ${toneText} and focused on ${goalText}. Save this for your next ${platformText} plan.`,
    hashtags: Array.from(new Set(baseTags)).slice(0, 8),
    imagePrompts: [
      `Create a premium ${platformText} visual about ${topicText}. Tone: ${toneText}. Audience: ${audienceText}. Language style cue: ${languageText}.`,
    ],
    cta: 'Comment your favorite pick and DM for details.',
    bestPostTime: '7:30 PM - 9:00 PM IST',
    trendAngle: 'Lifestyle-driven visual storytelling with clear product focus.',
  });
}

function isQuotaError(status, rawBody) {
  if (Number(status) === 429) return true;
  const text = String(rawBody || '').toLowerCase();
  return (
    text.includes('insufficient_quota') ||
    text.includes('credit_balance_exhausted') ||
    text.includes('no credits remaining')
  );
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

function normalizeProvider(value) {
  return String(value || 'openai').trim().toLowerCase() === 'gemini' ? 'gemini' : 'openai';
}

function resolveApiKey(body, provider) {
  const directKey = String(body?.apiKey || '').trim();
  if (directKey) return directKey;

  const rows = normalizeRows(readAll());
  const active = chooseActive(rows, provider);
  if (active?.client_id) return String(active.client_id).trim();

  return String(provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.AI_API_KEY).trim();
}

async function generateWithGemini({ token, model, prompt }) {
  const response = await fetch(`${GEMINI_API_BASE}/models/${encodeURIComponent(model || DEFAULT_GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'You are a high-performing social media strategist. Create trendy, tasteful, high-engagement social copy for Indian audiences. Return ONLY valid JSON with keys hook, caption, hashtags, imagePrompts, cta, bestPostTime, trendAngle. Keep hashtags relevant and not spammy.' }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.85, responseMimeType: 'application/json' },
    }),
  });
  const raw = await response.text();
  const payload = response.ok ? JSON.parse(raw) : null;
  const content = (payload?.candidates?.[0]?.content?.parts || []).map((part) => part?.text || '').join('');
  return { response, raw, content };
}

function fillTemplate(template, values) {
  let out = String(template || '');
  Object.entries(values).forEach(([key, value]) => {
    out = out.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), String(value || ''));
  });
  return out;
}

function buildImagePrompt({
  imagePromptTemplate,
  brandName,
  tagline,
  topic,
  tone,
  goal,
  audience,
  language,
  imageObjects,
  imageMoods,
  imageStyle,
  imageLighting,
  fallbackPrompt,
}) {
  const objectsText = normalizeArray(imageObjects).join(', ');
  const moodsText = normalizeArray(imageMoods).join(', ');
  const styleText = String(imageStyle || '').trim();
  const lightingText = String(imageLighting || '').trim();

  const directives = [
    objectsText ? `Preferred objects: ${objectsText}` : null,
    moodsText ? `Mood options: ${moodsText}` : null,
    styleText ? `Visual style preference: ${styleText}` : null,
    lightingText ? `Lighting preference: ${lightingText}` : null,
  ].filter(Boolean).join('\n');

  const tpl = String(imagePromptTemplate || '').trim();
  if (!tpl) {
    const base = String(fallbackPrompt || '').trim();
    if (!base) return directives;
    return directives ? `${base}\n\n${directives}` : base;
  }

  const templated = fillTemplate(tpl, {
    brand: brandName,
    tagline,
    topic,
    tone,
    goal,
    audience,
    language,
    objects: objectsText,
    moods: moodsText,
    style: String(imageStyle || '').trim(),
    lighting: String(imageLighting || '').trim(),
  }).trim();

  return directives ? `${templated}\n\n${directives}`.trim() : templated;
}

async function tryGenerateImageUrl({ token, prompt, size = '1024x1024' }) {
  if (!token || !prompt) return null;

  try {
    const response = await fetch(DEFAULT_IMAGE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: DEFAULT_IMAGE_MODEL,
        prompt,
        size,
      }),
    });

    if (!response.ok) {
      const raw = await response.text().catch(() => '');
      if (isQuotaError(response.status, raw)) {
        return { url: null, quotaExceeded: true };
      }
      return { url: null, quotaExceeded: false };
    }

    const payload = await response.json().catch(() => null);
    const first = payload?.data?.[0];
    if (!first) return { url: null, quotaExceeded: false };

    if (first.url) return { url: String(first.url), quotaExceeded: false };
    if (first.b64_json) return { url: `data:image/png;base64,${first.b64_json}`, quotaExceeded: false };
    return { url: null, quotaExceeded: false };
  } catch {
    return { url: null, quotaExceeded: false };
  }
}

function clampImageCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.floor(n)));
}

function pickFromList(list, index) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return String(list[index % list.length] || '').trim();
}

function buildImageVariantPrompt(basePrompt, index, directives = {}) {
  if (index === 0) return basePrompt;

  const mood = pickFromList(directives.moods, index);
  const objectFocus = pickFromList(directives.objects, index);
  const style = String(directives.style || '').trim();
  const lighting = String(directives.lighting || '').trim();

  const guidance = [
    `Variation ${index + 1}: keep same brand identity and typography, but produce a clearly different concept from previous variations.`,
    mood ? `Mood focus: ${mood}.` : 'Mood focus: change emotional tone significantly from prior image.',
    objectFocus ? `Primary object focus: ${objectFocus}.` : 'Primary object focus: use a different hero product/object than previous image.',
    style ? `Visual style direction: ${style}.` : null,
    lighting ? `Lighting direction: ${lighting}.` : null,
    'Also change camera angle, composition, and depth while preserving photorealism and premium quality.',
  ].filter(Boolean).join(' ');

  return `${basePrompt}\n\n${guidance}`;
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
      generateImage = true,
      imageSize = '1024x1024',
      imageCount = 1,
      imagePromptTemplate = '',
      brandName = 'JK Mall',
      tagline = 'Where Spaces Become Yours.',
      imageObjects = '',
      imageMoods = 'luxury, cozy, modern, festive, dramatic',
      imageStyle = 'ultra-premium commercial photography',
      imageLighting = 'cinematic warm ambient lighting',
      model,
      apiKey,
      provider = 'openai',
    } = req.body || {};

    if (!topic || !String(topic).trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const selectedProvider = normalizeProvider(provider);
    const token = resolveApiKey(req.body || {}, selectedProvider);
    if (!token) {
      return res.status(400).json({
        error: `AI API key missing. Save an active ${selectedProvider === 'gemini' ? 'Gemini' : 'OpenAI'} credential in Admin UI or provide a session key in the form.`,
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
      normalizeArray(imageObjects).length ? `Image object focus: ${normalizeArray(imageObjects).join(', ')}` : null,
      normalizeArray(imageMoods).length ? `Image mood options: ${normalizeArray(imageMoods).join(', ')}` : null,
      String(imageStyle || '').trim() ? `Image style preference: ${String(imageStyle || '').trim()}` : null,
      String(imageLighting || '').trim() ? `Image lighting preference: ${String(imageLighting || '').trim()}` : null,
      `Date context: ${new Date().toISOString().slice(0, 10)}`,
    ].filter(Boolean).join('\n');

    let output = null;
    let freeMode = false;
    let freeModeReason = '';

    const schemaPrompt = `${prompt}\n\nOutput schema:\n{\n  "hook": "string",\n  "caption": "string",\n  "hashtags": ["#one", "#two"],\n  "imagePrompts": ["prompt 1", "prompt 2"],\n  "cta": "string",\n  "bestPostTime": "string",\n  "trendAngle": "string"\n}`;
    const gemini = selectedProvider === 'gemini'
      ? await generateWithGemini({ token, model, prompt: schemaPrompt })
      : null;
    const response = gemini?.response || await fetch(DEFAULT_ENDPOINT, {
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
            content: schemaPrompt,
          },
        ],
      }),
    });

    const raw = gemini?.raw || await response.text();
    if (!response.ok) {
      if (isQuotaError(response.status, raw)) {
        output = buildFallbackOutput({ topic, platform, tone, goal, audience, language });
        freeMode = true;
        freeModeReason = `${selectedProvider === 'gemini' ? 'Gemini' : 'OpenAI'} quota exhausted. Using built-in free fallback output.`;
      } else {
        return res.status(response.status).json({ error: `AI generation failed: ${raw.slice(0, 500)}` });
      }
    } else {
      const payload = gemini ? null : JSON.parse(raw);
      const content = gemini?.content || payload?.choices?.[0]?.message?.content;
      const parsed = parseModelJson(content);
      if (!parsed) {
        output = buildFallbackOutput({ topic, platform, tone, goal, audience, language });
        freeMode = true;
        freeModeReason = 'Model returned non-JSON output. Using built-in free fallback output.';
      } else {
        output = sanitizeOutput(parsed);
      }
    }

    if (!output.caption) {
      return res.status(502).json({ error: 'AI result missing caption. Try regenerating.' });
    }

    const primaryPrompt = output.imagePrompts.length > 0 ? output.imagePrompts[0] : '';
    const imagePromptUsed = buildImagePrompt({
      imagePromptTemplate,
      brandName,
      tagline,
      topic,
      tone,
      goal,
      audience,
      language,
      imageObjects,
      imageMoods,
      imageStyle,
      imageLighting,
      fallbackPrompt: primaryPrompt,
    });

    if (imagePromptUsed) {
      output.imagePrompts = [imagePromptUsed, ...output.imagePrompts.filter((p) => p !== imagePromptUsed)].slice(0, 5);
    }

    const generatedImages = [];
    let imageQuotaExceeded = false;
    let mediaGenerationNotice = '';
    if (generateImage && selectedProvider === 'openai' && imagePromptUsed) {
      const count = clampImageCount(imageCount);
      const directives = {
        moods: normalizeArray(imageMoods),
        objects: normalizeArray(imageObjects),
        style: imageStyle,
        lighting: imageLighting,
      };
      for (let i = 0; i < count; i += 1) {
        const variantPrompt = buildImageVariantPrompt(imagePromptUsed, i, directives);
        const imageResult = await tryGenerateImageUrl({
          token,
          prompt: variantPrompt,
          size: imageSize,
        });
        if (imageResult?.quotaExceeded) {
          imageQuotaExceeded = true;
          break;
        }
        if (imageResult?.url) generatedImages.push(imageResult.url);
      }
    } else if (generateImage && selectedProvider === 'gemini') {
      mediaGenerationNotice = 'Gemini is configured for captions and media prompts only. Image API generation is disabled because it has separate paid quota; use the generated prompt in an approved image provider.';
    }

    return res.json({
      ...output,
      freeMode,
      freeModeReason,
      imageQuotaExceeded,
      imagePromptUsed,
      generatedImage: generatedImages[0] || null,
      generatedImages,
      provider: selectedProvider,
      mediaGenerationNotice,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'AI generation failed' });
  }
});

module.exports = router;
