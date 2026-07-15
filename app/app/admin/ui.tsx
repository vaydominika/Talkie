import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select as ShadcnSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableHead } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <Card><CardHeader><p className="section-label">{eyebrow}</p><CardTitle>{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>
  );
}

export function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-background/10 p-3">
      <dt className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number | null;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
      />
    </div>
  );
}

export function TextArea({
  label,
  name,
  required,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea
        name={name}
        required={required}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        rows={3}
      />
    </div>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: [string, string][];
  defaultValue?: string | null;
}) {
  return (
    <div className="space-y-1.5"><Label>{label}</Label><ShadcnSelect name={name} defaultValue={defaultValue ?? options[0]?.[0]}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{options.map(([value, optionLabel]) => <SelectItem key={`${name}-${value}`} value={value}>{optionLabel}</SelectItem>)}</SelectContent></ShadcnSelect></div>
  );
}

export function Check({
  name,
  label,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <Checkbox name={name} defaultChecked={defaultChecked} disabled={disabled} />
      <span>{label}</span>
    </label>
  );
}

export function Th({ children }: { children: React.ReactNode }) {
  return <TableHead className="font-mono text-xs uppercase tracking-[0.16em]">{children}</TableHead>;
}

export function Td({ children }: { children: React.ReactNode }) {
  return <TableCell className="align-top">{children}</TableCell>;
}
