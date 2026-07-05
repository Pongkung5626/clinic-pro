
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface ExtractedItem {
  name: string;
  tradeName?: string;
  stock: number;
  unit: string;
  price: number;
  costPrice?: number;
  barcode?: string;
  category?: string;
  purpose?: string;
}

export const parseInventoryImage = async (base64Data: string, mimeType: string): Promise<ExtractedItem[]> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Extract inventory items from this document (image or PDF). 
    Look for drug names (generic name), trade names (brand name), quantities, units, cost prices, and selling prices.
    
    UNIT ANALYSIS RULE:
    - If a quantity is listed with a sub-unit (e.g., "1 bottle (500 tabs)"), extract the total count of the smallest unit if possible (e.g., stock: 500, unit: "เม็ด").
    - If it's a pack (e.g., "1 box of 10 vials"), you can keep it as stock: 1, unit: "กล่อง" but note the contents in the purpose field.
    - Be precise about the unit name in Thai (e.g., เม็ด, ขวด, แผง, กล่อง, ชิ้น).
    
    Return the data as a JSON array of objects.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Data.split(',')[1] || base64Data,
              mimeType
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            tradeName: { type: Type.STRING },
            stock: { type: Type.NUMBER },
            unit: { type: Type.STRING },
            price: { type: Type.NUMBER },
            costPrice: { type: Type.NUMBER },
            barcode: { type: Type.STRING },
            category: { type: Type.STRING },
            purpose: { type: Type.STRING }
          },
          required: ["name", "stock", "unit"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
};

export const extractItemNameFromPhoto = async (base64Data: string, mimeType: string): Promise<string> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = "What is the name of the drug or medical supply shown in this photo? Return only the name, nothing else.";

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Data.split(',')[1] || base64Data,
              mimeType
            }
          }
        ]
      }
    ]
  });

  return response.text?.trim() || "";
};
