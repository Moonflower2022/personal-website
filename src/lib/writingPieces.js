// single source of truth for which essays are published at /writing/<name>.
// add a new essay's filename (without .md) here; BOTH the /writing index and the
// in-essay [[wikilink]] resolver (routes/writing/[slug]/+page.svelte) read this.
export const writingPieces = [
	"everything_popular_is_wrong",
	"i_believe_in_speed",
	"on_connection",
	"disk_cleaning_is_a_trap",
	"my_learning_stack",
	"vibe_coding_manifesto",
	"i_used_to_be_a_zombie",
	"water_bottles",
	"a_glimpse_into_consciousness",
	"how_confidence_changed_my_life",
	"addiction",
	"math_in_the_mountains",
	"reflection",
	"learning_understanding_connections",
	"branding"
];

// lookup for [[wikilink]] resolution: filename keyed lowercase.
export const writingPieceSet = new Set(writingPieces.map((p) => p.toLowerCase()));
