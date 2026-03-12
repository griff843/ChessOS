"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { MasteryState } from "@/lib/types";

const MASTERY_COLORS: Record<MasteryState, string> = {
  unseen: "#3f3f4a",
  learning: "#60a5fa",
  unstable: "#fbbf24",
  improving: "#6366f1",
  mastered: "#34d399",
};

interface MasteryChartProps {
  distribution: Record<MasteryState, number>;
}

export function MasteryChart({ distribution }: MasteryChartProps) {
  const data = (Object.entries(distribution) as [MasteryState, number][])
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  if (data.length === 0) return null;

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={65}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={MASTERY_COLORS[entry.name as MasteryState]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181c",
              border: "1px solid #27272f",
              borderRadius: 8,
              fontSize: 12,
              color: "#f0f0f2",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1.5">
        {(Object.entries(distribution) as [MasteryState, number][]).map(([state, count]) => (
          <div key={state} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: MASTERY_COLORS[state] }}
            />
            <span className="text-xs capitalize text-text-secondary">{state}</span>
            <span className="text-xs font-medium text-text-primary">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
