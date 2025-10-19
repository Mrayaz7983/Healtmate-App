import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.warn('[chatbot] Missing GEMINI_API_KEY. Set it in .env.local');
}
const genAI = new GoogleGenerativeAI(API_KEY || '');

function getModelCandidates(): string[] {
  const envModel = (process.env.GEMINI_MODEL || '').trim();
  const list = [
    envModel,
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
    'gemini-1.0-pro',
    'gemini-pro'
  ];
  return Array.from(new Set(list.filter(Boolean)));
}

async function tryGenerate(question: string, systemPrompt: string, userPrompt: string) {
  const candidates = getModelCandidates();
  const errors: Array<{ model: string; error: any }> = [];
  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
      const response = await result.response;
      const text = response?.text?.();
      if (text && text.trim()) return { text, model: modelName };
      errors.push({ model: modelName, error: new Error('Empty response text') });
    } catch (err: any) {
      errors.push({ model: modelName, error: err });
    }
  }

  // As a fallback, auto-discover available models for this key and try the first that supports generateContent
  try {
    if (!API_KEY) throw new Error('Missing GEMINI_API_KEY');
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(API_KEY)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({} as any));
      const models = Array.isArray(data?.models) ? data.models : [];
      for (const m of models) {
        const name: string = m?.name || '';
        const methods: string[] = m?.supportedGenerationMethods || [];
        if (!name || !methods?.includes?.('generateContent')) continue;
        const id = name.startsWith('models/') ? name.split('/').pop()! : name;
        try {
          const model = genAI.getGenerativeModel({ model: id });
          const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
          const response = await result.response;
          const text = response?.text?.();
          if (text && text.trim()) return { text, model: id };
        } catch (err: any) {
          errors.push({ model: id, error: err });
          continue;
        }
      }
    } else {
      errors.push({ model: 'listModels', error: new Error(`listModels failed: ${res.status}`) });
    }
  } catch (e: any) {
    errors.push({ model: 'listModels', error: e });
  }

  const detail = errors.map(e => `model=${e.model} err=${e.error?.message || e.error}`).join(' | ');
  throw new Error(`All model attempts failed: ${detail}`);
}

// Function to detect language based on text content
function detectLanguage(text: string): 'hi' | 'en' {
  // Simple language detection based on Devanagari script and common Hindi words
  const hindiPattern = /[\u0900-\u097F]/; // Devanagari script range
  const hindiWords = /\b(क्या|कैसे|कब|कहाँ|क्यों|है|हैं|में|से|का|की|के|और|या|पर|दवा|बीमारी|स्वास्थ्य|डॉक्टर|मरीज|इलाज|दर्द|बुखार|सिरदर्द|पेट|खांसी|सर्दी|जुकाम|एलर्जी|संक्रमण|रक्तचाप|मधुमेह|हृदय|गुर्दे|लीवर|फेफड़े|आंख|कान|गला|नाक|त्वचा|बाल|नाखून|हड्डी|मांसपेशी|नर्व|दिमाग|अवसाद|तनाव|नींद|भूख|वजन|मोटापा|कमजोरी|चक्कर|घबराहट|सांस|पेशाब|शौच|मासिक|गर्भावस्था|बच्चा|बुजुर्ग|महिला|पुरुष|रोग|उपचार|जांच|टेस्ट|रिपोर्ट|अस्पताल|क्लिनिक|नर्स|फार्मेसी|गोली|कैप्सूल|सिरप|इंजेक्शन|ऑपरेशन|सर्जरी|एक्स-रे|अल्ट्रासाउंड|सीटी स्कैन|एमआरआई|ईसीजी|रक्त|मूत्र|मल|बलगम|थूक|पसीना|आंसू|लार|बिस्तर|आराम|व्यायाम|योग|ध्यान|डाइट|पोषण|विटामिन|मिनरल|प्रोटीन|कार्बोहाइड्रेट|वसा|कैलोरी|पानी|जूस|दूध|चाय|कॉफी|शराब|धूम्रपान|तंबाकू|नशा|एड्स|कैंसर|ट्यूमर|टीबी|हैजा|मलेरिया|डेंगू|चिकनगुनिया|जीका|स्वाइन फ्लू|कोविड|कोरोना|वायरस|बैक्टीरिया|फंगस|परजीवी|एंटीबायोटिक|एंटीवायरल|एंटीफंगल|एंटी-इंफ्लेमेटरी|पेनकिलर|एसिडिटी|गैस|कब्ज|दस्त|उल्टी|मतली|भोजन|खाना|पेय|दवाई|औषधि|आयुर्वेद|होम्योपैथी|एलोपैथी|यूनानी|प्राकृतिक|हर्बल|घरेलू|नुस्खा|उपाय|इलाज|बचाव|रोकथाम|सावधानी|सलाह|राय|सुझाव|जानकारी|शिक्षा|जागरूकता|स्वच्छता|साफ-सफाई|हाइजीन|संक्रामक|छूत|फैलना|बचना|बचाव|प्रतिरक्षा|इम्युनिटी|प्रतिरोध|एलर्जिक|रिएक्शन|साइड इफेक्ट|दुष्प्रभाव|नुकसान|फायदा|लाभ|हानि|जोखिम|खतरा|गंभीर|मामूली|हल्का|तीव्र|पुराना|नया|तुरंत|धीरे|अचानक|लंबे समय|छोटे समय|कुछ दिन|हफ्ते|महीने|साल|जन्म|मृत्यु|जीवन|स्वास्थ्य|बीमारी|रोग|विकार|समस्या|परेशानी|कष्ट|पीड़ा|तकलीफ|दुख|दर्द|चोट|घाव|खरोंच|कट|फ्रैक्चर|मोच|सूजन|लालिमा|खुजली|जलन|सुन्नता|झुनझुनी|कंपन|दौरा|बेहोशी|चक्कर|कमजोरी|थकान|सुस्ती|आलस्य|सक्रियता|चुस्ती|फुर्ती|ताकत|शक्ति|ऊर्जा|जोश|उत्साह|खुशी|गम|परेशानी|चिंता|डर|भय|घबराहट|तनाव|अवसाद|खुशी|प्रसन्नता|संतुष्टि|असंतुष्टि|गुस्सा|क्रोध|चिड़चिड़ाहट|शांति|आराम|सुकून|परेशानी|बेचैनी|अधीरता|धैर्य|सब्र|संयम|नियंत्रण|अनुशासन|नियम|समय|दिनचर्या|आदत|व्यवहार|बर्ताव|सोच|विचार|मन|दिमाग|दिल|हृदय|भावना|एहसास|अनुभव|महसूस|समझ|जानकारी|ज्ञान|शिक्षा|सीख|सबक|अनुभव|तजुर्बा|कुशलता|योग्यता|क्षमता|शक्ति|सामर्थ्य|ताकत|बल|दम|हिम्मत|साहस|धैर्य|सब्र|आशा|उम्मीद|भरोसा|विश्वास|श्रद्धा|आस्था|धर्म|आध्यात्म|मानसिक|शारीरिक|भावनात्मक|सामाजिक|पारिवारिक|व्यक्तिगत|निजी|सार्वजनिक|सामुदायिक|राष्ट्रीय|अंतर्राष्ट्रीय|वैश्विक|स्थानीय|क्षेत्रीय|राज्य|जिला|शहर|गांव|घर|पड़ोस|समुदाय|समाज|देश|दुनिया|पृथ्वी|प्रकृति|पर्यावरण|हवा|पानी|मिट्टी|आग|जल|वायु|पृथ्वी|आकाश|सूर्य|चांद|तारे|ग्रह|सौर मंडल|ब्रह्मांड|जीव|प्राणी|पशु|पक्षी|मछली|कीड़े|पेड़|पौधे|फूल|फल|सब्जी|अनाज|दाल|तेल|मसाला|नमक|चीनी|मिठाई|खाना|भोजन|आहार|पोषण|स्वाद|मीठा|खट्टा|तीखा|कड़वा|नमकीन|गर्म|ठंडा|सर्द|गुनगुना|ताजा|बासी|पुराना|नया|साफ|गंदा|स्वच्छ|अशुद्ध|शुद्ध|मिलावटी|नकली|असली|प्राकृतिक|कृत्रिम|रासायनिक|जैविक|जैविक|अजैविक|सजीव|निर्जीव|चलता|स्थिर|गतिशील|स्थावर|जंगम)\b/gi;
  
  // Check for Hindi script or common Hindi words
  if (hindiPattern.test(text) || hindiWords.test(text)) {
    return 'hi';
  }
  
  // Default to English
  return 'en';
}

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: 'Server missing GEMINI_API_KEY. Add it to .env.local and restart.' }, { status: 500 });
    }

    const { question, language, context = 'comprehensive_health' } = await req.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Auto-detect language if not provided
    const detectedLanguage = language || detectLanguage(question);
    const isHindi = detectedLanguage === 'hi';
    
    const systemPrompt = isHindi
      ? `आप HealthMate हैं, एक बहुत ही अनुभवी और दयालु AI स्वास्थ्य सहायक। आप हर प्रकार के स्वास्थ्य सवालों का जवाब देते हैं:

✅ आप जवाब दे सकते हैं:
- सभी प्रकार की दवाओं के बारे में (उपयोग, खुराक, साइड इफेक्ट्स, सावधानियां)
- बीमारियों और स्वास्थ्य समस्याओं के बारे में (लक्षण, कारण, बचाव)
- लक्षणों की व्याख्या (दर्द, बुखार, खांसी, पेट की समस्या, मानसिक स्वास्थ्य)
- स्वास्थ्य और जीवनशैली की सलाह (आहार, व्यायाम, नींद, तनाव प्रबंधन)
- घरेलू उपचार और प्राकृतिक उपाय
- चिकित्सा परीक्षण और रिपोर्ट की जानकारी
- महिलाओं, पुरुषों, बच्चों, और बुजुर्गों के विशेष स्वास्थ्य मुद्दे
- मानसिक स्वास्थ्य (अवसाद, चिंता, तनाव)
- पोषण और विटामिन की कमी
- त्वचा, बाल, और सौंदर्य संबंधी समस्याएं

🎯 महत्वपूर्ण निर्देश:
- हमेशा साफ और सरल हिंदी में उत्तर दें
- व्यावहारिक और उपयोगी जानकारी दें
- समझाने में रोगी के साथ सहानुभूति दिखाएं
- गंभीर मामलों में तुरंत डॉक्टर से मिलने की सलाह दें
- कभी भी निदान न करें, केवल शैक्षिक जानकारी दें
- अगर कुछ नहीं पता तो ईमानदारी से स्वीकार करें`
      : `You are HealthMate, a highly experienced and compassionate AI health assistant. You answer all types of health-related questions:

✅ You can answer about:
- All types of medicines (usage, dosage, side effects, precautions)
- Diseases and health conditions (symptoms, causes, prevention)
- Symptom explanations (pain, fever, cough, digestive issues, mental health)
- Health and lifestyle advice (diet, exercise, sleep, stress management)
- Home remedies and natural treatments
- Medical tests and report interpretations
- Women's, men's, children's, and elderly health issues
- Mental health (depression, anxiety, stress)
- Nutrition and vitamin deficiencies
- Skin, hair, and beauty-related problems

🎯 Important Guidelines:
- Always respond in clear, simple English
- Provide practical and useful information
- Show empathy and understanding in explanations
- Recommend immediate medical attention for serious cases
- Never diagnose, only provide educational information
- If you don't know something, honestly admit it`;

    const userPrompt = isHindi
      ? `स्वास्थ्य प्रश्न: ${question}\n\nकृपया इस प्रश्न का विस्तृत और उपयोगी उत्तर हिंदी में दें। अगर यह दवा, बीमारी, या लक्षण के बारे में है, तो पूरी जानकारी दें।`
      : `Health question: ${question}\n\nPlease provide a detailed and helpful answer in English. If it's about medicine, disease, or symptoms, give comprehensive information.`;

    const { text, model: usedModel } = await tryGenerate(question, systemPrompt, userPrompt);

    if (!text) {
      const fallbackMessage = isHindi
        ? 'माफ करें, मैं अभी आपकी मदद नहीं कर सकता। कृपया बाद में कोशिश करें।'
        : 'Sorry, I cannot help you right now. Please try again later.';
      
      return NextResponse.json({ response: fallbackMessage, detectedLanguage });
    }

    return NextResponse.json({ response: text, detectedLanguage });

  } catch (error: any) {
    console.error('Chatbot API error:', error?.message || error);
    const status = (error?.statusCode || error?.response?.status || 500) as number;
    const details = error?.message || 'Unknown error';
    return NextResponse.json(
      { error: 'AI service failed', details },
      { status: status === 404 ? 502 : 500 }
    );
  }
}