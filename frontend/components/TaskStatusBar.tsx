"use client";
import { useEffect, useState, useRef } from "react";
import { apiClient } from "@/lib/api";

interface Task {
  worker: string;
  task_id: string;
  name: string;
  args: any[];
  time_start: number | null;
}

interface TasksResp {
  active: Task[];
  reserved: Task[];
  scheduled: Task[];
  worker_count: number;
}

export function TaskStatusBar() {
  const [data, setData] = useState<TasksResp | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const pollRef = useRef<any>(null);

  useEffect(() => {
    const poll = () => apiClient.get("/api/admin/tasks/active").then(r => setData(r.data)).catch(() => {});
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const revoke = async (task_id: string) => {
    if (!window.confirm(`Stop task ${task_id.slice(0, 8)}?`)) return;
    setRevoking(task_id);
    try {
      await apiClient.post(`/api/admin/tasks/${task_id}/revoke?terminate=true`);
      setTimeout(() => apiClient.get("/api/admin/tasks/active").then(r => setData(r.data)), 1000);
    } finally { setRevoking(null); }
  };

  const purgeAll = async () => {
    if (!window.confirm("Purge ALL pending tasks from queue? (Running tasks keep running)")) return;
    await apiClient.post("/api/admin/tasks/purge");
    apiClient.get("/api/admin/tasks/active").then(r => setData(r.data));
  };

  if (!data) return null;
  const total = data.active.length + data.reserved.length;
  const hasActivity = total > 0;

  return (
    <div className={`sticky top-0 z-40 ${hasActivity ? "bg-primary-container/95 text-on-primary-container" : "bg-surface-container"} border-b border-outline-variant/30 backdrop-blur`}>
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${hasActivity ? "bg-primary animate-pulse" : "bg-outline"}`}></span>
            <span className="font-semibold">
              {hasActivity ? `${data.active.length} running, ${data.reserved.length} queued` : "All idle"}
            </span>
            <span className="text-on-surface-variant text-xs">({data.worker_count} worker{data.worker_count === 1 ? "" : "s"})</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs font-semibold underline">
              {expanded ? "Hide" : "Show"} details
            </button>
          )}
          {data.reserved.length > 0 && (
            <button onClick={purgeAll} className="text-xs font-semibold bg-error/10 text-error px-2 py-1 rounded">
              Purge queue
            </button>
          )}
        </div>
      </div>
      {expanded && total > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-3 border-t border-outline-variant/20">
          {[...data.active, ...data.reserved].map((t) => (
            <div key={t.task_id} className="flex items-center justify-between py-1 text-xs font-mono">
              <div className="flex gap-3 flex-1 min-w-0">
                <span className="text-primary font-semibold">{data.active.includes(t) ? "RUN" : "QUE"}</span>
                <span className="text-on-surface truncate">{t.name.split(".").slice(-1)[0]}</span>
                <span className="text-on-surface-variant truncate">{JSON.stringify(t.args).slice(0, 60)}</span>
              </div>
              <button
                disabled={revoking === t.task_id}
                onClick={() => revoke(t.task_id)}
                className="ml-4 text-error hover:underline disabled:opacity-50">
                {revoking === t.task_id ? "stopping..." : "stop"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
