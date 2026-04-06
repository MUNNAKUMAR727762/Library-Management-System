import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ShiftDefinition } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Clock3, type LucideIcon } from 'lucide-react';

interface ShiftMultiSelectProps {
  shifts: ShiftDefinition[];
  selectedShiftIds: number[];
  onChange: (shiftIds: number[]) => void;
  maxSelection?: number;
  label?: string;
  helperText?: string;
  disabledShiftIds?: number[];
  labelIcon?: LucideIcon;
}

export function ShiftMultiSelect({
  shifts,
  selectedShiftIds,
  onChange,
  maxSelection = 3,
  label = 'Selected Shifts',
  helperText = 'Choose at least one shift. You can assign up to 3 shifts for the same seat.',
  disabledShiftIds = [],
  labelIcon: LabelIcon,
}: ShiftMultiSelectProps) {
  const toggleShift = (shiftId: number) => {
    if (selectedShiftIds.includes(shiftId)) {
      onChange(selectedShiftIds.filter((item) => item !== shiftId));
      return;
    }
    if (selectedShiftIds.length >= maxSelection) return;
    onChange([...selectedShiftIds, shiftId]);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          {LabelIcon ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/8 text-primary">
              <LabelIcon size={15} />
            </span>
          ) : null}
          <span>{label}</span>
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {shifts.map((shift) => {
          const checked = selectedShiftIds.includes(shift.id);
          const disabled = disabledShiftIds.includes(shift.id) || (!checked && selectedShiftIds.length >= maxSelection);
          return (
            <label
              key={shift.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
                checked ? 'border-primary bg-primary/5' : 'border-border bg-background'
              } ${disabled ? 'opacity-60' : ''}`}
            >
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={() => toggleShift(shift.id)}
                className="mt-0.5"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{shift.label}</p>
                <p className={cn('mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground', checked ? 'text-primary/80' : '')}>
                  <Clock3 size={12} />
                  {shift.time}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
