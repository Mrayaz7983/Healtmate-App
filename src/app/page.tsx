"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Chatbot from "@/components/Chatbot";

export default function Home() {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subtitleRef = useRef<HTMLParagraphElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const flowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(heroRef.current, { opacity: 0, duration: 0.6 })
        .from(titleRef.current, { y: 30, opacity: 0, duration: 0.8 }, "-=0.2")
        .from(subtitleRef.current, { y: 20, opacity: 0, duration: 0.6 }, "-=0.4")
        .from(ctaRef.current?.children || [], { y: 10, opacity: 0, stagger: 0.12, duration: 0.5 }, "-=0.3");
    });
    return () => ctx.revert();
  }, []);


  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-blue-50 to-blue-100">
      {/* Background gradient + grid */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(1200px 600px at 80% -10%, rgba(59,130,246,0.15), transparent 60%), radial-gradient(1000px 500px at -10% 20%, rgba(147,197,253,0.1), transparent 60%)",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 70%)",
        }}
      />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(to_right,rgba(59,130,246,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />


      {/* Hero */}
      <section ref={heroRef} className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 sm:pt-32 sm:pb-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 ref={titleRef} className="text-5xl sm:text-7xl font-bold tracking-tight leading-[0.95] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                Your AI Health 
                <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent"> Companion</span>
              </h1>
              <p ref={subtitleRef} className="text-lg sm:text-xl text-gray-600 max-w-2xl leading-relaxed font-light">
                Transform complex medical reports into clear insights. Get instant answers to health questions with personalized recommendations — all powered by advanced AI in a secure, professional environment.
              </p>
            </div>
            <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 items-start">
              {/* Primary CTA */}
              <Link href="/patient">
                <Button className="group relative bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold px-8 py-4 rounded-2xl shadow-[0_8px_32px_rgba(59,130,246,0.35)] hover:shadow-[0_12px_48px_rgba(59,130,246,0.45)] transition-all duration-300 border-0 text-lg">
                  <span className="relative z-10">🚀 Transform My Health Report</span>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/20 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
              </Link>
              
              {/* Patient Portal Button */}
              <Link href="/patient">
                <Button className="bg-gradient-to-r from-purple-100 to-blue-100 hover:from-purple-200 hover:to-blue-200 text-purple-700 border border-purple-300 hover:border-purple-400 backdrop-blur-xl rounded-xl px-6 py-3 transition-all duration-300 font-medium flex items-center gap-2">
                  <span>📋 Patient Portal</span>
                </Button>
              </Link>
            </div>
            
            {/* Trust indicators */}
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                HIPAA Compliant
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                AI Powered
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                Secure & Private
              </div>
            </div>

          </div>
          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-3xl bg-gradient-to-br from-blue-500/15 via-blue-400/10 to-blue-300/5 blur-3xl animate-pulse" />
            <div className="absolute -inset-2 -z-5 rounded-3xl bg-gradient-to-br from-white to-blue-50/50 blur-xl" />
            <Card className="relative rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-2xl shadow-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  <img
                    src="/medical-interface.jpg"
                    alt="Advanced medical technology interface"
                    className="h-[400px] w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="bg-white/90 backdrop-blur-xl rounded-xl p-4 border border-blue-200 shadow-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-800 font-medium">AI Analysis Complete</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
            Powered by Advanced AI Technology
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Professional-grade healthcare intelligence designed for patients seeking clear health insights.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard 
            title="Smart Report Analysis" 
            desc="Transform complex medical documents into clear, actionable insights with our advanced AI processing."
            icon="📊"
          />
          <FeatureCard 
            title="Health Insights" 
            desc="Personalized health analysis with key metrics tracking and trend identification for better health understanding."
            icon="🔍"
          />
          <FeatureCard 
            title="Intelligent Assistant" 
            desc="24/7 medical query support with voice interaction and evidence-based health guidance."
            icon="🤖"
          />
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="mx-auto max-w-7xl px-6 pb-32">
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-blue-400/15 to-blue-300/10 blur-3xl rounded-3xl" />
          <div className="relative rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-2xl p-12 text-center shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
              Ready to Transform Your Healthcare Experience?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of patients who trust HealthMate for intelligent medical analysis.
            </p>
            <div className="flex justify-center">
              <Link href="/patient">
                <Button className="group relative bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold px-8 py-4 rounded-2xl shadow-[0_8px_32px_rgba(59,130,246,0.35)] hover:shadow-[0_12px_48px_rgba(59,130,246,0.45)] transition-all duration-300 border-0 text-lg">
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/20 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
              </Link>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-blue-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">99.9%</div>
                <div className="text-sm text-gray-500">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">500k+</div>
                <div className="text-sm text-gray-500">Reports Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">HIPAA</div>
                <div className="text-sm text-gray-500">Compliant</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Chatbot */}
      <Chatbot />
    </div>
  );
}

function FeatureCard({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <Card className="group border border-blue-200 bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-1">
      <CardContent className="p-8">
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-xl font-bold mb-3 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{desc}</p>
        <div className="mt-6 w-12 h-1 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </CardContent>
    </Card>
  );
}