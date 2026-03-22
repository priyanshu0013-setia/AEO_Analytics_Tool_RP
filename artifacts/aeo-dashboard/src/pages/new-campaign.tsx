import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useCreateCampaign, useGenerateRelatedQueries } from "@workspace/api-client-react";
import { Card, Button, Input, PageHeader } from "@/components/ui-components";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Globe, Save, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function NewCampaign() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { mutateAsync: createCampaign, isPending } = useCreateCampaign();
  const { mutateAsync: generateRelated, isPending: isGenerating } = useGenerateRelatedQueries();

  const [name, setName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([""]);
  const [queries, setQueries] = useState<string[]>([""]);
  const [error, setError] = useState("");
  const [relatedResults, setRelatedResults] = useState<Record<number, { domain: string; queries: string[]; expanded: boolean }>>({});

  const updateArray = (setter: any, index: number, value: string) => {
    setter((prev: string[]) => {
      const nw = [...prev];
      nw[index] = value;
      return nw;
    });
  };

  const removeFromArray = (setter: any, index: number) => {
    setter((prev: string[]) => prev.filter((_, i) => i !== index));
  };

  const addToArray = (setter: any) => {
    setter((prev: string[]) => [...prev, ""]);
  };

  const handleGenerateRelated = async (idx: number) => {
    const seed = queries[idx]?.trim();
    if (!seed) return;
    try {
      const result = await generateRelated({ data: { seedQuery: seed } });
      setRelatedResults((prev) => ({
        ...prev,
        [idx]: { domain: result.domain, queries: result.related_queries, expanded: true },
      }));
    } catch (err: any) {
      setError(err.message || "Failed to generate related queries");
    }
  };

  const addRelatedQuery = (query: string) => {
    setQueries((prev) => {
      const existing = prev.map((q: string) => q.trim().toLowerCase());
      if (existing.includes(query.trim().toLowerCase())) return prev;
      // Replace the last empty entry if one exists, otherwise append
      const lastEmptyIdx = [...prev].reverse().findIndex((q: string) => !q.trim());
      if (lastEmptyIdx !== -1) {
        const realIdx = prev.length - 1 - lastEmptyIdx;
        const nw = [...prev];
        nw[realIdx] = query;
        return nw;
      }
      return [...prev, query];
    });
  };

  const toggleRelatedExpanded = (idx: number) => {
    setRelatedResults((prev) => ({
      ...prev,
      [idx]: { ...prev[idx], expanded: !prev[idx]?.expanded },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validCompetitors = competitors.filter(c => c.trim());
    const validQueries = queries.filter(q => q.trim());

    if (!name || !targetUrl || validQueries.length === 0) {
      setError("Please fill in Name, Target URL, and at least one Query.");
      return;
    }

    try {
      await createCampaign({
        data: {
          name,
          targetUrl,
          competitorUrls: validCompetitors,
          seedQueries: validQueries
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Failed to create campaign");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader 
        title="Create Campaign" 
        description="Set up your brand and competitors to analyze share of voice."
      />

      <form onSubmit={handleSubmit} className="max-w-4xl">
        {error && (
          <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Brand Setup */}
          <div className="space-y-8">
            <Card className="p-6">
              <h3 className="text-xl font-display font-bold text-slate-900 mb-6 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-primary" />
                Target Brand
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Campaign Name</label>
                  <Input 
                    placeholder="e.g. Q3 Software Analytics" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target Brand URL</label>
                  <Input 
                    placeholder="e.g. yourcompany.com" 
                    value={targetUrl} 
                    onChange={e => setTargetUrl(e.target.value)} 
                    required
                  />
                  <p className="text-xs text-slate-500 mt-2">The main domain we will track in AI responses.</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-display font-bold text-slate-900">Competitors</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => addToArray(setCompetitors)}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              
              <div className="space-y-3">
                <AnimatePresence>
                  {competitors.map((comp, idx) => (
                    <motion.div 
                      key={`comp-${idx}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex gap-2"
                    >
                      <Input 
                        placeholder="e.g. competitor.com" 
                        value={comp} 
                        onChange={e => updateArray(setCompetitors, idx, e.target.value)} 
                      />
                      {competitors.length > 1 && (
                        <Button type="button" variant="ghost" onClick={() => removeFromArray(setCompetitors, idx)} className="px-3 text-slate-400 hover:text-red-500">
                          <X className="w-5 h-5" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </Card>
          </div>

          {/* Right Column: Queries */}
          <div className="space-y-8">
            <Card className="p-6 h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-display font-bold text-slate-900">Seed Queries</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => addToArray(setQueries)}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              <p className="text-sm text-slate-500 mb-4 -mt-2">
                Enter base questions. The system will use AI to expand these into multiple variations. Use the <span className="font-semibold text-slate-700">✦ Generate Related</span> button to discover additional queries via intent modeling.
              </p>
              
              <div className="space-y-4 flex-1">
                <AnimatePresence>
                  {queries.map((query, idx) => (
                    <motion.div 
                      key={`query-${idx}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <div className="flex gap-2">
                        <Input 
                          placeholder="e.g. What is the best platform for CRM?" 
                          value={query} 
                          onChange={e => updateArray(setQueries, idx, e.target.value)} 
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateRelated(idx)}
                          disabled={!query.trim() || isGenerating}
                          title="Generate related queries using AI intent modeling"
                          className="shrink-0 px-2 text-primary border-primary/30 hover:bg-primary/5"
                        >
                          <Sparkles className="w-4 h-4" />
                        </Button>
                        {queries.length > 1 && (
                          <Button type="button" variant="ghost" onClick={() => removeFromArray(setQueries, idx)} className="px-3 text-slate-400 hover:text-red-500 shrink-0">
                            <X className="w-5 h-5" />
                          </Button>
                        )}
                      </div>

                      {/* Related queries panel */}
                      {relatedResults[idx] && (
                        <div className="ml-1 border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleRelatedExpanded(idx)}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-primary" />
                              Related queries — domain: <em>{relatedResults[idx].domain}</em>
                              <span className="ml-1 text-slate-400">({relatedResults[idx].queries.length})</span>
                            </span>
                            {relatedResults[idx].expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          <AnimatePresence>
                            {relatedResults[idx].expanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-3 pb-3 max-h-60 overflow-y-auto"
                              >
                                <div className="space-y-1 pt-1">
                                  {relatedResults[idx].queries.map((q, qi) => (
                                    <div key={qi} className="flex items-start gap-2 group">
                                      <span className="flex-1 text-xs text-slate-700 py-1 leading-snug">{q}</span>
                                      <button
                                        type="button"
                                        onClick={() => addRelatedQuery(q)}
                                        className="opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 text-xs text-primary font-medium hover:underline transition-opacity"
                                        title="Add as seed query"
                                      >
                                        + Add
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-4">
          <Link href="/">
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
          <Button type="submit" variant="primary" isLoading={isPending} className="min-w-[200px]">
            <Save className="w-5 h-5 mr-2" />
            Create Campaign
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
