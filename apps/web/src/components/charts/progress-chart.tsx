"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SessionSnapshot } from "@/lib/types";

interface ProgressChartProps {
  sessions: SessionSnapshot[];
}

export function ProgressChart({ sessions }: ProgressChartProps) {
  if (sessions.length === 0) return null;

  const data = [...sessions]
    .sort(
      (a, b) =>
        new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    )
    .map((session, index) => ({
      label: `Session ${index + 1}`,
      accuracy: Math.round(session.accuracy * 100),
      correct: session.correctCount,
      total: session.exerciseCount,
    }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
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
          tickFormatter={(value) => `${value}%`}
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
          stroke="#0f766e"
          strokeWidth={2}
          fill="url(#progressGrad)"
          dot={{ fill: "#0f766e", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

