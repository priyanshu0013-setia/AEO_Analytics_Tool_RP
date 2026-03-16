import { useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { useGetCampaign } from "@workspace/api-client-react";
import { useCampaignStream } from "@/hooks/use-sse-run";
import { PageHeader, Card, Button, Spinner } from "@/components/ui-components";
import { motion } from "framer-motion";
import { Play, CheckCircle, AlertTriangle, Terminal, ChevronRight } from "lucide-react";

export function RunCampaign() {
  const [, params] = useRoute("/campaigns/:id/run");
  const id = Number(params?.id);
  
  const { data: campaign, isLoading: isLoadingCampaign } = useGetCampaign(id);
  const { logs, status, errorMsg, startRun } = useCampaignStream(id);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (isLoadingCampaign) return <Spinner />;
  if (!campaign) return <div>Campaign not found</div>;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-5xl mx-auto">
      <PageHeader 
        title={`Analysis Run: ${campaign.name}`} 
        description="Querying ChatGPT, Claude, and Gemini in parallel..."
      />

      <Card className="overflow-hidden bg-slate-950 border-slate-800 shadow-xl shadow-slate-900/50">
        <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between">
          <div className="flex items-center text-slate-400 font-mono text-sm">
            <Terminal className="w-4 h-4 mr-2" />
            aeo-runner.sh
          </div>
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
          </div>
        </div>
        
        <div 
          ref={logContainerRef}
          className="h-[500px] overflow-y-auto p-6 font-mono text-sm text-slate-300 leading-relaxed bg-[#0a0f1c]"
        >
          <div className="text-emerald-400 mb-4">$ initializing AEO engine...</div>
          <div className="text-slate-500 mb-4">Target: {campaign.targetUrl} | Competitors: {campaign.competitorUrls.length}</div>
          
          {(Array.isArray(logs) ? logs : []).map((log, i) => (
            <div key={i} className="mb-1 flex items-start">
              <span className="text-slate-600 mr-3 shrink-0">{`[${new Date().toISOString().split('T')[1].slice(0,8)}]`}</span>
              <span className={
                log.includes("[ERROR]") ? "text-red-400" :
                log.includes("Completed") ? "text-emerald-400" :
                log.includes("Generating") ? "text-indigo-400" :
                "text-slate-300"
              }>{log}</span>
            </div>
          ))}
          
          {status === "running" && (
            <div className="flex items-center mt-2 text-primary">
              <span className="mr-2">...</span>
              <div className="w-2 h-4 bg-primary animate-blink"></div>
            </div>
          )}
          
          {status === "done" && (
            <div className="mt-6 text-emerald-400 font-bold flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              PROCESS COMPLETED SUCCESSFULLY
            </div>
          )}
          
          {status === "error" && (
            <div className="mt-6 text-red-400 font-bold flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              PROCESS TERMINATED WITH ERRORS: {errorMsg}
            </div>
          )}
        </div>
      </Card>

      <div className="mt-8 flex justify-center">
        {status === "idle" ? (
          <Button onClick={startRun} size="lg" className="w-64 text-lg">
            <Play className="w-5 h-5 mr-2" />
            Start Execution
          </Button>
        ) : status === "running" ? (
          <Button size="lg" variant="secondary" className="w-64 text-lg" disabled>
            <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mr-3" />
            Running...
          </Button>
        ) : status === "done" ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link href={`/campaigns/${id}/report`}>
              <Button size="lg" variant="success" className="w-64 text-lg shadow-xl shadow-success/30">
                View Full Report
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="flex gap-4">
            <Button onClick={startRun} size="lg" variant="outline">
              Retry Execution
            </Button>
            <Link href={`/`}>
              <Button size="lg" variant="secondary">Back to List</Button>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
