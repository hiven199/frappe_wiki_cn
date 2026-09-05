// Change-request workflow values are canonical English in the backend.
// Translate only at render time so filters, comparisons, APIs and persisted
// values remain stable across locales.
const STATUS_LABELS = {
	Draft: () => __('Draft'),
	'In Review': () => __('In Review'),
	'Changes Requested': () => __('Changes Requested'),
	Approved: () => __('Approved'),
	Merged: () => __('Merged'),
	Rejected: () => __('Rejected'),
	Archived: () => __('Archived'),
};

export function changeRequestStatusLabel(status) {
	return STATUS_LABELS[status]?.() || status || '';
}

export function changeRequestTitleLabel(title, spaceName) {
	if (!title) return '';

	// The backend creates this exact title for the implicit per-space draft CR.
	// Keep the stored title canonical and localize only the system-generated
	// prefix in the UI; custom titles are rendered untouched.
	if (spaceName && title === `Draft Changes - ${spaceName}`) {
		return `${__('Draft Changes')} - ${spaceName}`;
	}

	return title;
}
