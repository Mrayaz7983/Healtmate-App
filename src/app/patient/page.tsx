"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Types
interface ReportItem {
  id: string;
  title: string;
  type: string;
  date: string; // ISO date
  fileName?: string;
  content: string; // extracted or pasted text
  aiSummary?: string;
}

interface VitalsItem {
  id: string;
  date: string; // ISO
  bpSystolic?: number;
  bpDiastolic?: number;
  sugar?: number; // mg/dL
  weight?: number; // kg
  notes?: string;
}

const LS_REPORTS = "hm_reports";
const LS_VITALS = "hm_vitals";

export default function PatientPortal() {
  // Auth guard (client-side)
  const [authChecked, setAuthChecked] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth", { method: "GET" });
        if (!active) return;
        if (res.ok) setAuthChecked(true);
        else {
          setRedirecting(true);
          window.location.href = "/signin";
        }
      } catch {
        if (!active) return;
        setRedirecting(true);
        window.location.href = "/signin";
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Local storage state
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [vitals, setVitals] = useState<VitalsItem[]>([]);

  useEffect(() => {
    try {
      const r = localStorage.getItem(LS_REPORTS);
      const v = localStorage.getItem(LS_VITALS);
      if (r) setReports(JSON.parse(r));
      if (v) setVitals(JSON.parse(v));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(LS_REPORTS, JSON.stringify(reports));
    } catch {}
  }, [reports]);
  useEffect(() => {
    try {
      localStorage.setItem(LS_VITALS, JSON.stringify(vitals));
    } catch {}
  }, [vitals]);

  // UI navigation
  type TabKey = "dashboard" | "upload" | "vitals" | "timeline";
  const [tab, setTab] = useState<TabKey>("dashboard");

  // Upload form state
  const [uploadDate, setUploadDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [uploadType, setUploadType] = useState<string>("Blood Test");
  const [uploadTitle, setUploadTitle] = useState<string>("");
  const [uploadFileName, setUploadFileName] = useState<string>("");
  const [uploadContent, setUploadContent] = useState<string>("");
  const [parsing, setParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string>("");

  // Vitals form state
  const [vDate, setVDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [bpSys, setBpSys] = useState<string>("");
  const [bpDia, setBpDia] = useState<string>("");
  const [sugar, setSugar] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Report view modal
  const [activeReport, setActiveReport] = useState<ReportItem | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Derived data
  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => b.date.localeCompare(a.date)),
    [reports]
  );
  const latestVitals = useMemo(() => {
    if (vitals.length === 0) return undefined;
    return [...vitals].sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [vitals]);

  const timeline = useMemo(() => {
    const items: Array<{
      kind: "report" | "vitals";
      date: string;
      item: ReportItem | VitalsItem;
    }> = [];
    reports.forEach((r) => items.push({ kind: "report", date: r.date, item: r }));
    vitals.forEach((v) => items.push({ kind: "vitals", date: v.date, item: v }));
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [reports, vitals]);

  // Helpers
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  async function onFile(file?: File) {
    if (!file) return;
    setUploadFileName(file.name);
    setParseError("");

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      try {
        setParsing(true);
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/parse-pdf", { method: "POST", body: form });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(errText || `Server failed to parse PDF (${res.status})`);
        }
        const data = await res.json();
        const text = (data?.text || "").toString();
        if (!text.trim()) throw new Error("No text could be extracted from this PDF.");
        setUploadContent(text);
      } catch (e: any) {
        setParseError(e?.message || "Failed to read PDF.");
      } finally {
        setParsing(false);
      }
      return;
    }

    try {
      const text = await file.text();
      setUploadContent(text);
    } catch (e) {
      setParseError("Failed to read file.");
    }
  }

  function saveReport() {
    const title = uploadTitle.trim() || uploadFileName || `${uploadType} Report`;
    if (!uploadContent.trim()) return;
    const item: ReportItem = {
      id: uid(),
      title,
      type: uploadType,
      date: uploadDate,
      fileName: uploadFileName,
      content: uploadContent,
    };
    setReports((prev) => [item, ...prev]);
    // reset
    setUploadTitle("");
    setUploadFileName("");
    setUploadContent("");
    setUploadType("Blood Test");
  }

  function saveVitals() {
    if (!vDate) return;
    const item: VitalsItem = {
      id: uid(),
      date: vDate,
      bpSystolic: bpSys ? Number(bpSys) : undefined,
      bpDiastolic: bpDia ? Number(bpDia) : undefined,
      sugar: sugar ? Number(sugar) : undefined,
      weight: weight ? Number(weight) : undefined,
      notes: notes?.trim() || undefined,
    };
    setVitals((prev) => [item, ...prev]);
    setBpSys("");
    setBpDia("");
    setSugar("");
    setWeight("");
    setNotes("");
  }

  async function generateSummary(r: ReportItem) {
    setAiError("");
    setAiLoading(true);
    try {
      // Prefer a lightweight summary endpoint if available, else fallback to analyze-report/generate-report
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: r.content }),
      });
      if (!res.ok) throw new Error(`AI summary failed (${res.status})`);
      const data = await res.json();
      const summary: string = data?.summary || data?.result || data?.text || "Summary generated.";
      setReports((prev) => prev.map((item) => (item.id === r.id ? { ...item, aiSummary: summary } : item)));
      setActiveReport((prev) => (prev && prev.id === r.id ? { ...prev, aiSummary: summary } : prev));
    } catch (e: any) {
      setAiError(e?.message || "Failed to generate summary.");
    } finally {
      setAiLoading(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signout" }),
      });
    } catch {
      // ignore
    } finally {
      window.location.href = "/";
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-white via-blue-50 to-blue-100">
        <div className="text-gray-700">Checking session…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100">
      {/* Header */}
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">Patient Portal</h1>
            <p className="text-gray-600 mt-2">Manage your medical reports, vitals, and track your health timeline with AI assistance.</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button onClick={() => setTab("dashboard")} variant={tab === "dashboard" ? undefined : "outline"}>Dashboard</Button>
            <Button onClick={() => setTab("upload")} variant={tab === "upload" ? undefined : "outline"}>Upload Report</Button>
            <Button onClick={() => setTab("vitals")} variant={tab === "vitals" ? undefined : "outline"}>Add Vitals</Button>
            <Button onClick={() => setTab("timeline")} variant={tab === "timeline" ? undefined : "outline"}>Timeline</Button>
            <Button onClick={logout} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">Logout</Button>
          </div>
        </div>

        <div className="mt-8">
          <AnimatePresence mode="wait">
            {tab === "dashboard" && (
              <motion.div key="dash" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Stats */}
                  <Card className="border border-blue-200 bg-gradient-to-br from-white to-blue-50/50 shadow-2xl">
                    <CardHeader className="pb-3"><CardTitle className="text-blue-700">Reports</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-gray-900">{reports.length}</div>
                      <div className="text-gray-500 text-sm mt-1">Total uploaded</div>
                    </CardContent>
                  </Card>
                  <Card className="border border-purple-200 bg-gradient-to-br from-white to-purple-50/50 shadow-2xl">
                    <CardHeader className="pb-3"><CardTitle className="text-purple-700">Latest Vitals</CardTitle></CardHeader>
                    <CardContent>
                      {latestVitals ? (
                        <div className="text-sm text-gray-700 space-y-1">
                          <div>Date: <span className="font-medium">{latestVitals.date}</span></div>
                          <div>BP: <span className="font-medium">{latestVitals.bpSystolic ?? "-"}/{latestVitals.bpDiastolic ?? "-"}</span></div>
                          <div>Sugar: <span className="font-medium">{latestVitals.sugar ?? "-"} mg/dL</span></div>
                          <div>Weight: <span className="font-medium">{latestVitals.weight ?? "-"} kg</span></div>
                        </div>
                      ) : (
                        <div className="text-gray-500">No vitals yet</div>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/50 shadow-2xl">
                    <CardHeader className="pb-3"><CardTitle className="text-emerald-700">AI Summaries</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-gray-900">{reports.filter(r => r.aiSummary).length}</div>
                      <div className="text-gray-500 text-sm mt-1">Summarized reports</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent reports */}
                <div className="mt-8">
                  <h2 className="text-xl font-bold text-gray-800 mb-3">Recent Reports</h2>
                  {sortedReports.length === 0 ? (
                    <div className="text-gray-500">No reports yet. Upload your first report.</div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {sortedReports.slice(0, 6).map((r) => (
                        <motion.div key={r.id} whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                          <Card className="border border-gray-200 bg-white/90 backdrop-blur-xl shadow-xl hover:shadow-2xl">
                            <CardHeader className="pb-3">
                              <CardTitle className="flex items-center justify-between text-base">
                                <span className="truncate mr-2">{r.title}</span>
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">{r.type}</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-sm text-gray-600 mb-3">{r.date}</div>
                              <div className="line-clamp-3 text-gray-700 text-sm">{r.content}</div>
                              <div className="flex gap-2 mt-4">
                                <Button size="sm" onClick={() => setActiveReport(r)}>View</Button>
                                {!r.aiSummary && <Button size="sm" variant="outline" onClick={() => generateSummary(r)}>AI Summary</Button>}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {tab === "upload" && (
              <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <div className="grid md:grid-cols-2 gap-8">
                  <Card className="border border-blue-200 bg-gradient-to-br from-white to-blue-50/50 shadow-2xl">
                    <CardHeader className="pb-4"><CardTitle className="text-xl font-bold text-blue-700">Upload Report</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Date</label>
                          <Input type="date" value={uploadDate} onChange={(e) => setUploadDate(e.target.value)} className="bg-white border-blue-200" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Type</label>
                          <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="w-full h-10 px-3 rounded-md border border-blue-200 bg-white text-gray-900">
                            <option>Blood Test</option>
                            <option>Imaging</option>
                            <option>Prescription</option>
                            <option>Other</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Title</label>
                        <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="e.g., CBC Report" className="bg-white border-blue-200" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-2">File</label>
                        <Input type="file" accept=".pdf,.txt,.md,.json,.csv,.log" onChange={(e) => onFile(e.target.files?.[0])} className="bg-white border-blue-200 text-gray-900 file:bg-gradient-to-r file:from-blue-500 file:to-blue-600 file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4" />
                        {uploadFileName && <div className="text-xs text-gray-600 mt-1">Selected: {uploadFileName} {parsing ? "– parsing…" : ""}</div>}
                        {parseError && <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{parseError}</div>}
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Extracted / Pasted Content</label>
                        <Textarea value={uploadContent} onChange={(e) => setUploadContent(e.target.value)} placeholder="Paste or extract your report text here" className="min-h-[160px] bg-white border-blue-200" />
                      </div>
                      <div className="flex gap-3">
                        <Button onClick={saveReport} disabled={!uploadContent.trim() || parsing}>Save Report</Button>
                        <Button variant="outline" onClick={() => { setUploadTitle(""); setUploadFileName(""); setUploadContent(""); }}>Clear</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-purple-200 bg-gradient-to-br from-white to-purple-50/50 shadow-2xl">
                    <CardHeader className="pb-4"><CardTitle className="text-xl font-bold text-purple-700">Tips</CardTitle></CardHeader>
                    <CardContent className="text-sm text-gray-700 space-y-2">
                      <p>• Upload PDFs or paste the text directly for faster AI summarization.</p>
                      <p>• Add a descriptive title to quickly find reports later.</p>
                      <p>• Use the Timeline to track reports and vitals together.</p>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {tab === "vitals" && (
              <motion.div key="vitals" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <div className="grid lg:grid-cols-2 gap-8">
                  <Card className="border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/50 shadow-2xl">
                    <CardHeader className="pb-4"><CardTitle className="text-xl font-bold text-emerald-700">Add Manual Vitals</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Date</label>
                          <Input type="date" value={vDate} onChange={(e) => setVDate(e.target.value)} className="bg-white border-emerald-200" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Weight (kg)</label>
                          <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g., 70" className="bg-white border-emerald-200" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">BP Systolic</label>
                          <Input type="number" value={bpSys} onChange={(e) => setBpSys(e.target.value)} placeholder="e.g., 120" className="bg-white border-emerald-200" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">BP Diastolic</label>
                          <Input type="number" value={bpDia} onChange={(e) => setBpDia(e.target.value)} placeholder="e.g., 80" className="bg-white border-emerald-200" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Sugar (mg/dL)</label>
                        <Input type="number" value={sugar} onChange={(e) => setSugar(e.target.value)} placeholder="e.g., 98" className="bg-white border-emerald-200" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Notes</label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details" className="min-h-[100px] bg-white border-emerald-200" />
                      </div>
                      <div className="flex gap-3">
                        <Button onClick={saveVitals}>Save Vitals</Button>
                        <Button variant="outline" onClick={() => { setBpSys(""); setBpDia(""); setSugar(""); setWeight(""); setNotes(""); }}>Clear</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 shadow-2xl">
                    <CardHeader className="pb-4"><CardTitle className="text-xl font-bold text-gray-800">Recent Vitals</CardTitle></CardHeader>
                    <CardContent>
                      {vitals.length === 0 ? (
                        <div className="text-gray-500">No vitals recorded yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {vitals.slice(0, 8).map(v => (
                            <div key={v.id} className="p-3 rounded-lg border border-gray-200 bg-white flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-800">{v.date}</div>
                                <div className="text-xs text-gray-600">BP {v.bpSystolic ?? "-"}/{v.bpDiastolic ?? "-"} • Sugar {v.sugar ?? "-"} mg/dL • {v.weight ?? "-"} kg</div>
                              </div>
                              {v.notes && <div className="text-xs text-gray-500 line-clamp-1 max-w-[200px]">{v.notes}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {tab === "timeline" && (
              <motion.div key="timeline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <Card className="border border-blue-200 bg-gradient-to-br from-white to-blue-50/50 shadow-2xl">
                  <CardHeader className="pb-4"><CardTitle className="text-xl font-bold text-blue-700">Timeline</CardTitle></CardHeader>
                  <CardContent>
                    {timeline.length === 0 ? (
                      <div className="text-gray-500">No items on your timeline yet.</div>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 to-purple-200 rounded-full" />
                        <div className="space-y-6">
                          {timeline.map((t, idx) => (
                            <div key={idx} className="relative pl-12">
                              <div className="absolute left-2 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow ring-2 ring-blue-300 bg-white" />
                              <div className="p-4 rounded-xl border bg-white/90 backdrop-blur-xl shadow flex items-start justify-between gap-4">
                                <div>
                                  <div className="text-xs text-gray-500">{t.date}</div>
                                  {t.kind === "report" ? (
                                    <div className="mt-1">
                                      <div className="text-sm font-semibold text-gray-800">Report: {(t.item as ReportItem).title}</div>
                                      <div className="text-xs text-blue-700 inline-block mt-1 px-2 py-0.5 rounded-full bg-blue-100 border border-blue-200">{(t.item as ReportItem).type}</div>
                                    </div>
                                  ) : (
                                    <div className="mt-1">
                                      <div className="text-sm font-semibold text-gray-800">Vitals</div>
                                      <div className="text-xs text-gray-700 mt-1">BP {(t.item as VitalsItem).bpSystolic ?? "-"}/{(t.item as VitalsItem).bpDiastolic ?? "-"} • Sugar {(t.item as VitalsItem).sugar ?? "-"} mg/dL • {(t.item as VitalsItem).weight ?? "-"} kg</div>
                                    </div>
                                  )}
                                </div>
                                {t.kind === "report" && (
                                  <div>
                                    <Button size="sm" onClick={() => setActiveReport(t.item as ReportItem)}>View</Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {activeReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="w-full max-w-3xl">
              <Card className="border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 shadow-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500 text-white grid place-items-center">📄</div>
                      <div>
                        <div className="font-semibold text-gray-800">{activeReport.title}</div>
                        <div className="text-xs text-gray-500">{activeReport.date} • {activeReport.type}</div>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setActiveReport(null)}>Close</Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600">Report Preview</div>
                      <div className="p-3 rounded-lg border border-gray-200 bg-white max-h-72 overflow-auto text-sm text-gray-800 whitespace-pre-wrap">
                        {activeReport.content}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">AI Summary</div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => generateSummary(activeReport)} disabled={aiLoading}>{aiLoading ? "Summarizing…" : "Generate"}</Button>
                          {activeReport.aiSummary && <Button size="sm" onClick={() => navigator.clipboard.writeText(activeReport.aiSummary || "")}>Copy</Button>}
                        </div>
                      </div>
                      {aiError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{aiError}</div>}
                      <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/70 min-h-32 text-sm text-emerald-900 whitespace-pre-wrap">
                        {activeReport.aiSummary || "No summary yet. Click Generate to create one."}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
