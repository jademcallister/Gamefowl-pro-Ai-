# Gamefowl Pro AI

Photo + pedigree registry with automatic AI photo phenotype analysis.

## Why it uses a server
The OpenAI API key is kept in the server environment instead of being embedded in the browser HTML.

## Run locally
1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Put your OpenAI API key in `.env`.
4. Run `npm install` and then `npm start`.
5. Open `http://localhost:3000`.

## AI workflow
Enter a Band / ID, add P01-P12 photos, open AI Analysis, and tap Analyze Photos. The app resizes copies of the stored images before sending them to the server. The returned report is saved in the bird record.

## Important
The AI report is limited to visible phenotype/conformation. It does not confirm pedigree, bloodline, genetic inheritance, exact physical measurements without calibration, or performance ability.

## Version 2 additions
- AI findings are automatically mapped into photographically supportable scorecard categories.
- Mentality/disposition and bloodline/lineage remain manual because still photos cannot establish them.
- A new **Farm Family / Branch** field keeps your own families separate from the historic bloodline label.
- A new **Families** tab automatically aggregates saved birds by your farm-family name.
- Repeated standardized AI phenotype tags form a living farm-family phenotype reference.
- AI score suggestions and the family phenotype signature are saved with each bird.
- You can re-apply the AI suggestions from the AI Analysis tab after reviewing the report.

## Version 3 additions
- New **Compare** tab.
- Automatically compares the current bird to saved sire, dam, siblings, and its farm-family phenotype reference.
- Produces a visible-phenotype similarity percentage based on standardized AI family-signature traits.
- Shows trait-by-trait matches and differences.
- Identifies the closest saved visible phenotype match.
- The **Families** tab now shows each bird's similarity to the recurring phenotype of its own farm family.
- Comparison percentages are explicitly phenotype similarity only, not genetic percentages or proof of inheritance.

## Deployment note
This is a real Node/Express server (not a static site) because the OpenAI key has to stay server-side.
It will **not** run as-is on Netlify's static hosting the way your other Red Rock apps do — Netlify serves
static files and short-lived serverless functions, not a persistent Express process. To keep it on Netlify
you'd need to port the `/api/analyze` route into a Netlify Function, which raises timeout risk since a full
multi-photo GPT-5 vision analysis can run past Netlify's default 10s function limit. Simpler options: Render,
Railway, or Fly.io, all of which run this server unmodified — set `OPENAI_API_KEY` as an environment variable
there and deploy.
