import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface MedicalAnalysis {
  keyFindings: string[];
  potentialConditions: string[];
  urgencyLevel: 'low' | 'medium' | 'high';
  questions: string[];
}

export interface ReportData {
  patientResponses: Record<string, string>;
  originalReport: string;
  analysis: MedicalAnalysis;
}

export interface GeneratedReport {
  content: string;
  recommendations: string[];
}

export class AIService {
  // Analyze medical report and extract key information
  static async analyzeReport(reportText: string): Promise<MedicalAnalysis> {
    try {
      const prompt = `
        You are a medical AI assistant analyzing a patient's medical report. 
        Extract key information and generate intelligent questions.
        
        Report text: ${reportText}
        
        Analyze the report and return a JSON response with:
        - keyFindings: Array of key medical findings from the report
        - potentialConditions: Array of possible conditions based on the findings
        - urgencyLevel: "low", "medium", or "high" based on the severity
        - questions: Array of 3-5 relevant questions to ask the patient to better understand their condition
        
        Make questions specific to the medical issues mentioned in the report.
        Questions should help gather additional context about symptoms, duration, triggers, etc.
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt + "\n\nPlease respond with valid JSON only, no additional text.");
      const response = await result.response;
      let content = response.text() || "{}";
      
      // Clean up Gemini response - remove markdown code blocks and extra text
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      if (content.includes('\n') && content.includes('{')) {
        // Extract JSON from potentially verbose response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          content = jsonMatch[0];
        }
      }
      
      try {
        const parsed = JSON.parse(content);
        
        // Validate analysis response structure and provide fallbacks
        if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
          console.warn("AI returned invalid analysis structure, using fallback questions");
          return {
            keyFindings: parsed.keyFindings || [],
            potentialConditions: parsed.potentialConditions || [],
            urgencyLevel: parsed.urgencyLevel || 'medium',
            questions: [
              "How long have you been experiencing these symptoms?",
              "What makes your symptoms better or worse?",
              "Are you currently taking any medications for this condition?"
            ]
          };
        }
        return parsed;
      } catch (parseError) {
        console.error("AI response parsing failed - response length:", content.length);
        // Return fallback analysis if parsing fails
        return {
          keyFindings: ["Unable to analyze report automatically"],
          potentialConditions: ["General health consultation recommended"],
          urgencyLevel: 'medium' as const,
          questions: [
            "What are your main health concerns from this report?",
            "How long have you been experiencing any symptoms?",
            "Are you currently taking any medications?"
          ]
        };
      }
    } catch (error) {
      console.error("Error analyzing report:", error);
      throw new Error("Failed to analyze medical report");
    }
  }

  // Generate personal report (simplified language)
  static async generatePersonalReport(reportData: ReportData): Promise<GeneratedReport> {
    try {
      const prompt = `
        Generate a personal medical report for a patient in simple, easy-to-understand language.
        
        Original Report: ${reportData.originalReport}
        Analysis: ${JSON.stringify(reportData.analysis)}
        Patient Responses: ${JSON.stringify(reportData.patientResponses)}
        
        Create a comprehensive report that includes:
        1. What the problem is (in simple terms)
        2. What might be causing it
        3. Recommended treatments (in simple language)
        4. Practical advice for getting better faster
        5. When to seek immediate medical attention
        
        Use everyday language that anyone can understand. Avoid medical jargon.
        Be supportive and encouraging in tone.
        
        Return JSON with:
        - content: The full report text
        - recommendations: Array of practical health advice
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt + "\n\nPlease respond with valid JSON only, no additional text.");
      const response = await result.response;
      let content = response.text() || "{}";
      
      // Clean up Gemini response - remove markdown code blocks and extra text
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      if (content.includes('\n') && content.includes('{')) {
        // Extract JSON from potentially verbose response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          content = jsonMatch[0];
        }
      }
      
      try {
        const parsed = JSON.parse(content);
        
        // Validate report response structure and provide fallbacks
        if (!parsed.content || typeof parsed.content !== 'string') {
          console.warn("AI returned invalid report structure, using fallback");
          return {
            content: "Unable to generate detailed report at this time. Please consult with your healthcare provider for a comprehensive analysis of your medical report.",
            recommendations: ["Consult with your healthcare provider", "Keep track of your symptoms", "Follow up as recommended"]
          };
        }
        
        // Ensure recommendations is an array
        if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
          parsed.recommendations = [];
        }
        
        return parsed;
      } catch (parseError) {
        console.error("AI response parsing failed - response length:", content.length);
        // Return fallback report if parsing fails
        return {
          content: "Unable to generate detailed report due to a technical issue. Please consult with your healthcare provider for a comprehensive analysis of your medical report.",
          recommendations: ["Consult with your healthcare provider", "Keep track of your symptoms", "Follow up as recommended"]
        };
      }
    } catch (error) {
      console.error("Error generating personal report:", error);
      throw new Error("Failed to generate personal report");
    }
  }

  // Generate professional report (medical terminology)
  static async generateProfessionalReport(reportData: ReportData): Promise<GeneratedReport> {
    try {
      const prompt = `
        Generate a professional medical report using proper medical terminology for healthcare providers.
        
        Original Report: ${reportData.originalReport}
        Analysis: ${JSON.stringify(reportData.analysis)}
        Patient Responses: ${JSON.stringify(reportData.patientResponses)}
        
        Create a comprehensive professional report that includes:
        1. Clinical assessment and findings
        2. Differential diagnosis considerations
        3. Recommended diagnostic procedures (if applicable)
        4. Treatment protocol suggestions
        5. Prognosis and follow-up recommendations
        
        Use appropriate medical terminology and maintain professional clinical language.
        Include relevant clinical indicators and evidence-based recommendations.
        
        Return JSON with:
        - content: The full professional report text
        - recommendations: Array of clinical recommendations
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt + "\n\nPlease respond with valid JSON only, no additional text.");
      const response = await result.response;
      let content = response.text() || "{}";
      
      // Clean up Gemini response - remove markdown code blocks and extra text
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      if (content.includes('\n') && content.includes('{')) {
        // Extract JSON from potentially verbose response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          content = jsonMatch[0];
        }
      }
      
      try {
        const parsed = JSON.parse(content);
        
        // Validate report response structure and provide fallbacks
        if (!parsed.content || typeof parsed.content !== 'string') {
          console.warn("AI returned invalid report structure, using fallback");
          return {
            content: "Unable to generate detailed report at this time. Please consult with your healthcare provider for a comprehensive analysis of your medical report.",
            recommendations: ["Consult with your healthcare provider", "Keep track of your symptoms", "Follow up as recommended"]
          };
        }
        
        // Ensure recommendations is an array
        if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
          parsed.recommendations = [];
        }
        
        return parsed;
      } catch (parseError) {
        console.error("AI response parsing failed - response length:", content.length);
        // Return fallback report if parsing fails
        return {
          content: "Unable to generate detailed report due to a technical issue. Please consult with your healthcare provider for a comprehensive analysis of your medical report.",
          recommendations: ["Consult with your healthcare provider", "Keep track of your symptoms", "Follow up as recommended"]
        };
      }
    } catch (error) {
      console.error("Error generating professional report:", error);
      throw new Error("Failed to generate professional report");
    }
  }
}