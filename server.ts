import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const TCRA_SYSTEM_PROMPT = `You are a TCRA Framework Auditor. You evaluate AI-generated (vibecoded) code using the TCRA framework from academic research on the intelligence-automation boundary in conversational AI systems.

TCRA stands for: Transparency, Controllability, Reliability, Auditability.

Score each dimension from 0 to 3:

TRANSPARENCY (How visible is the reasoning behind the code?)
0 - Opaque output, no comments or rationale
1 - Minimal comments; ad-hoc rationale
2 - Partial trace; rationale links to code paths
3 - Inspectable trace; step mapping; reproducible rationale

CONTROLLABILITY (How well can a human steer or modify this code?)
0 - Prompts rarely steer behavior; rigid structure
1 - Coarse control; side effects common
2 - Localized steering with minor trade-offs
3 - Fine-grained control; constraints obeyed consistently

RELIABILITY (How robust is this code across variations?)
0 - Flaky; silent failures likely
1 - Passes base cases only
2 - Robust to small prompt/data shifts
3 - Robust across perturbations, seeds, and refactors

AUDITABILITY (How traceable and testable is this code?)
0 - No provenance or tests
1 - Sparse logs; brittle tests
2 - Provenance + runnable tests present
3 - Full provenance; versioned tests; reproducible builds

Also identify:
- Up to 3 specific risks or silent failure points
- Whether this code appears to be vibecoded (AI-generated) based on its patterns
- One sentence on the overall intelligence-automation classification (Automated Execution 0-3, Assisted Automation 4-7, Delegated Reasoning 8-10, Collaborative Intelligence 11-12)

Respond ONLY with a valid, clean JSON object. Do NOT put any markdown formatting, preamble, or explain_json block. Your response must be parsed strictly by JSON.parse. Format:
{
  "transparency": { "score": 0, "explanation": "..." },
  "controllability": { "score": 0, "explanation": "..." },
  "reliability": { "score": 0, "explanation": "..." },
  "auditability": { "score": 0, "explanation": "..." },
  "composite": 0,
  "classification": "Automated Execution" or "Assisted Automation" or "Delegated Reasoning" or "Collaborative Intelligence",
  "classificationSummary": "One sentence summary",
  "risks": ["risk1", "risk2", "risk3"],
  "isVibecoded": true,
  "vibecodeEvidence": "Brief explanation of why this appears (or doesn't appear) to be AI-generated"
}`;

function cleanJsonResponse(text: string): string {
  let clean = text.trim();
  // Strip markdown code fences if present
  if (clean.startsWith("```")) {
    const firstLineEnd = clean.indexOf("\n");
    if (firstLineEnd !== -1) {
      clean = clean.substring(firstLineEnd).trim();
    }
    if (clean.endsWith("```")) {
      clean = clean.substring(0, clean.length - 3).trim();
    }
  }
  return clean;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Audit evaluation route
  app.post("/api/audit", async (req, res) => {
    try {
      const { code, prompt, provider, model, apiKey } = req.body;

      if (!code) {
        return res.status(400).json({ error: "No code provided to audit" });
      }

      const activeProvider = provider || "google";
      const activeModel = model || "gemini-3.5-flash";

      const userMessage = prompt && prompt.trim()
        ? `Original prompt used to generate this code:\n"${prompt}"\n\nAI-generated code to evaluate:\n\`\`\`\n${code}\n\`\`\``
        : `AI-generated code to evaluate:\n\`\`\`\n${code}\n\`\`\``;

      let responseText = "";

      if (activeProvider === "google") {
        const resolvedApiKey = apiKey || process.env.GEMINI_API_KEY;
        if (!resolvedApiKey || resolvedApiKey === "MY_GEMINI_API_KEY") {
          return res.status(400).json({
            error: "Gemini API key is not configured. Please supply your API key or configure it in Settings > Secrets."
          });
        }

        const ai = new GoogleGenAI({
          apiKey: resolvedApiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const response = await ai.models.generateContent({
          model: activeModel,
          contents: userMessage,
          config: {
            systemInstruction: TCRA_SYSTEM_PROMPT,
            responseMimeType: "application/json",
          }
        });

        responseText = response.text || "";
      } else if (activeProvider === "openai") {
        const resolvedApiKey = apiKey || process.env.OPENAI_API_KEY;
        if (!resolvedApiKey) {
          return res.status(400).json({
            error: "OpenAI API key is missing. Please provide it in the API Setup section of the application."
          });
        }

        const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resolvedApiKey}`
          },
          body: JSON.stringify({
            model: activeModel || "gpt-4o",
            messages: [
              { role: "system", content: TCRA_SYSTEM_PROMPT },
              { role: "user", content: userMessage }
            ],
            response_format: { type: "json_object" }
          })
        });

        if (!openAiResponse.ok) {
          const errDetail = await openAiResponse.text();
          throw new Error(`OpenAI API returned error status ${openAiResponse.status}: ${errDetail}`);
        }

        const data: any = await openAiResponse.json();
        responseText = data.choices?.[0]?.message?.content || "";
      } else if (activeProvider === "anthropic") {
        const resolvedApiKey = apiKey || process.env.ANTHROPIC_API_KEY;
        if (!resolvedApiKey) {
          return res.status(400).json({
            error: "Anthropic API key is missing. Please provide it in the API Setup section of the application."
          });
        }

        const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": resolvedApiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: activeModel || "claude-3-5-sonnet-latest",
            max_tokens: 4000,
            system: TCRA_SYSTEM_PROMPT,
            messages: [
              { role: "user", content: userMessage }
            ]
          })
        });

        if (!anthropicResponse.ok) {
          const errDetail = await anthropicResponse.text();
          throw new Error(`Anthropic API returned error status ${anthropicResponse.status}: ${errDetail}`);
        }

        const data: any = await anthropicResponse.json();
        responseText = data.content?.map((b: any) => b.text || "").join("") || "";
      } else {
        return res.status(400).json({ error: `Unsupported provider: ${activeProvider}` });
      }

      const cleanJson = cleanJsonResponse(responseText);
      const parsedAudit = JSON.parse(cleanJson);

      return res.json(parsedAudit);

    } catch (err: any) {
      console.error("Audit processing failure: ", err);
      return res.status(500).json({
        error: `Audit execution failed: ${err.message || "An unexpected error occurred."}`
      });
    }
  });

  // Vite serving integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
