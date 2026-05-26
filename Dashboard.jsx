import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { format, eachDayOfInterval, startOfWeek, eachMonthOfInterval, subYears, subDays } from "date-fns";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [range, setRange] = useState("week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const me = await base44.auth.me();
      const [allLogs, allMeasurements] = await Promise.all([
        base44.entities.FoodLog.filter({ created_by_id: me.id }, "-date", 500),
        base44.entities.BodyMeasurement.filter({ created_by_id: me.id }, "date", 100),
      ]);
      setUser(me);
      setLogs(allLogs);
      setMeasurements(allMeasurements);
      setLoading(false);
    }
    load();
  }, []);

  const chartData = useMemo(() => {
    const now = new Date();
    if (range === "week") {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start, end: now });
      return days.map((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        const dayLogs = logs.filter((l) => l.date === dateStr);
        return {
          label: format(d, "EEE"),
          Protein: Math.round(dayLogs.reduce((s, l) => s + (l.protein || 0) * (l.quantity || 1), 0)),
          Carbs: Math.round(dayLogs.reduce((s, l) => s + (l.carbs || 0) * (l.quantity || 1), 0)),
          Fat: Math.round(dayLogs.reduce((s, l) => s + (l.fat || 0) * (l.quantity || 1), 0)),
        };
      });
    } else if (range === "month") {
      const days = eachDayOfInterval({ start: subDays(now, 29), end: now });
      return days.map((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        const dayLogs = logs.filter((l) => l.date === dateStr);
        return {
          label: format(d, "d"),
          Protein: Math.round(dayLogs.reduce((s, l) => s + (l.protein || 0) * (l.quantity || 1), 0)),
          Carbs: Math.round(dayLogs.reduce((s, l) => s + (l.carbs || 0) * (l.quantity || 1), 0)),
          Fat: Math.round(dayLogs.reduce((s, l) => s + (l.fat || 0) * (l.quantity || 1), 0)),
        };
      });
    } else {
      const months = eachMonthOfInterval({ start: subYears(now, 1), end: now });
      return months.map((m) => {
        const monthStr = format(m, "yyyy-MM");
        const monthLogs = logs.filter((l) => l.date?.startsWith(monthStr));
        return {
          label: format(m, "MMM"),
          Protein: Math.round(monthLogs.reduce((s, l) => s + (l.protein || 0) * (l.quantity || 1), 0)),
          Carbs: Math.round(monthLogs.reduce((s, l) => s + (l.carbs || 0) * (l.quantity || 1), 0)),
          Fat: Math.round(monthLogs.reduce((s, l) => s + (l.fat || 0) * (l.quantity || 1), 0)),
        };
      });
    }
  }, [logs, range]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayLogs = logs.filter((l) => l.date === todayStr);
  const todayTotals = {
    calories: todayLogs.reduce((s, l) => s + (l.calories || 0) * (l.quantity || 1), 0),
    protein: todayLogs.reduce((s, l) => s + (l.protein || 0) * (l.quantity || 1), 0),
    carbs: todayLogs.reduce((s, l) => s + (l.carbs || 0) * (l.quantity || 1), 0),
    fat: todayLogs.reduce((s, l) => s + (l.fat || 0) * (l.quantity || 1), 0),
  };

  const goals = {
    calories: user?.daily_calories_goal || 2000,
    protein: user?.daily_protein_goal || 150,
    carbs: user?.daily_carbs_goal || 250,
    fat: user?.daily_fat_goal || 65,
  };

  const latestMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const measurementChartData = measurements.slice(-12).map((m) => ({
    date: format(new Date(m.date + "T00:00:00"), "MMM d"),
    Weight: m.weight || undefined,
    "Body Fat %": m.body_fat || undefined,
    "Muscle Mass": m.muscle_mass || undefined,
  }));

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  const macros = [
    { label: "Calories", value: Math.round(todayTotals.calories), goal: goals.calories, unit: "kcal" },
    { label: "Protein", value: Math.round(todayTotals.protein), goal: goals.protein, unit: "g" },
    { label: "Carbs", value: Math.round(todayTotals.carbs), goal: goals.carbs, unit: "g" },
    { label: "Fat", value: Math.round(todayTotals.fat), goal: goals.fat, unit: "g" },
  ];

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <h2 className="text-xl font-bold text-foreground">Today's Overview</h2>

      {/* Macro Goal Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {macros.map((m) => {
          const exceeded = m.value > m.goal;
          const pct = Math.min((m.value / m.goal) * 100, 100);
          return (
            <div key={m.label} className="bg-card border border-border rounded-xl p-3 space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{m.label}</div>
              <div className={`text-xl font-bold ${exceeded ? "text-destructive" : "text-white"}`}>
                {m.value}<span className="text-xs text-muted-foreground ml-1">{m.unit}</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: exceeded ? "hsl(0,90%,60%)" : "hsl(174,100%,50%)" }} />
              </div>
              <div className={`text-xs ${exceeded ? "text-destructive" : "text-muted-foreground"}`}>
                {exceeded ? "Over goal!" : `${Math.round(m.goal - m.value)} ${m.unit} left`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Body Measurements */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">Body Measurements</h3>
          <Link to="/profile" className="text-xs text-primary hover:underline">Update →</Link>
        </div>
        {latestMeasurement ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Weight", value: latestMeasurement.weight, unit: "kg", color: "hsl(174,100%,50%)" },
                { label: "Body Fat", value: latestMeasurement.body_fat, unit: "%", color: "hsl(300,100%,65%)" },
                { label: "Muscle", value: latestMeasurement.muscle_mass, unit: "kg", color: "hsl(80,100%,55%)" },
              ].map((s) => s.value != null && (
                <div key={s.label} className="bg-secondary rounded-lg p-2.5 text-center">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-lg font-bold mt-0.5" style={{ color: s.color }}>{s.value}<span className="text-xs text-muted-foreground ml-0.5">{s.unit}</span></div>
                </div>
              ))}
            </div>
            {measurementChartData.length > 1 && (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={measurementChartData}>
                    <XAxis dataKey="date" tick={{ fill: "hsl(220,10%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(220,10%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,18%)", borderRadius: 8, color: "hsl(180,100%,95%)", fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Weight" stroke="hsl(174,100%,50%)" strokeWidth={2} dot={false} connectNulls />
                    <Line type="monotone" dataKey="Body Fat %" stroke="hsl(300,100%,65%)" strokeWidth={2} dot={false} connectNulls />
                    <Line type="monotone" dataKey="Muscle Mass" stroke="hsl(80,100%,55%)" strokeWidth={2} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">No measurements yet. <Link to="/profile" className="text-primary hover:underline">Add one in Profile</Link></div>
        )}
      </div>

      {/* Nutrition Trends */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">Nutrition Trends</h3>
          <Tabs value={range} onValueChange={setRange}>
            <TabsList className="bg-secondary h-7">
              <TabsTrigger value="week" className="text-xs h-6">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs h-6">Month</TabsTrigger>
              <TabsTrigger value="year" className="text-xs h-6">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="label" tick={{ fill: "hsl(220,10%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(220,10%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,18%)", borderRadius: 8, color: "hsl(180,100%,95%)", fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Protein" fill="hsl(300,100%,65%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Carbs" fill="hsl(80,100%,55%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Fat" fill="hsl(45,100%,60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}