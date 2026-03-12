"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { SessionSnapshot } from "@/lib/types";

interface AccuracyChartProps {
  sessions: SessionSnapshot[];
}

export function AccuracyChart({ sessions }: AccuracyChartProps) {
  if (sessions.length === 0) return null;

  const data = [...sessions]
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .map((s, i) => ({
      index: i + 1,
      accuracy: Math.round(s.accuracy * 100),
      correct: s.correctCount,
      total: s.exerciseCount,
      label: `Session ${i + 1}`,
    }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272f" />
        <XAxis
          dataKey="label"
          tick={{ fill: "#5c5c6e", fontSize: 10 }}
          axisLine={{ stroke: "#27272f" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "#5c5c6e", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181c",
            border: "1px solid #27272f",
            borderRadius: 8,
            fontSize: 12,
            color: "#f0f0f2",
          }}
          formatter={(value) => [`${value}%`, "Accuracy"]}
        />
        <Area
          type="monotone"
          dataKey="accuracy"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#accGrad)"
          dot={{ fill: "#6366f1", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
