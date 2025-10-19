"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<'en' | 'hi'>('en');
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const initialMessageSetRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = false;
      rec.lang = detectedLanguage === 'hi' ? 'hi-IN' : 'en-US';
      rec.interimResults = false;
      rec.onresult = (e: any) => {
        const text = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
        setQuery(text);
        setListening(false);
      };
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
    }
  }, [detectedLanguage]);

  useEffect(() => {
    // Only set initial message on first mount, preserve chat history on language changes
    if (!initialMessageSetRef.current) {
      const initialMessage = detectedLanguage === 'hi' 
        ? "नमस्ते! मैं HealthMate हूँ। मुझसे किसी भी स्वास्थ्य समस्या, दवा, बीमारी या लक्षण के बारे में पूछें। मैं आपकी मदद करूंगा।"
        : "Hi! I'm HealthMate. Ask me about any health issue, medicine, disease, or symptom you're experiencing. I'm here to help you.";
      
      setMessages([{ role: "assistant", content: initialMessage }]);
      initialMessageSetRef.current = true;
    }
  }, [detectedLanguage]);

  const getVoices = () => {
    return window.speechSynthesis.getVoices();
  };

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    
    // Cancel any previous speech
    window.speechSynthesis.cancel();
    
    console.log('🎤 Speaking text:', text.substring(0, 100) + '...', 'in language:', detectedLanguage);
    
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9;
    utter.pitch = 1;
    utter.volume = 1;
    utter.lang = detectedLanguage === 'hi' ? 'hi-IN' : 'en-US';
    
    // Function to set voice once voices are available
    const setVoice = () => {
      const voices = getVoices();
      console.log('🔍 Available voices total:', voices.length);
      
      // Log all available Hindi voices for debugging
      const hindiVoices = voices.filter(voice => 
        voice.lang.includes('hi') || 
        voice.name.toLowerCase().includes('hindi') ||
        voice.lang === 'hi-IN'
      );
      console.log('🇮🇳 Found Hindi voices:', hindiVoices.map(v => `${v.name} (${v.lang})`));
      
      if (detectedLanguage === 'hi') {
        // Enhanced Hindi voice detection with multiple fallbacks
        let hindiVoice = voices.find(voice => 
          voice.lang === 'hi-IN' || voice.lang === 'hi'
        );
        
        if (!hindiVoice) {
          hindiVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('hindi') ||
            voice.name.toLowerCase().includes('अ') ||
            voice.lang.toLowerCase().includes('hi')
          );
        }
        
        if (!hindiVoice) {
          // Try Google voices which often support Hindi
          hindiVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('google') && 
            (voice.lang.includes('hi') || voice.name.toLowerCase().includes('hindi'))
          );
        }
        
        // Try Microsoft voices
        if (!hindiVoice) {
          hindiVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('microsoft') && 
            (voice.lang.includes('hi') || voice.name.toLowerCase().includes('hindi'))
          );
        }
        
        // Try any voice that mentions 'india' or 'hindi'
        if (!hindiVoice) {
          hindiVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('india') ||
            voice.name.toLowerCase().includes('hindi') ||
            voice.lang.toLowerCase().includes('hi-in')
          );
        }
        
        if (hindiVoice) {
          utter.voice = hindiVoice;
          console.log('✅ Selected Hindi voice:', hindiVoice.name, hindiVoice.lang);
        } else {
          console.warn('⚠️ No specific Hindi voice found! Using system default with hi-IN lang');
          console.log('📋 Available voice names:', voices.slice(0, 10).map(v => v.name));
          // Force Hindi language even without specific voice
          utter.lang = 'hi-IN';
        }
      } else {
        // Try to find an English voice
        const englishVoice = voices.find(voice => 
          voice.lang.startsWith('en') && 
          (voice.name.toLowerCase().includes('us') || 
           voice.name.toLowerCase().includes('uk') || 
           voice.name.toLowerCase().includes('english'))
        );
        if (englishVoice) {
          utter.voice = englishVoice;
          console.log('✅ Selected English voice:', englishVoice.name);
        } else {
          // Fallback to any English voice
          const anyEnglishVoice = voices.find(voice => voice.lang.startsWith('en'));
          if (anyEnglishVoice) {
            utter.voice = anyEnglishVoice;
            console.log('✅ Fallback English voice:', anyEnglishVoice.name);
          }
        }
      }
    };

    // Set voice immediately if available, or wait for voices to load
    const voices = getVoices();
    if (voices.length > 0) {
      setVoice();
    } else {
      // Wait for voices to load
      const voicesChanged = () => {
        setVoice();
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChanged);
      };
      window.speechSynthesis.addEventListener('voiceschanged', voicesChanged);
      
      // Also try after a short delay as a fallback
      setTimeout(() => {
        const delayedVoices = getVoices();
        if (delayedVoices.length > 0) {
          setVoice();
        }
      }, 500);
    }
    
    utter.onstart = () => {
      setSpeaking(true);
      console.log('✅ Speech started successfully for:', detectedLanguage, 'language');
      console.log('🗣️ Voice used:', utter.voice?.name || 'default', '| Language code:', utter.lang);
      console.log('⚙️ Speech settings - Rate:', utter.rate, '| Pitch:', utter.pitch, '| Volume:', utter.volume);
    };
    utter.onend = () => {
      setSpeaking(false);
      console.log('🔚 Speech ended successfully');
    };
    utter.onerror = (event) => {
      setSpeaking(false);
      console.error('❌ Speech error occurred:', event.error);
      console.error('📋 Error details:', {
        error: event.error,
        type: event.type,
        textLength: text.length,
        language: detectedLanguage,
        voiceName: utter.voice?.name || 'default',
        voiceLang: utter.voice?.lang || 'unknown'
      });
      
      // Provide specific debugging information
      if (event.error === 'network') {
        console.warn('⚠️ Network error: Content might be too long or network connection issue');
      } else if (event.error === 'synthesis-failed') {
        console.warn('⚠️ Synthesis failed: Likely language/voice compatibility issue');
      } else if (event.error === 'audio-busy') {
        console.warn('⚠️ Audio busy: Another speech synthesis might be running');
      }
    };
    
    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  };

  const stopSpeaking = () => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const handleVoice = () => {
    if (!recognitionRef.current) return;
    if (!listening) {
      setListening(true);
      recognitionRef.current.start();
    } else {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  const getAIResponse = async (question: string): Promise<string> => {
    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question, 
          language: detectedLanguage,
          context: 'comprehensive_health'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      // Use manually selected language instead of auto-detection
      
      return data.response || (detectedLanguage === 'hi' 
        ? "माफ करें, मैं अभी आपकी मदद नहीं कर सकता। कृपया बाद में कोशिश करें।"
        : "Sorry, I cannot help you right now. Please try again later.");
    } catch (error) {
      console.error('Error getting AI response:', error);
      return detectedLanguage === 'hi'
        ? "माफ करें, तकनीकी समस्या के कारण मैं अभी जवाब नहीं दे सकता। कृपया फिर से कोशिश करें।"
        : "Sorry, I'm experiencing technical difficulties. Please try again.";
    }
  };

  const onSend = async () => {
    if (!query.trim() || loading) return;
    
    const userMsg = { role: "user" as const, content: query.trim() };
    setMessages((m) => [...m, userMsg]);
    setQuery("");
    setLoading(true);
    
    try {
      const botText = await getAIResponse(userMsg.content);
      const botMsg = { role: "assistant" as const, content: botText };
      setMessages((m) => [...m, botMsg]);
      speak(botText);
    } catch (error) {
      const errorMsg = { 
        role: "assistant" as const, 
        content: detectedLanguage === 'hi'
          ? "माफ करें, मुझे कोई समस्या हुई है। कृपया फिर से कोशिश करें।"
          : "Sorry, I encountered an error. Please try again."
      };
      setMessages((m) => [...m, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-4 w-[420px] max-w-[90vw] animate-fadeIn">
          <Card className="border border-blue-200 bg-white shadow-2xl overflow-hidden">
            {/* Enhanced Header */}
            <div className="bg-blue-50 p-4 border-b border-blue-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/30 rounded-bl-full"></div>
              <div className="relative flex items-center gap-3">
                <div className="text-2xl">
                  👨‍⚕️
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-blue-700">
                    HealthMate Assistant
                  </h3>
                  <div className="flex items-center gap-2 text-gray-600 text-xs">
                    <span>{detectedLanguage === 'hi' ? 'AI-संचालित चिकित्सा मार्गदर्शन' : 'AI-powered comprehensive health guidance'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Language Toggle Switch */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-600">EN</span>
                    <button
                      onClick={() => setDetectedLanguage(detectedLanguage === 'hi' ? 'en' : 'hi')}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        detectedLanguage === 'hi' ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          detectedLanguage === 'hi' ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="text-xs text-gray-600">हिं</span>
                  </div>
                  <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {detectedLanguage === 'hi' ? 'ऑनलाइन' : 'Online'}
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="p-0">
              {/* Enhanced Messages Container */}
              <div className="p-4 bg-white">
                <div className="max-h-80 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className="flex items-start gap-2 max-w-[85%]">
                        {m.role === "assistant" && (
                          <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 mt-1">
                            👨‍⚕️
                          </div>
                        )}
                        <div className={`rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed shadow-lg ${
                          m.role === "user" 
                            ? "bg-blue-500 text-white shadow-blue-200" 
                            : "bg-blue-50 text-gray-800 border border-blue-200"
                        }`}>
                          {m.content}
                        </div>
                        {m.role === "user" && (
                          <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 mt-1">
                            👤
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enhanced Input Area */}
              <div className="p-4 bg-blue-50 border-t border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 relative">
                    <Input
                      placeholder={detectedLanguage === 'hi' 
                        ? "किसी भी स्वास्थ्य समस्या, दवा, बीमारी के बारे में पूछें..."
                        : "Ask about any health issue, medicine, disease, symptoms..."}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !loading && onSend()}
                      disabled={loading}
                      className="bg-white border-blue-200 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pr-12 disabled:opacity-50"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <span className="text-gray-400 text-xs">💬</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleVoice} 
                            disabled={loading}
                            className={`border-2 ${
                              listening 
                                ? "border-blue-400 text-blue-600 bg-blue-50 animate-pulse" 
                                : "border-blue-200 text-blue-600 bg-white"
                            } disabled:opacity-50`}
                          >
                            {listening ? (
                              <span className="flex items-center gap-1">
                                🎙️ <span className="text-xs">{detectedLanguage === 'hi' ? 'सुन रहा...' : 'Listening...'}</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                🎤 <span className="text-xs">{detectedLanguage === 'hi' ? 'आवाज़' : 'Voice'}</span>
                              </span>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-blue-600 text-white border-0">
                          {listening 
                            ? (detectedLanguage === 'hi' ? 'आवाज़ इनपुट बंद करने के लिए क्लिक करें' : 'Click to stop voice input') 
                            : (detectedLanguage === 'hi' ? 'आवाज़ इनपुट का उपयोग करने के लिए क्लिक करें' : 'Click to use voice input')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {speaking && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={stopSpeaking}
                              className="border-2 border-red-200 text-red-600 bg-red-50 animate-pulse"
                            >
                              <span className="flex items-center gap-1">
                                🔇 <span className="text-xs">{detectedLanguage === 'hi' ? 'रोकें' : 'Stop'}</span>
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-red-600 text-white border-0">
                            {detectedLanguage === 'hi' ? 'बोलना बंद करें' : 'Stop speaking'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  
                  <Button 
                    onClick={onSend}
                    disabled={!query.trim() || loading}
                    className="bg-blue-500 text-white font-semibold px-6 py-2 rounded-xl border-0 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-2">
                      {loading ? (
                        <>
                          <span>{detectedLanguage === 'hi' ? 'प्रतीक्षा...' : 'Sending...'}</span>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </>
                      ) : (
                        <>
                          <span>{detectedLanguage === 'hi' ? 'भेजें' : 'Send'}</span>
                          <span className="text-lg">📤</span>
                        </>
                      )}
                    </span>
                  </Button>
                </div>

                {/* Enhanced Disclaimer */}
                <div className="mt-3 p-3 bg-blue-100 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <div className="text-blue-600 text-sm flex-shrink-0">⚠️</div>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      {detectedLanguage === 'hi'
                        ? 'यह AI सहायक केवल शैक्षिक जानकारी प्रदान करता है और पेशेवर चिकित्सा सलाह का विकल्प नहीं है। चिकित्सा निर्णयों के लिए हमेशा स्वास्थ्य सेवा प्रदाताओं से सलाह लें।'
                        : 'This AI assistant provides educational information only and is not a substitute for professional medical advice. Always consult healthcare providers for medical decisions.'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Toggle Button */}
      <Button
        onClick={() => setOpen((o) => !o)}
        className="bg-blue-500 text-white font-semibold rounded-full h-14 px-6 shadow-lg border-0"
      >
        <span className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            {open ? '✕' : '👨‍⚕️'}
          </div>
          <span className="font-bold">
            {open 
              ? (detectedLanguage === 'hi' ? 'सहायक बंद करें' : 'Close Assistant') 
              : (detectedLanguage === 'hi' ? 'HealthMate से पूछें' : 'Ask HealthMate')}
          </span>
        </span>
      </Button>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(59, 130, 246, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3b82f6;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
}