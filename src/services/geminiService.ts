import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnalysisResult {
  category: "Medical" | "Food" | "Infrastructure" | "Safety";
  urgency_score: number;
  summary: string;
  keywords: string[];
}

export async function analyzeFieldReport(reportText: string): Promise<AnalysisResult> {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Act as a Disaster Relief Coordinator. Analyze the following user report: ${reportText}.
Extract the following information in strict JSON format:
Category: (Medical, Food, Infrastructure, or Safety)
Urgency_Score: (A number from 1 to 10 based on life-threat levels)
Summary: (A 10-word summary of the need)
Keywords: (List 3 critical keywords like 'bleeding' or 'trapped')
If the report is vague, default Urgency_Score to 5.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            urgency_score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["category", "urgency_score", "summary", "keywords"]
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text.trim()) as AnalysisResult;
  } catch (error) {
    console.error("AI Analysis Failed on Client:", error);
    return {
      category: "Safety",
      urgency_score: 5,
      summary: "Manual review required.",
      keywords: ["alert"]
    };
  }
}
