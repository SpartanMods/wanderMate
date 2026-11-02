// Which fire-restriction sources apply to each zone, and whether together they
// cover every land manager in the zone (#11 decision: "no fire restrictions"
// is shown only when coverage is complete; otherwise the zone is unknown
// unless a source reports a restriction).
//
// Every zone in data/tripZones.ts must have an entry (enforced by a test), so
// adding a zone forces a decision here.
import type { FireSourceId } from "./types";

export type FireCoverage = {
  sources: FireSourceId[];
  /** True only when the sources cover every land manager in the zone. */
  complete: boolean;
};

const UTAH_ALL_AGENCIES: FireCoverage = { sources: ["utah-ffsl"], complete: true };
/** USFS Region 2 / Medicine Bow-Routt forests with no current restriction layer. */
const NO_SOURCE: FireCoverage = { sources: [], complete: false };

export const FIRE_COVERAGE: Record<string, FireCoverage> = {
  // Utah: the FFSL layer carries every agency's orders (USFS, BLM, NPS, state, tribal).
  "moab-area": UTAH_ALL_AGENCIES,
  "san-rafael-swell": UTAH_ALL_AGENCIES,
  "capitol-reef-area": UTAH_ALL_AGENCIES,
  "manti-la-sal": UTAH_ALL_AGENCIES,
  "fishlake-national-forest": UTAH_ALL_AGENCIES,
  "uinta-mountains": UTAH_ALL_AGENCIES,
  // The reservoir and the zone's point extend into Wyoming, outside FFSL's area.
  "flaming-gorge": { sources: ["utah-ffsl"], complete: false },
  // Utah BLM via FFSL; the Colorado side (Mesa County) is BLM, covered by BLM-RMA.
  "book-cliffs": { sources: ["utah-ffsl", "blm-rma"], complete: true },
  // Colorado side includes NPS (Dinosaur NM) land, which no source covers.
  "dinosaur-browns-park": { sources: ["utah-ffsl", "blm-rma"], complete: false },

  // Colorado BLM zones.
  "gunnison-hartman": { sources: ["blm-rma"], complete: true },
  "rabbit-valley": { sources: ["blm-rma"], complete: true },
  // Pike & San Isabel NF districts plus nearby BLM (Royal Gorge Field Office).
  "buena-vista-fourmile": { sources: ["usfs-psicc", "blm-rma"], complete: true },
  // Also state land (Arkansas Headwaters / Eleven Mile state parks): not covered.
  "arkansas-river-valley": { sources: ["usfs-psicc", "blm-rma"], complete: false },
  "south-park-eleven-mile": { sources: ["usfs-psicc", "blm-rma"], complete: false },
  // BLM covered; Routt NF and state land are not.
  "walden-north-park": { sources: ["blm-rma"], complete: false },

  // GMUG (layer stale since 2025-08, excluded), White River, Arapaho-Roosevelt
  // and Medicine Bow-Routt publish no current restriction layer.
  "taylor-park": NO_SOURCE,
  "grand-mesa": NO_SOURCE,
  "uncompahgre-plateau": NO_SOURCE,
  "flat-tops": NO_SOURCE,
  "poudre-canyon": NO_SOURCE,
  "red-feather-lakes": NO_SOURCE,
  "medicine-bow": NO_SOURCE,
  "vedauwoo": NO_SOURCE,
  "snowy-range": NO_SOURCE,
};

export function fireCoverageFor(zoneId: string): FireCoverage {
  return FIRE_COVERAGE[zoneId] ?? NO_SOURCE;
}
