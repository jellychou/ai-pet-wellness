const logs = [
  ["Today", "Rabies vaccine completed", "Uploaded one photo"],
  ["Yesterday", "Added lunch record", "Chicken breast 120g"],
  ["2 days ago", "Health check", "Everything looks normal"],
  ["Last week", "AI diagnosis", "Ear photo analyzed"],
];
export function TimelinePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold">Timeline</h1>
      <div className="relative mt-8 border-l-2 border-mist pl-8">
        {logs.map(([d, t, s]) => (
          <div key={d} className="relative mb-6 card p-5">
            <span className="absolute -left-[42px] top-6 h-5 w-5 rounded-full border-4 border-[#f8f4ee] bg-mist" />
            <div className="muted">{d}</div>
            <h2 className="mt-1 font-semibold">{t}</h2>
            <p className="muted mt-2">{s}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
