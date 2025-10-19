import type { Metadata } from "next";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
import Chatbot from "@/components/Chatbot";
import Link from "next/link";

export const metadata: Metadata = {
  title: "HealthMate — Your AI Health Companion",
  description: "HealthMate: Modern healthcare platform with AI summaries and voice-enabled assistant for patients.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorReporter />
        <Script
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
          strategy="afterInteractive"
          data-target-origin="*"
          data-message-type="ROUTE_CHANGE"
          data-include-search-params="true"
          data-only-in-iframe="true"
          data-debug="true"
          data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
        />
        {/* Global Navigation */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-gradient-to-r from-white/95 via-blue-50/90 to-white/95 border-b border-blue-200/50 shadow-sm h-[5.5rem]">
          <div className="mx-auto max-w-7xl px-6 py-1 flex items-center justify-between h-full">
            <Link href="/" className="flex items-center h-full group">
              <img 
                src="/healthmate-new-logo.png" 
                alt="HealthMate Logo" 
                className="h-full w-auto object-contain filter drop-shadow-sm group-hover:scale-105 transition-all duration-300"
              />
            </Link>
            <nav className="hidden md:flex items-center gap-2">
              <Link href="/#features" className="relative px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-all duration-300 rounded-lg hover:bg-blue-50 group">
                <span className="relative z-10">✨ Features</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 rounded-lg transition-all duration-300"></div>
              </Link>
              <Link href="/patient" className="relative px-4 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 transition-all duration-300 rounded-lg hover:bg-purple-50 group">
                <span className="relative z-10">🏥 Patient Portal</span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 rounded-lg transition-all duration-300"></div>
              </Link>
              <Link href="/patient" className="relative ml-2 px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-400 hover:via-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_30px_rgba(59,130,246,0.4)] transition-all duration-300 border-0 group overflow-hidden">
                <span className="relative z-10 flex items-center gap-2">
                  🚀 <span>Get Started</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-600 rounded-xl opacity-20 blur-sm group-hover:opacity-40 transition-all duration-300 -z-10"></div>
              </Link>
              <Link href="/signin" className="relative ml-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-all duration-300 rounded-lg hover:bg-blue-50 group">
                <span className="relative z-10">Sign in</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 rounded-lg transition-all duration-300"></div>
              </Link>
            </nav>
          </div>
        </header>
        
        {children}
        <VisualEditsMessenger />
        {/* Global floating chatbot visible on all pages */}
        <Chatbot />
      </body>
    </html>
  );
}