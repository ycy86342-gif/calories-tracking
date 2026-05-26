import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Camera, Loader2, ScanLine, ImageIcon } from "lucide-react";
import { toast } from "sonner";

const NUTRIENT_FIELDS = [
  { key: "serving_size", label: "Serving Size (e.g. 1 cup, 30g)", type: "text" },
  { key: "serving_grams", label: "Grams per Serving (g)", type: "number" },
  { key: "calories", label: "Calories (kcal)", type: "number", required: true },
  { key: "protein", label: "Protein (g)", type: "number", required: true },
  { key: "carbs", label: "Carbs (g)", type: "number", required: true },
  { key: "fat", label: "Fat (g)", type: "number", required: true },
  { key: "sodium", label: "Sodium (mg)", type: "number" },
  { key: "sugar", label: "Sugar (g)", type: "number" },
  { key: "fiber", label: "Fiber (g)", type: "number" },
];

export default function FoodDatabase() {
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [foodPhotoFile, setFoodPhotoFile] = useState(null);
  const [foodPhotoPreview, setFoodPhotoPreview] = useState(null);
  const scanInputRef = useRef(null);
  const foodPhotoRef = useRef(null);

  useEffect(() => {
    base44.entities.Food.list("name", 500).then((data) => {
      setFoods(data);
      setLoading(false);
    });
  }, []);

  const filtered = foods.filter((f) =>
    f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.brand?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleScanLabel(file) {
    if (!file) return;
    setScanning(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this food label image and extract ALL nutritional information. Return a JSON object with these exact fields: name (product name), brand (brand name), serving_size (as string like "100g" or "1 cup"), serving_grams (number - grams per serving), calories (number), protein (number in grams), carbs (number in grams, use total carbohydrates), fat (number in grams, use total fat), sodium (number in mg), sugar (number in grams), fiber (number in grams). If a value is not visible, use 0. Return only numbers (no units) for numeric fields.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          brand: { type: "string" },
          serving_size: { type: "string" },
          serving_grams: { type: "number" },
          calories: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fat: { type: "number" },
          sodium: { type: "number" },
          sugar: { type: "number" },
          fiber: { type: "number" },
        },
      },
    });
    setForm(result);
    setScanning(false);
    toast.success("Label scanned! Review and edit the values.");
  }

  function handleFoodPhotoChange(file) {
    if (!file) return;
    setFoodPhotoFile(file);
    setFoodPhotoPreview(URL.createObjectURL(file));
  }

  async function handleAdd() {
    if (!form.name || !form.calories) {
      toast.error("Food name and calories are required.");
      return;
    }
    const exists = foods.some((f) => f.name.toLowerCase().trim() === form.name.toLowerCase().trim());
    if (exists) {
      toast.error("This food already exists in the database!");
      return;
    }
    setSaving(true);
    let photo_url = form.photo_url || null;
    if (foodPhotoFile) {
      const uploaded = await base44.integrations.Core.UploadFile({ file: foodPhotoFile });
      photo_url = uploaded.file_url;
    }
    const created = await base44.entities.Food.create({
      ...form,
      photo_url,
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      sodium: Number(form.sodium) || 0,
      sugar: Number(form.sugar) || 0,
      fiber: Number(form.fiber) || 0,
      serving_grams: form.serving_grams ? Number(form.serving_grams) : undefined,
    });
    setFoods((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setForm({});
    setFoodPhotoFile(null);
    setFoodPhotoPreview(null);
    setOpen(false);
    setSaving(false);
    toast.success("Food added!");
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Food Database</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm({}); setFoodPhotoFile(null); setFoodPhotoPreview(null); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 shadow-[0_0_12px_hsl(174,100%,50%,0.3)]"><Plus className="w-3.5 h-3.5" />Add Food</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Food</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              {/* Scan Label */}
              <div className="border border-dashed border-primary/40 rounded-xl p-3 space-y-2 bg-primary/5">
                <div className="flex items-center gap-2 text-primary text-xs font-medium">
                  <ScanLine className="w-3.5 h-3.5" />Scan Food Label
                </div>
                <p className="text-xs text-muted-foreground">Take or upload a photo of the nutrition facts label to auto-fill.</p>
                <Button type="button" variant="outline" size="sm" disabled={scanning} onClick={() => scanInputRef.current?.click()} className="gap-2 border-primary/30 text-primary hover:bg-primary/10 text-xs">
                  {scanning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Scanning...</> : <><Camera className="w-3.5 h-3.5" />Scan Label</>}
                </Button>
                <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files[0] && handleScanLabel(e.target.files[0])} />
              </div>

              {/* Food photo */}
              <div>
                <Label className="text-xs text-muted-foreground">Food Photo</Label>
                <div className="mt-1 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden">
                    {foodPhotoPreview ? <img src={foodPhotoPreview} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => foodPhotoRef.current?.click()} className="gap-1.5 text-xs">
                    <Camera className="w-3 h-3" />Upload Photo
                  </Button>
                  <input ref={foodPhotoRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && handleFoodPhotoChange(e.target.files[0])} />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Food Name *</Label>
                <Input type="text" value={form.name || ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="bg-secondary border-border h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Brand</Label>
                <Input type="text" value={form.brand || ""} onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))} className="bg-secondary border-border h-8 text-sm" />
              </div>

              {NUTRIENT_FIELDS.map((f) => (
                <div key={f.key}>
                  <Label className="text-xs text-muted-foreground">{f.label}{f.required && " *"}</Label>
                  <Input type={f.type} value={form[f.key] || ""} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} className="bg-secondary border-border h-8 text-sm" />
                </div>
              ))}
              <Button onClick={handleAdd} disabled={saving} className="mt-1">{saving ? "Adding..." : "Add Food"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Search by food name or brand..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border h-8 text-sm" />
      </div>

      <div className="grid gap-2">
        {filtered.map((f) => (
          <div key={f.id} className="bg-card border border-border rounded-lg p-2.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg border border-border bg-secondary flex-shrink-0 overflow-hidden flex items-center justify-center">
              {f.photo_url ? <img src={f.photo_url} alt={f.name} className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground text-xs truncate">
                {f.name}{f.brand ? <span className="text-muted-foreground"> / {f.brand}</span> : ""}
              </div>
              <div className="text-xs text-muted-foreground">{f.serving_size || "1 serving"}{f.serving_grams ? ` · ${f.serving_grams}g` : ""}</div>
            </div>
            <div className="flex flex-col md:flex-row gap-1 md:gap-2 text-xs text-right shrink-0">
              <span className="text-primary">{f.calories} cal</span>
              <span className="text-accent">{f.protein}g P</span>
              <span style={{ color: "hsl(80,100%,55%)" }}>{f.carbs}g C</span>
              <span style={{ color: "hsl(45,100%,60%)" }}>{f.fat}g F</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center text-muted-foreground py-10 text-sm">No foods found</div>}
      </div>
    </div>
  );
}