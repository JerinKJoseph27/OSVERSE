"use client";
import { useState } from "react";
import SchedulingTemplate from "@/components/SchedulingTemplate";
import { Input } from "@/components/ui/input";

interface Process {
  name: string;
  arrival: number;
  burst: number;
  deadline?: number; // Make it optional to match SchedulingTemplate
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

function calculateEDF(processes: Process[]): SchedulingResult {
  // EDF is PREEMPTIVE - at each time unit, execute the process with earliest deadline
  let n = processes.length;
  let time = 0, completed = 0;
  let rem = processes.map(p => p.burst);
  let isDone = Array(n).fill(false);
  let finish = Array(n).fill(0);
  let tat = Array(n).fill(0);
  let wt = Array(n).fill(0);
  let gantt: GanttEntry[] = [];
  let last = -1;
  let totalTAT = 0, totalWT = 0;
  
  while (completed < n) {
    let idx = -1;
    let minDeadline = Infinity;
    
    // Find process with earliest deadline among arrived, unfinished processes
    for (let i = 0; i < n; i++) {
      if (!isDone[i] && processes[i].arrival <= time && 
          processes[i].deadline !== undefined && 
          rem[i] > 0 &&
          processes[i].deadline! < minDeadline) {
        minDeadline = processes[i].deadline!;
        idx = i;
      }
    }
    
    if (idx === -1) {
      time++;
      continue;
    }
    
    // If we switch to a different process, start a new gantt entry
    if (last !== idx) {
      gantt.push({ name: processes[idx].name, start: time, end: time + 1 });
    }
    
    // Execute for 1 time unit
    rem[idx]--;
    time++;
    
    if (rem[idx] === 0) {
      // Process completed
      isDone[idx] = true;
      completed++;
      finish[idx] = time;
      tat[idx] = finish[idx] - processes[idx].arrival;
      wt[idx] = tat[idx] - processes[idx].burst;
      totalTAT += tat[idx];
      totalWT += wt[idx];
    }
    
    // Update the end time of current gantt entry
    if (gantt.length > 0) {
      gantt[gantt.length - 1].end = time;
    }
    
    last = idx;
  }
  
  return {
    results: processes.map((p, i) => ({ ...p, finish: finish[i], tat: tat[i], wt: wt[i] })),
    avgTAT: (totalTAT / n).toFixed(2),
    avgWT: (totalWT / n).toFixed(2),
    gantt,
  };
}

export default function EDFPage() {
  const defaultProcesses = [
    { name: "P1", arrival: 0, burst: 4, deadline: 10 },
    { name: "P2", arrival: 1, burst: 3, deadline: 8 },
    { name: "P3", arrival: 2, burst: 2, deadline: 5 },
    { name: "P4", arrival: 3, burst: 1, deadline: 7 },
  ];

  const [processes, setProcesses] = useState<Process[]>(defaultProcesses);
  const [deadline, setDeadline] = useState("");

  const colorScheme = {
    primary: "text-rose-700",
    secondary: "bg-rose-100 text-rose-700",
    accent: "from-rose-400 to-rose-600",
    bg: "from-rose-100 via-pink-50 to-red-100"
  };

  const additionalFields = (
    <Input
      placeholder="Deadline"
      type="number"
      value={deadline}
      onChange={e => setDeadline(e.target.value)}
      className="sm:w-24"
      required
    />
  );

  // Custom setProcesses to include deadline
  const setProcessesWithDeadline = (newProcesses: Process[]) => {
    setProcesses(newProcesses);
    setDeadline("");
  };

  return (
    <SchedulingTemplate
      title="Earliest Deadline First (EDF) Scheduling"
      description="EDF is a preemptive scheduling algorithm that always executes the process with the earliest deadline. At every time unit, if a process with an earlier deadline arrives, it preempts the current process. Used in real-time systems to meet deadlines."
      algorithm="EDF"
      colorScheme={colorScheme}
      processes={processes}
      setProcesses={setProcessesWithDeadline}
      calculateScheduling={calculateEDF}
      additionalFields={additionalFields}
      defaultProcesses={defaultProcesses}
    />
  );
} 