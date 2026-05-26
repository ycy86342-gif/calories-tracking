import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function DailyLog() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [logs, setLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const me = await base44.auth.me();
      const allLogs = await base44.entities.FoodLog.filter({ created_by_id: me.id }, "-date", 1000);
      setUser(me);
      setLogs(allLogs);
      setLoading(false);
    }
    load();
  }, []);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOffset = (getDay(startOfMonth(currentMonth)) + 6) % 7;

  const logsByDate = useMemo(() => {
    const map = {};
    logs.forEach((l) => {
      if (!map[l.date]) map[l.date] = [];
      map[l.date].push(l);
    });
    return map;
  }, [logs]);

  const goals = {
    calories: user?.daily_calories_goal || 2000,
    protein: user?.daily_protein_goal || 150,
    carbs: user?.daily_carbs_goal || 250,
    fat: user?.daily_fat_goal || 65,
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3 pb-20 md:pb-0">
      <h2 className="text-xl font-bold text-foreground">Daily Food Log</h2>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="font-semibold text-foreground text-sm">{format(currentMonth, "MMMM yyyy")}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-4 h-4" /></Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-center text-xs text-muted-foreground py-1">{d}</div>
        ))}
        {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`e-${i}`} />)}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayLogs = logsByDate[dateStr] || [];
          const totals = {
            calories: dayLogs.reduce((s, l) => s + (l.calories || 0) * (l.quantity || 1), 0),
            protein: dayLogs.reduce((s, l) => s + (l.protein || 0) * (l.quantity || 1), 0),
            carbs: dayLogs.reduce((s, l) => s + (l.carbs || 0) * (l.quantity || 1), 0),
            fat: dayLogs.reduce((s, l) => s + (l.fat || 0) * (l.quantity || 1), 0),
          };
          const exceeded = dayLogs.length > 0 && (
            totals.calories > goals.calories ||
            totals.protein > goals.protein ||
            totals.carbs > goals.carbs ||
            totals.fat > goals.fat
          );
          const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
          const hasMeals = dayLogs.length > 0;

          return (
            <button
              key={dateStr}
              onClick={() => navigate(`/log/${dateStr}`)}
              className={`aspect-square rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 text-xs hover:border-primary/50
                ${exceeded ? "bg-destructive/20 border-destructive/40" : isToday ? "border-primary bg-primary/5 shadow-[0_0_8px_hsl(174,100%,50%,0.2)]" : "border-border bg-card"}`}
            >
              <span className={isToday ? "text-primary font-bold" : exceeded ? "text-destructive" : "text-foreground"}>{format(day, "d")}</span>
              {hasMeals && (
                <span className={`text-[9px] ${exceeded ? "text-destructive" : "text-primary"}`}>{Math.round(totals.calories)}</span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center">Tap a day to view or log meals</p>
    </div>
  );
}
