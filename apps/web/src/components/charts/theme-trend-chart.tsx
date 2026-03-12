"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCategory } from "@/lib/utils";
import type { ThemeAccuracyPoint } from "@/lib/progress-engine";

interface ThemeTrendChartProps {
  themes: string[];
  points: ThemeAccuracyPoint[];
}

const COLORS = ["#2563eb", "#f59e0b", "#10b981", "#ef4444"];

export function ThemeTrendChart({ themes, points }: ThemeTrendChartProps) {
  if (themes.length === 0 || points.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
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
          formatter={(value, name) => [`${value}%`, formatCategory(String(name))]}
        />
        <Legend formatter={(value) => formatCategory(String(value))} />
        {themes.map((theme, index) => (
          <Line
            key={theme}
            type="monotone"
            dataKey={theme}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            connectNulls
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

