export function BoardSkeleton() {
  return (
    <div className="w-full aspect-square rounded-lg bg-gray-200 animate-pulse" />
  );
}

export function OptionsSkeleton() {
  return (
    <div className="flex flex-col gap-3 w-full">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-11 rounded-lg bg-gray-200 animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}
