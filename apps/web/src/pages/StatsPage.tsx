export function StatsPage() {
  return (
    <div className="mx-auto space-y-6">
      <h1 className="text-3xl font-semibold">Analytics</h1>
      <div className="grid gap-4">
        {[
          ["Weight", "25.4 kg"],
          ["Calories", "430 kcal"],
          ["Exercise", "60 min"],
          ["Mood", "Happy"],
        ].map(([a, b]) => (
          <div className="card p-5" key={a}>
            <div className="text-2xl font-semibold">{b}</div>
            <div className="muted">{a}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-6">
        <div className="card p-5">
          <h2 className="font-semibold">Weight trend</h2>
          <div className="mt-6 flex h-56 items-end gap-3">
            {[48, 55, 52, 64, 70, 68, 76, 82].map((h, i) => (
              <div className="flex-1" key={i}>
                <div
                  className="rounded-t-xl bg-mist"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Calorie intake</h2>
          <div className="mt-6 flex h-56 items-end gap-3">
            {[65, 78, 42, 88, 54, 68, 72].map((h, i) => (
              <div className="flex-1" key={i}>
                <div
                  className="rounded-t-xl bg-sand"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
