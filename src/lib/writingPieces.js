// single source of truth for essays rendered by the rich /writing/<slug> renderer.
// each entry: { slug, category?, star? }
//   category: "note" moves the piece into the /notes index instead of the /writing index
//     (it is STILL served from /writing/<slug> so its footnotes/wikilinks/images keep working
//     and inbound [[wikilinks]] don't break — only its listing location changes).
//   star: true badges it as a high-effort piece in whichever index it appears.
// add a new essay's slug here and BOTH the index pages and the [[wikilink]] resolver pick it up.
export const writingPieces = [
	{ slug: "everything_popular_is_wrong" },
	{ slug: "i_believe_in_speed" },
	{ slug: "on_connection", category: "note", star: true },
	{ slug: "disk_cleaning_is_a_trap" },
	{ slug: "my_learning_stack", category: "note", star: true },
	{ slug: "vibe_coding_manifesto", category: "note", star: true },
	{ slug: "i_used_to_be_a_zombie" },
	{ slug: "water_bottles" },
	{ slug: "a_glimpse_into_consciousness" },
	{ slug: "how_confidence_changed_my_life" },
	{ slug: "addiction" },
	{ slug: "math_in_the_mountains" },
	{ slug: "reflection" },
	{ slug: "learning_understanding_connections" },
	{ slug: "branding" },
	{ slug: "radical_transparency", star: true }
];

// lookup for [[wikilink]] resolution: slug keyed lowercase. every published essay is linkable
// regardless of which index it appears in.
export const writingPieceSet = new Set(writingPieces.map((p) => p.slug.toLowerCase()));

// pieces listed on the /writing index (everything not reclassified as a note)
export const writingIndexPieces = writingPieces.filter((p) => p.category !== "note");

// essays reclassified as notes — listed on /notes, still served from /writing/<slug>
export const essayNotePieces = writingPieces.filter((p) => p.category === "note");
