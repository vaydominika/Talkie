export function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-background p-5 shadow-sm dark:border-stone-800">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-2xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <dt className="text-[0.65rem] uppercase tracking-[0.16em] text-stone-400">{label}</dt>
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
    <label className="block text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-rose-300"
      />
    </label>
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
    <label className="block text-sm font-medium">
      {label}
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        rows={3}
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
      />
    </label>
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
    <label className="block text-sm font-medium">
      {label}
      <select
        name={name}
        defaultValue={defaultValue ?? undefined}
        className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-rose-300"
      >
        {options.map(([value, label]) => (
          <option key={`${name}-${value}`} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
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
      <input name={name} type="checkbox" defaultChecked={defaultChecked} disabled={disabled} />
      <span>{label}</span>
    </label>
  );
}

export function Th({ children }: { children: React.ReactNode }) {
  return <th className="p-3 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{children}</th>;
}

export function Td({ children }: { children: React.ReactNode }) {
  return <td className="p-3 align-top">{children}</td>;
}
