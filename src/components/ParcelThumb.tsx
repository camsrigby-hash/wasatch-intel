// SVG-rendered satellite thumbnail placeholder for the pipeline list.
// Backend will swap to real MapTiler raster tiles centered on parcel centroid.
import { type IntelParcel } from "@/lib/parcel-intel";

export function ParcelThumb({ parcel, size = 80 }: { parcel: IntelParcel; size?: number }) {
  const seed = parcel.id.length;
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-md border border-border"
      style={{ width: size, height: size, background: "linear-gradient(135deg, #2d3a52 0%, #1f2940 60%, #4a5568 100%)" }}
    >
      <svg viewBox="0 0 80 80" width={size} height={size} className="absolute inset-0">
        {/* Faux roads */}
        <line x1="0" y1={20 + (seed % 10)} x2="80" y2={20 + (seed % 10)} stroke="#6b7a99" strokeWidth="3" opacity="0.6" />
        <line x1={30 + (seed % 15)} y1="0" x2={30 + (seed % 15)} y2="80" stroke="#6b7a99" strokeWidth="2" opacity="0.6" />
        {/* Faux parcel polygon */}
        <rect
          x={28 - (seed % 4)} y={32 - (seed % 4)}
          width={26 + (seed % 8)} height={20 + (seed % 6)}
          fill="rgba(255,255,255,0.04)" stroke="#ffffff" strokeWidth="1.5"
        />
        {/* Faux greenery dots */}
        {Array.from({ length: 8 }).map((_, i) => (
          <circle
            key={i} cx={(seed * (i + 1)) % 80} cy={((seed + 7) * (i + 3)) % 80}
            r={1 + ((seed + i) % 2)} fill="#4a6649" opacity="0.7"
          />
        ))}
      </svg>
    </div>
  );
}
