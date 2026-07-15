"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Option = { value: string; label: React.ReactNode }

export function FormSelect({ name, defaultValue = "", options, placeholder, className, disabled, ariaLabel }: { name: string; defaultValue?: string | null; options: Option[]; placeholder?: string; className?: string; disabled?: boolean; ariaLabel?: string }) {
  const emptyValue = "__talkie_empty_value__"
  const normalize = (value: string | null | undefined) => value ? value : emptyValue
  const [value, setValue] = React.useState(normalize(defaultValue))

  return <>
    <input type="hidden" name={name} value={value === emptyValue ? "" : value} />
    <Select value={value} onValueChange={setValue} disabled={disabled}>
      <SelectTrigger className={className} aria-label={ariaLabel}><SelectValue placeholder={placeholder}/></SelectTrigger>
      <SelectContent>{options.map(option => <SelectItem key={normalize(option.value)} value={normalize(option.value)}>{option.label}</SelectItem>)}</SelectContent>
    </Select>
  </>
}
