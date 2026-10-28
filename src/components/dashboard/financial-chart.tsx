"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"

const chartData = [
  { month: "Jan", income: 18600, expense: 8000 },
  { month: "Feb", income: 30500, expense: 20000 },
  { month: "Mar", income: 23700, expense: 12000 },
  { month: "Apr", income: 7300, expense: 19000 },
  { month: "May", income: 20900, expense: 13000 },
  { month: "Jun", income: 21400, expense: 14000 },
]

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--chart-1))",
  },
  expense: {
    label: "Expense",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function FinancialChart() {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Financial Overview</CardTitle>
            <CardDescription>Monthly income vs expenses</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-[14px] text-black">Current Balance</p>
            <p className="text-lg font-bold text-accent">$45,230.00</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="income" fill="var(--color-income)" radius={4} />
            <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
