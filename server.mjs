import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json({ limit: "28mb" }));
app.use(express.static("public"));

const MODEL = process.env.OPENAI_MODEL || "gpt-5";
let client = null;
function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

function extractJSON(text) {
  const cleaned = (text || "").trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
  throw new Error("Model did not return valid JSON.");
}

app.post("/api/analyze", async (req, res) => {
  try {
    const client = getClient();
    if (!client) return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
    const bird = req.body?.bird || {};
    const photos = Array.isArray(req.body?.photos) ? req.body.photos : [];
    if (!photos.length) return res.status(400).json({ error: "No photos supplied." });
    if (photos.length > 12) return res.status(400).json({ error: "Maximum 12 photos per analysis." });

    const prompt = `You are performing an educational poultry phenotype and conformation assessment from standardized photographs.

BIRD RECORD
Band/ID: ${bird.band || "unknown"}
Sex: ${bird.sex || "unknown"}
Age: ${bird.age || "unknown"}
Documented bloodline entered by owner: ${bird.bloodline || "unknown"}
Source: ${bird.source || "unknown"}
Owner photo notes: ${bird.photoNotes || "none"}

PHOTO SLOT LABELS
${photos.map(p => p.slot).join(", ")}

RULES
1. Analyze only visible phenotype and conformation.
2. Do NOT infer or confirm bloodline, pedigree, genetics, fighting ability, performance, or inheritance from appearance.
3. Do NOT claim exact centimeters, inches, weight, bone density, muscle density, or internal anatomy unless directly measurable from a valid scale/reference visible in the same plane.
4. Distinguish observation from proportional visual assessment.
5. Consider perspective, feathering, pose, age, sex, lighting, and missing views.
6. If a feature cannot be evaluated, say so.
7. The purpose is breeding documentation, preservation, husbandry, and structural evaluation.
8. For score_suggestions, map only photographically supportable evidence to the existing five checks in this exact order:
   structure = ["Wide chest","Balanced frame","Straight legs","Good station","No defects"]
   muscle = ["Firm breast muscle","Strong thighs","Athletic feel","Not overfat","Not soft"]
   feather = ["Tight feathering","Glossy feathers","No fraying","No parasites","Healthy skin"]
   legs = ["Clean scales","Straight toes","Strong foot spread","Good spur placement","Good balance"]
   head = ["Bright clear eyes","Strong expression","Clean nostrils","Proper beak","Healthy comb"]
   health = ["Clear breathing","Clean vent","Good energy","No mites/lice","No recurring sickness"]
   Use null whenever a check cannot be responsibly determined from the supplied photos.
   Never score mentality/disposition or bloodline/lineage from still photographs.
   For each category, base is 1–5 and must reflect only clearly visible phenotype; low-evidence categories should remain near neutral/low confidence rather than being guessed.
9. family_signature must use only the listed standardized values so multiple birds can be aggregated into a farm-family reference profile.
10. Return JSON only. No markdown and no text outside JSON.

Return exactly this JSON shape:
{
  "photo_adequacy": "short assessment of how usable the supplied views are",
  "overall_silhouette": "objective visible silhouette description",
  "head_cranial": "visible head, brow, eye placement, beak, comb and head-neck transition",
  "neck_shoulder": "visible neck proportion/carriage and shoulder transition",
  "body_structure": "visible trunk, chest profile, body depth, topline, wing carriage and balance",
  "legs_feet": "visible thighs, shanks, stance, alignment, toes and feet",
  "wing_tail_feather": "visible wing, tail set/carriage, feather texture/condition and plumage",
  "symmetry": "what can and cannot be judged about symmetry",
  "proportional_assessment": {
    "height_to_length": "qualitative only",
    "neck_to_body": "qualitative visual ratio",
    "shank_to_body": "qualitative visual ratio",
    "body_depth": "qualitative visual ratio",
    "head_to_body": "qualitative visual ratio"
  },
  "observations": ["5 to 12 concise objective visible observations"],
  "limitations": ["specific limitations, missing views, or retakes that would improve reliability"],
  "confidence": {"overall":"high|moderate|low","head":"high|moderate|low","body":"high|moderate|low","legs_feet":"high|moderate|low"},
  "summary": "one concise evidence-aware phenotype summary",
  "score_suggestions": {
    "structure": {"base": 1, "checks": [null,null,null,null,null], "confidence":"high|moderate|low", "apply": true, "reason":"visible evidence only"},
    "muscle": {"base": 1, "checks": [null,null,null,null,null], "confidence":"high|moderate|low", "apply": true, "reason":"visible evidence only; use null for anything not judgeable"},
    "feather": {"base": 1, "checks": [null,null,null,null,null], "confidence":"high|moderate|low", "apply": true, "reason":"visible evidence only"},
    "legs": {"base": 1, "checks": [null,null,null,null,null], "confidence":"high|moderate|low", "apply": true, "reason":"visible evidence only"},
    "head": {"base": 1, "checks": [null,null,null,null,null], "confidence":"high|moderate|low", "apply": true, "reason":"visible evidence only"},
    "health": {"base": 1, "checks": [null,null,null,null,null], "confidence":"high|moderate|low", "apply": false, "reason":"normally leave manual unless a listed item is clearly visible"}
  },
  "family_signature": {
    "carriage": "upright|moderate|horizontal|not assessable",
    "body_type": "compact|moderate|elongated|not assessable",
    "body_depth": "shallow|moderate|deep|not assessable",
    "neck_proportion": "short|moderate|long|not assessable",
    "shank_proportion": "short|moderate|long|not assessable",
    "tail_set": "low|moderate|high|not assessable",
    "head_profile": "fine|moderate|broad/robust|not assessable",
    "beak_profile": "fine|moderate|deep/robust|not assessable",
    "feather_tightness": "tight|moderate|loose/not assessable",
    "overall_balance": "balanced|front-heavy|rear-heavy|not assessable"
  }
}`;

    const content = [{ type: "input_text", text: prompt }];
    for (const p of photos) {
      if (!p?.image || typeof p.image !== "string" || !p.image.startsWith("data:image/")) continue;
      content.push({ type: "input_text", text: `PHOTO ${p.slot}` });
      content.push({ type: "input_image", image_url: p.image, detail: "high" });
    }

    const response = await client.responses.create({ model: MODEL, input: [{ role: "user", content }] });
    const analysis = extractJSON(response.output_text);
    res.json({ analysis, model: MODEL });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "AI analysis failed." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Gamefowl Pro AI running at http://localhost:${port}`));
