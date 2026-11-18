# Multi-Persona AI Market Research — Research Prototype

**Research title:** Development and Validation of a Multi-Persona AI System for Accurate Consumer Preference Simulation in Market Research

This project is a research-oriented prototype with:
- React + Vite frontend
- Node.js + Express backend
- Image upload and product-context form
- Clearly labelled **DEMO SIMULATION** mode with deterministic illustrative results
- Optional **AI ANALYSIS** mode using a vision-capable OpenAI-compatible model through the backend
- Multiple persona responses, sentiment/preference summaries, conditional verdict and product ideation
- CSV-based validation metrics for paired real-versus-predicted observations

> **Research integrity:** Demo output is not AI analysis, and neither demo nor AI-generated synthetic feedback is validated market evidence. Do not describe outputs as accurate until they have been evaluated against suitable real consumer data. Synthetic personas are hypotheses for research support, not substitutes for representative consumer studies.

## Requirements
- Node.js 20+ recommended
- npm
- Optional API key for AI mode

## Run locally

Open two terminals.

### 1. Backend
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
The API runs at `http://localhost:4000`.

### 2. Frontend
```bash
cd client
npm install
npm run dev
```
Open the URL printed by Vite (usually `http://localhost:5173`).

The Vite dev server proxies `/api` to port 4000.

## Enable AI mode
Edit `server/.env`:
```env
PORT=4000
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```
Use a vision-capable model available to your account. The key must remain in the backend `.env`; never place it in frontend code or commit it to version control. The server calls the OpenAI-compatible Responses API with the uploaded image and product context. If AI credentials are absent, the frontend can still use Demo Simulation mode, but AI mode returns a configuration error.

API providers and model names can change. Confirm current model availability and API requirements with your provider before deployment.

## Research workflow
1. Upload an image and enter product context.
2. Run **Demo Simulation** to inspect the interface and report structure, or **AI Analysis** to request model-generated synthetic feedback.
3. Record the model/provider, model version, prompt version, timestamp, product context, and outputs for reproducibility. This prototype includes a prompt version in the API response; extend persistence and experiment logging before formal research.
4. Collect real consumer responses using an approved protocol and informed consent.
5. Prepare a paired validation CSV with one row per comparable observation. The validation endpoint calculates:
   - Mean Absolute Error (MAE) for 1–5 preference scores
   - Root Mean Squared Error (RMSE)
   - Pearson correlation where mathematically defined
   - Purchase-intent classification accuracy
   - Mean prediction error by segment (a basic segment-level bias diagnostic)
6. Interpret all metrics with sample size, uncertainty intervals, sampling design and category context. This prototype does not calculate confidence intervals or certify model validity.

## Validation CSV format
Use `server/examples/validation-template.csv` as the column template:
- `respondent_id`: anonymized unique ID
- `segment`: a predefined consumer segment
- `real_preference_score`: observed preference rating, 1–5
- `predicted_preference_score`: prediction for the same respondent/segment and product, 1–5
- `real_purchase_intent`: observed intent, 0 or 1
- `predicted_purchase_intent`: predicted intent, 0 or 1

Rows must be meaningfully paired: the prediction must refer to the same unit, product, scale and time frame as the real observation. Do not compare unrelated aggregate synthetic personas to individual survey respondents and call it paired validation. Adapt the design to your research protocol.

## Verdict interpretation
The PASS / NEEDS IMPROVEMENT / FAIL labels are **decision-support labels**, not proof of commercial success. Configure and preregister thresholds for the specific product category and study before looking at results. The demo uses transparent illustrative rules; AI mode asks the model to state uncertainty and evidence limitations. For a real study, use a prespecified scoring rubric and human review.

## API
- `GET /api/health` — health and mode configuration
- `POST /api/analyze` — multipart form: `image`, `product` (JSON string), `mode` (`demo` or `ai`)
- `POST /api/validate` — multipart CSV file field `file`
- `GET /api/validation-template` — downloads the validation CSV template

## Suggested extensions before production
- Authentication, authorization, rate limiting and audit logs
- Secure image storage or deliberate no-retention policy
- Database for experiments and versioned results
- Consent, retention and deletion controls
- Human review and adverse-impact checks
- Stratified validation and confidence intervals / bootstrap analysis
- Comparison with baseline models and human analyst forecasts
- Unit/integration tests and deployment hardening
