import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Copy, Camera, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const MEALS = ["breakfast", "lunch", "snack", "dinner", "dessert"];
const MEAL_COLORS = {
  breakfast: "hsl(174,100%,50%)",
  lunch: "hsl(80,100%,55%)",
  snack: "hsl(45,100%,60%)",
  dinner: "hsl(300,100%,65%)",
  dessert: "hsl(200,100%,60%)",
};

export default function DayDetail() {
  const { date } = useParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [foods, setFoods] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState("breakfast");
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [foodSearch, setFoodSearch] = useState("");
  const [copyDate, setCopyDate] = useState("");
  const [copyMeal, setCopyMeal] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const me = await base44.auth.me();
      const [dayLogs, allFoods] = await Promise.all([
        base44.entities.FoodLog.filter({ created_by_id: me.id, date }, "meal_type"),
        base44.entities.Food.list("name", 500),
      ]);
      setUser(me);
      setLogs(dayLogs);
      setFoods(allFoods);
      setLoading(false);
    }
    load();
  }, [date]);

  const goals = {
    calories: user?.daily_calories_goal || 2000,
    protein: user?.daily_protein_goal || 150,
    carbs: user?.daily_carbs_goal || 250,
    fat: user?.daily_fat_goal || 65,
  };

  const totals = {
    calories: logs.reduce((s, l) => s + (l.calories || 0) * (l.quantity || 1), 0),
    protein: logs.reduce((s, l) => s + (l.protein || 0) * (l.quantity || 1), 0),
    carbs: logs.reduce((s, l) => s + (l.carbs || 0) * (l.quantity || 1), 0),
    fat: logs.reduce((s, l) => s + (l.fat || 0) * (l.quantity || 1), 0),
  };

  async function handleAddFood() {
    if (!selectedFood) return;
    const food = foods.find((f) => f.id === selectedFood);
    const log = await base44.entities.FoodLog.create({
      date,
      meal_type: selectedMeal,
      food_id: food.id,
      food_name: food.name,
      quantity: Number(quantity) || 1,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
    setLogs((prev) => [...prev, log]);
    setAddOpen(false);
    setSelectedFood(null);
    setQuantity(1);
    toast.success("Food logged!");
  }

  async function handleDelete(id) {
    await base44.entities.FoodLog.delete(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  async function handleUploadPhoto(logId, file) {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.FoodLog.update(logId, { photo_url: file_url });
    setLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, photo_url: file_url } : l)));
    toast.success("Photo uploaded!");
  }

  async function handleCopyMeal() {
    if (!copyDate || !copyMeal) return;
    const me = await base44.auth.me();
    const sourceLogs = await base44.entities.FoodLog.filter({ created_by_id: me.id, date: copyDate, meal_type: copyMeal });
    if (sourceLogs.length === 0) {
      toast.error("No food found for that meal");
      return;
    }
    const newLogs = await base44.entities.FoodLog.bulkCreate(
      sourceLogs.map((l) => ({
        date,
        meal_type: l.meal_type,
        food_id: l.food_id,
        food_name: l.food_name,
        quantity: l.quantity,
        calories: l.calories,
        protein: l.protein,
        carbs: l.carbs,
        fat: l.fat,
      }))
    );
    setLogs((prev) => [...prev, ...newLogs]);
    setCopyOpen(false);
    toast.success(`Copied ${newLogs.length} items!`);
  }

  const filteredFoods = foods.filter((f) => f.name?.toLowerCase().includes(foodSearch.toLowerCase()));

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/log")}><ArrowLeft className="w-5 h-5" /></Button>
        <h2 className="text-xl font-bold text-foreground">{format(new Date(date + "T00:00:00"), "EEEE, MMM d, yyyy")}</h2>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Calories", val: totals.calories, goal: goals.calories, unit: "kcal" },
          { label: "Protein", val: totals.protein, goal: goals.protein, unit: "g" },
          { label: "Carbs", val: totals.carbs, goal: goals.carbs, unit: "g" },
          { label: "Fat", val: totals.fat, goal: goals.fat, unit: "g" },
        ].map((m) => (
          <div key={m.label} className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">{m.label}</div>
            <div className={`text-lg font-bold ${Math.round(m.val) > m.goal ? "text-destructive" : "text-white"}`}>
              {Math.round(m.val)}
            </div>
            <div className="text-[10px] text-muted-foreground">/ {m.goal}{m.unit}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setAddOpen(true)} className="gap-2 flex-1 shadow-[0_0_12px_hsl(174,100%,50%,0.3)]"><Plus className="w-4 h-4" />Log Food</Button>
        <Button variant="outline" onClick={() => setCopyOpen(true)} className="gap-2"><Copy className="w-4 h-4" />Copy Meal</Button>
      </div>

      {/* Meals */}
      {MEALS.map((meal) => {
        const mealLogs = logs.filter((l) => l.meal_type === meal);
        if (mealLogs.length === 0) return null;
        return (
          <div key={meal} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MEAL_COLORS[meal] }} />
              <h3 className="font-semibold capitalize text-foreground">{meal}</h3>
              <span className="text-xs text-muted-foreground">{Math.round(mealLogs.reduce((s, l) => s + (l.calories || 0) * (l.quantity || 1), 0))} cal</span>
            </div>
            {mealLogs.map((log) => (
              <div key={log.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                {log.photo_url && <img src={log.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground text-sm truncate">{log.food_name}</div>
                  <div className="text-xs text-muted-foreground">{log.quantity || 1} serving · {Math.round((log.calories || 0) * (log.quantity || 1))} cal</div>
                </div>
                <label className="cursor-pointer text-muted-foreground hover:text-primary">
                  <Camera className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && handleUploadPhoto(log.id, e.target.files[0])} />
                </label>
                <button onClick={() => handleDelete(log.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        );
      })}

      {logs.length === 0 && <div className="text-center text-muted-foreground py-12">No food logged yet. Tap "Log Food" to start!</div>}

      {/* Add Food Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Food</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={selectedMeal} onValueChange={setSelectedMeal}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{MEALS.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search food..." value={foodSearch} onChange={(e) => setFoodSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredFoods.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFood(f.id)}
                  className={`w-full text-left p-2 rounded-lg text-sm transition-all ${selectedFood === f.id ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary"}`}
                >
                  <div className="font-medium text-foreground">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{f.calories} cal · {f.protein}g P · {f.carbs}g C · {f.fat}g F</div>
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Servings</label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0.25" step="0.25" className="bg-secondary border-border" />
            </div>
            <Button onClick={handleAddFood} disabled={!selectedFood} className="w-full">Add to Log</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Meal Dialog */}
      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Copy Meal from Another Day</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Source Date</label>
              <Input type="date" value={copyDate} onChange={(e) => setCopyDate(e.target.value)} className="bg-secondary border-border" />
            </div>
            <Select value={copyMeal} onValueChange={setCopyMeal}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select meal" /></SelectTrigger>
              <SelectContent>{MEALS.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={handleCopyMeal} disabled={!copyDate || !copyMeal} className="w-full">Copy Meal</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
