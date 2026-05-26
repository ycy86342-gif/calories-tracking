import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { LogOut, History, Trash2 } from "lucide-react";

const today = format(new Date(), "yyyy-MM-dd");

export default function Profile() {
  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState({});
  const [measurements, setMeasurements] = useState([]);
  const [newMeasurement, setNewMeasurement] = useState({ date: today });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const me = await base44.auth.me();
      setUser(me);
      setGoals({
        daily_calories_goal: me.daily_calories_goal || 2000,
        daily_protein_goal: me.daily_protein_goal || 150,
        daily_carbs_goal: me.daily_carbs_goal || 250,
        daily_fat_goal: me.daily_fat_goal || 65,
      });
      const ms = await base44.entities.BodyMeasurement.filter({ created_by_id: me.id }, "date", 200);
      setMeasurements(ms);
      setLoading(false);
    }
    load();
  }, []);

  async function saveGoals() {
    setSaving(true);
    await base44.auth.updateMe({
      daily_calories_goal: Number(goals.daily_calories_goal),
      daily_protein_goal: Number(goals.daily_protein_goal),
      daily_carbs_goal: Number(goals.daily_carbs_goal),
      daily_fat_goal: Number(goals.daily_fat_goal),
    });
    setSaving(false);
    toast.success("Goals saved!");
  }

  async function addMeasurement() {
    if (!newMeasurement.date) return;
    const m = await base44.entities.BodyMeasurement.create({
      ...newMeasurement,
      weight: newMeasurement.weight ? Number(newMeasurement.weight) : undefined,
      body_fat: newMeasurement.body_fat ? Number(newMeasurement.body_fat) : undefined,
      muscle_mass: newMeasurement.muscle_mass ? Number(newMeasurement.muscle_mass) : undefined,
      waist: newMeasurement.waist ? Number(newMeasurement.waist) : undefined,
      chest: newMeasurement.chest ? Number(newMeasurement.chest) : undefined,
      arms: newMeasurement.arms ? Number(newMeasurement.arms) : undefined,
      thighs: newMeasurement.thighs ? Number(newMeasurement.thighs) : undefined,
    });
    setMeasurements((prev) => [...prev, m].sort((a, b) => a.date.localeCompare(b.date)));
    setNewMeasurement({ date: today });
    toast.success("Measurement saved!");
  }

  async function deleteMeasurement(id) {
    await base44.entities.BodyMeasurement.delete(id);
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
    toast.success("Record deleted.");
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  const chartData = measurements.slice(-12).map((m) => ({
    date: format(new Date(m.date + "T00:00:00"), "MMM d"),
    Weight: m.weight || undefined,
    "Body Fat %": m.body_fat || undefined,
    "Muscle Mass": m.muscle_mass || undefined,
  }));

  const measureFields = [
    { key: "weight", label: "Weight (kg)" },
    { key: "body_fat", label: "Body Fat %" },
    { key: "muscle_mass", label: "Muscle Mass (kg)" },
    { key: "waist", label: "Waist (cm)" },
    { key: "chest", label: "Chest (cm)" },
    { key: "arms", label: "Arms (cm)" },
    { key: "thighs", label: "Thighs (cm)" },
  ];

  return (
    <div className="space-y-5 pb-20 md:pb-0 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Profile</h2>
        <Button variant="ghost" size="sm" onClick={() => base44.auth.logout()} className="text-muted-foreground gap-1.5 text-xs"><LogOut className="w-3.5 h-3.5" />Logout</Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-3 space-y-1">
        <div className="text-foreground font-medium text-sm">{user?.full_name}</div>
        <div className="text-xs text-muted-foreground">{user?.email}</div>
      </div>

      {/* Goals */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">Daily Intake Goals</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { key: "daily_calories_goal", label: "Calories (kcal)" },
            { key: "daily_protein_goal", label: "Protein (g)" },
            { key: "daily_carbs_goal", label: "Carbs (g)" },
            { key: "daily_fat_goal", label: "Fat (g)" },
          ].map((g) => (
            <div key={g.key}>
              <Label className="text-xs text-muted-foreground">{g.label}</Label>
              <Input type="number" value={goals[g.key] || ""} onChange={(e) => setGoals((p) => ({ ...p, [g.key]: e.target.value }))} className="bg-secondary border-border h-8 text-sm" />
            </div>
          ))}
        </div>
        <Button onClick={saveGoals} disabled={saving} size="sm" className="w-full">{saving ? "Saving..." : "Save Goals"}</Button>
      </div>

      {/* Body Measurements */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">Add Body Measurement</h3>
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)} className="gap-1.5 text-xs h-7">
            <History className="w-3 h-3" />View History
          </Button>
        </div>

        {chartData.length > 1 && (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fill: "hsl(220,10%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220,10%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,18%)", borderRadius: 8, color: "hsl(180,100%,95%)", fontSize: 11 }} />
                <Line type="monotone" dataKey="Weight" stroke="hsl(174,100%,50%)" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="Body Fat %" stroke="hsl(300,100%,65%)" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="Muscle Mass" stroke="hsl(80,100%,55%)" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input
              type="date"
              max={today}
              value={newMeasurement.date}
              onChange={(e) => setNewMeasurement((p) => ({ ...p, date: e.target.value }))}
              className="bg-secondary border-border h-8 text-sm"
            />
          </div>
          {measureFields.map((f) => (
            <div key={f.key}>
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Input type="number" step="0.1" value={newMeasurement[f.key] || ""} onChange={(e) => setNewMeasurement((p) => ({ ...p, [f.key]: e.target.value }))} className="bg-secondary border-border h-8 text-sm" />
            </div>
          ))}
        </div>
        <Button onClick={addMeasurement} variant="outline" size="sm" className="w-full">Add Measurement</Button>
      </div>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="bg-card border-border max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Measurement History</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {measurements.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No records yet.</p>}
            {[...measurements].reverse().map((m) => (
              <div key={m.id} className="bg-secondary rounded-lg p-3 flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-primary">{format(new Date(m.date + "T00:00:00"), "MMM d, yyyy")}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                    {m.weight != null && <span>Weight: <span className="text-foreground">{m.weight}kg</span></span>}
                    {m.body_fat != null && <span>Body Fat: <span className="text-foreground">{m.body_fat}%</span></span>}
                    {m.muscle_mass != null && <span>Muscle: <span className="text-foreground">{m.muscle_mass}kg</span></span>}
                    {m.waist != null && <span>Waist: <span className="text-foreground">{m.waist}cm</span></span>}
                    {m.chest != null && <span>Chest: <span className="text-foreground">{m.chest}cm</span></span>}
                    {m.arms != null && <span>Arms: <span className="text-foreground">{m.arms}cm</span></span>}
                    {m.thighs != null && <span>Thighs: <span className="text-foreground">{m.thighs}cm</span></span>}
                  </div>
                </div>
                <button onClick={() => deleteMeasurement(m.id)} className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
