"use client";
import { useState } from "react";
import SchedulingTemplate from "@/components/SchedulingTemplate";
import { Input } from "@/components/ui/input";

interface Process {
  name: string;
  arrival: number;
  burst: number;
  group?: string; // Make optional to match SchedulingTemplate
}

interface GanttEntry {
  name: string;
  start: number;
  end: number;
}

interface SchedulingResult {
  results: (Process & { finish: number; tat: number; wt: number })[];
  avgTAT: string;
  avgWT: string;
  gantt: GanttEntry[];
}

function calculateFairShare(processes: Process[]): SchedulingResult {
  let time = 0;
  let completed = 0;
  let n = processes.length;
  let rem = processes.map(p => p.burst);
  let isDone = Array(n).fill(false);
  let gantt: GanttEntry[] = [];
  let finish = Array(n).fill(0);
  let tat = Array(n).fill(0);
  let wt = Array(n).fill(0);
  let totalTAT = 0, totalWT = 0;
  
  // Group processes by group and track CPU usage per group
  const groupMap: { [group: string]: number[] } = {};
  const groupCpuUsage: { [group: string]: number } = {};
  
  processes.forEach((p, i) => {
    const group = p.group || "default";
    if (!groupMap[group]) {
      groupMap[group] = [];
      groupCpuUsage[group] = 0;
    }
    groupMap[group].push(i);
  });
  
  const groupNames = Object.keys(groupMap);
  const numGroups = groupNames.length;
  
  while (completed < n) {
    let selectedIdx = -1;
    let selectedGroup = "";
    let minCpuUsage = Infinity;
    
    // Find the group with minimum CPU usage that has available processes
    for (const group of groupNames) {
      const indices = groupMap[group];
      let hasAvailable = false;
      
      for (const idx of indices) {
        if (!isDone[idx] && processes[idx].arrival <= time && rem[idx] > 0) {
          hasAvailable = true;
          break;
        }
      }
      
      if (hasAvailable && groupCpuUsage[group] < minCpuUsage) {
        minCpuUsage = groupCpuUsage[group];
        selectedGroup = group;
      }
    }
    
    if (selectedGroup === "") {
      time++;
      continue;
    }
    
    // Within the selected group, pick the first available process (FCFS within group)
    const indices = groupMap[selectedGroup];
    for (const idx of indices) {
      if (!isDone[idx] && processes[idx].arrival <= time && rem[idx] > 0) {
        selectedIdx = idx;
        break;
      }
    }
    
    if (selectedIdx === -1) {
      time++;
      continue;
    }
    
    // Execute one time unit
    gantt.push({ name: processes[selectedIdx].name, start: time, end: time + 1 });
    rem[selectedIdx]--;
    time++;
    groupCpuUsage[selectedGroup]++;
    
    if (rem[selectedIdx] === 0) {
      isDone[selectedIdx] = true;
      completed++;
      finish[selectedIdx] = time;
      tat[selectedIdx] = finish[selectedIdx] - processes[selectedIdx].arrival;
      wt[selectedIdx] = tat[selectedIdx] - processes[selectedIdx].burst;
      totalTAT += tat[selectedIdx];
      totalWT += wt[selectedIdx];
    }
  }
  
  return {
    results: processes.map((p, i) => ({ ...p, finish: finish[i], tat: tat[i], wt: wt[i] })),
    avgTAT: (totalTAT / n).toFixed(2),
    avgWT: (totalWT / n).toFixed(2),
    gantt,
  };
}

export default function FairSharePage() {
  const defaultProcesses = [
    { name: "P1", arrival: 0, burst: 4, group: "A" },
    { name: "P2", arrival: 1, burst: 3, group: "B" },
    { name: "P3", arrival: 2, burst: 2, group: "A" },
    { name: "P4", arrival: 3, burst: 5, group: "B" },
  ];

  const [processes, setProcesses] = useState<Process[]>(defaultProcesses);
  const [group, setGroup] = useState("");

  const colorScheme = {
    primary: "text-lime-700",
    secondary: "bg-lime-100 text-lime-700",
    accent: "from-lime-400 to-lime-600",
    bg: "from-lime-100 via-green-50 to-yellow-100"
  };

  const additionalFields = (
    <Input
      placeholder="Group"
      value={group}
      onChange={e => setGroup(e.target.value)}
      className="sm:w-24"
      required
    />
  );

  // Custom setProcesses to include group
  const setProcessesWithGroup = (newProcesses: Process[]) => {
    setProcesses(newProcesses);
    setGroup("");
  };

  return (
    <SchedulingTemplate
      title="Fair Share Scheduling"
      description="Fair Share Scheduling divides CPU time among groups, then among processes within each group. Groups are scheduled round-robin, then processes within group."
      algorithm="fair-share"
      colorScheme={colorScheme}
      processes={processes}
      setProcesses={setProcessesWithGroup}
      calculateScheduling={calculateFairShare}
      additionalFields={additionalFields}
      defaultProcesses={defaultProcesses}
    />
  );
} 