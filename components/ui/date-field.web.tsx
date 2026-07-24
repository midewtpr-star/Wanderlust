import { toISODate } from "@/lib/dates";

// Web date field — a real <input type="date"> (rendered by react-dom in the web
// bundle). Styled with inline CSS that reads the theme tokens from global.css.
export function DateField({
  value,
  onChange,
  placeholder = "Select date",
  minimumDate,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
  placeholder?: string;
  minimumDate?: Date;
}) {
  return (
    <input
      type="date"
      value={value ? toISODate(value) : ""}
      min={minimumDate ? toISODate(minimumDate) : undefined}
      placeholder={placeholder}
      onChange={(e) => {
        const v = e.target.value;
        if (v) onChange(new Date(`${v}T00:00:00`));
      }}
      style={{
        height: 44,
        width: "100%",
        boxSizing: "border-box",
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "hsl(var(--border))",
        backgroundColor: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        paddingLeft: 12,
        paddingRight: 12,
        fontSize: 16,
        fontFamily: "inherit",
      }}
    />
  );
}
