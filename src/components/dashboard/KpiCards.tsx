export const KpiCards = () => {
  const kpis = [
    { label: "Chargers Online", value: "6", variant: "success" },
    { label: "New users", value: "156", variant: "default" },
    { label: "Tariff AC", value: "0.25", variant: "default" },
    { label: "Tariff DC", value: "0.35", variant: "default" },
    { label: "Revenue", value: "12.4K", variant: "default" },
    { label: "Payments", value: "1,234", variant: "default" },
    { label: "Sessions", value: "2,567", variant: "default" },
    { label: "Faults", value: "3", variant: "default" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mt-6">
      <div className="bg-card rounded-xl p-4 shadow-sm border border-border flex flex-col items-center justify-center">
        <div className="relative w-16 h-16 mb-2">
          <svg className="transform -rotate-90 w-16 h-16">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="hsl(var(--muted))"
              strokeWidth="6"
              fill="none"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="#ef4444"
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${66.74 * 1.76} ${100 * 1.76}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold">66.74</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">Utilization</p>
      </div>

      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={`rounded-xl p-4 shadow-sm border flex flex-col items-center justify-center ${
            kpi.variant === "success"
              ? "bg-success text-success-foreground border-success"
              : "bg-card border-border"
          }`}
        >
          <p
            className={`text-2xl font-bold mb-1 ${
              kpi.variant === "success" ? "text-success-foreground" : "text-foreground"
            }`}
          >
            {kpi.value}
          </p>
          <p
            className={`text-xs text-center ${
              kpi.variant === "success" ? "text-success-foreground/80" : "text-muted-foreground"
            }`}
          >
            {kpi.label}
          </p>
        </div>
      ))}
    </div>
  );
};
