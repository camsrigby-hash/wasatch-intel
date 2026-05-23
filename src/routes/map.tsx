import { createFileRoute } from "@tanstack/react-router";
import { MapCanvas } from "@/components/MapCanvas";

export const Route = createFileRoute("/map")({
  component: MapPage,
  head: () => ({
    meta: [
      { title: "Map · Wasatch Intel" },
      {
        name: "description",
        content:
          "Parcel-level zoning, future land use, gap-score and STIP overlays for the Wasatch Front.",
      },
    ],
  }),
});

function MapPage() {
  return <MapCanvas />;
}
