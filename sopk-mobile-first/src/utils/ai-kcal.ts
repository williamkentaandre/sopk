function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Base64 conversion failed"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

interface AiEstimateResult {
  kcal: number;
  confidence: number;
  source: "ai";
}

export async function estimateKcalWithAIOrFallback(
  file: File,
  plannedKcal: number,
  apiKey: string
): Promise<AiEstimateResult> {
  if (!apiKey) {
    throw new Error("Clé API Gemini requise");
  }

  try {
    const base64 = await fileToBase64(file);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Estimate total kcal for this meal photo.
Return only strict JSON:
{"kcal": number, "confidence": number}
Rules:
- kcal between 120 and 1200
- confidence between 0.3 and 0.99`,
              },
              {
                inline_data: {
                  mime_type: file.type || "image/jpeg",
                  data: base64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("AI request failed");
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < 0) throw new Error("AI response not parseable");
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as { kcal?: number; confidence?: number };

    const kcal = Math.round(Math.min(1200, Math.max(120, Number(parsed.kcal ?? plannedKcal))));
    const confidence = Math.min(0.99, Math.max(0.3, Number(parsed.confidence ?? 0.75)));

    return { kcal, confidence, source: "ai" };
  } catch {
    throw new Error("Analyse IA impossible. Vérifie la clé API et réessaie.");
  }
}
