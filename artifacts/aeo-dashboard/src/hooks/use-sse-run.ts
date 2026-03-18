import { useState, useCallback } from "react";

export type RunStatus = "idle" | "running" | "done" | "error";

export function useCampaignStream(campaignId: number) {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startRun = useCallback(async () => {
    if (!campaignId) return;
    setStatus("running");
    setLogs([]);
    setErrorMsg(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to start run: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("ReadableStream not supported in this browser.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      let hadError = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        
        // Keep the last chunk in buffer if it doesn't end with \n\n
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === "progress" && data.message) {
                setLogs((prev) => [...prev, data.message]);
              } else if (data.type === "error") {
                hadError = true;
                setStatus("error");
                setErrorMsg(data.message || "Unknown error occurred.");
                setLogs((prev) => [...prev, `[ERROR] ${data.message}`]);
              } else if (data.type === "done") {
                setStatus("done");
              }
            } catch (e) {
              console.warn("Failed to parse SSE line:", line);
            }
          }
        }
      }

      if (!hadError) {
        setStatus("done");
      }
    } catch (err: any) {
      console.error("Stream error:", err);
      setStatus("error");
      setErrorMsg(err.message || "Failed to connect to stream.");
    }
  }, [campaignId]);

  return { logs, status, errorMsg, startRun };
}
