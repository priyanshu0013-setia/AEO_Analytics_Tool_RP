import { useListCampaigns, useDeleteCampaign } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Plus, PlayCircle, BarChart3, Trash2, Search, Target, LayoutDashboard } from "lucide-react";
import { Card, Button, Badge, PageHeader, Spinner, Input } from "@/components/ui-components";
import { motion } from "framer-motion";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function CampaignsList() {
  const { data: campaigns, isLoading, isError, error } = useListCampaigns();
  const { mutateAsync: deleteCampaign, isPending: isDeleting } = useDeleteCampaign();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    await deleteCampaign({ id });
    queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
  };

  if (isLoading) return <Spinner />;
  if (isError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-bold">Backend Connection Failed</p>
        <p className="text-slate-500 text-sm">{error?.message || "Check if api-server is running"}</p>
      </div>
    );
  }

  const filtered = (Array.isArray(campaigns) ? campaigns : []).filter(c => 
  c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
  c.targetUrl.toLowerCase().includes(searchTerm.toLowerCase())
);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader 
        title="Campaigns" 
        description="Monitor your Answer Engine Optimization (AEO) share of voice."
      >
        <Link href="/campaigns/new" className="inline-flex items-center justify-center h-11 px-6 text-base font-semibold rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ease-out">
          <Plus className="w-5 h-5 mr-2" />
          New Campaign
        </Link>
      </PageHeader>

      <div className="mb-8 flex items-center bg-white p-2 rounded-2xl shadow-sm border border-slate-200 max-w-md">
        <Search className="w-5 h-5 text-slate-400 ml-3 mr-2" />
        <input 
          type="text" 
          placeholder="Search campaigns..." 
          className="flex-1 bg-transparent outline-none py-2 text-slate-700 placeholder:text-slate-400"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed border-2 bg-slate-50/50">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <LayoutDashboard className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">No campaigns found</h3>
          <p className="text-slate-500 mt-2 max-w-sm">Create a new campaign to start analyzing your brand's presence across generative AI models.</p>
          <Link href="/campaigns/new" className="mt-6 inline-flex items-center justify-center h-11 px-6 text-base font-semibold rounded-xl bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-all duration-200">
            Create First Campaign
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((campaign, idx) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="flex flex-col h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 group">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <Badge 
                      variant={
                        campaign.status === "completed" ? "success" : 
                        campaign.status === "running" ? "warning" : "idle"
                      }
                    >
                      {campaign.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5" />}
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </Badge>
                    <button 
                      onClick={() => handleDelete(campaign.id)}
                      disabled={isDeleting}
                      className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{campaign.name}</h3>
                  <div className="flex items-center text-slate-500 text-sm mb-4">
                    <Target className="w-4 h-4 mr-1.5 text-primary" />
                    {campaign.targetUrl}
                  </div>
                  
                  <div className="space-y-2 mt-6">
                    <div className="flex justify-between text-sm text-slate-500 border-b border-slate-100 pb-2">
                      <span>Queries:</span>
                      <span className="font-medium text-slate-700">{campaign.seedQueries.length}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500 border-b border-slate-100 pb-2">
                      <span>Competitors:</span>
                      <span className="font-medium text-slate-700">{campaign.competitorUrls.length}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500 pb-2">
                      <span>Created:</span>
                      <span className="font-medium text-slate-700">{format(new Date(campaign.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto rounded-b-2xl flex gap-3">
                  {campaign.status === "idle" || campaign.status === "failed" ? (
                    <Link href={`/campaigns/${campaign.id}/run`} className="flex-1">
                      <Button variant="primary" className="w-full">
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Run Analysis
                      </Button>
                    </Link>
                  ) : campaign.status === "completed" ? (
                    <Link href={`/campaigns/${campaign.id}/report`} className="flex-1">
                      <Button variant="success" className="w-full">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        View Report
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/campaigns/${campaign.id}/run`} className="flex-1">
                      <Button variant="secondary" className="w-full text-amber-700 bg-amber-100 hover:bg-amber-200">
                        <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mr-2" />
                        Running...
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
