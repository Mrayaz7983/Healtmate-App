import { NextResponse } from "next/server";
import { AIService } from "@/lib/ai-service";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Analyze the medical report using AI
    const analysis = await AIService.analyzeReport(text);

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error("Error analyzing report:", error);
    return NextResponse.json({ 
      error: error?.message || "Failed to analyze report" 
    }, { status: 500 });
  }
}