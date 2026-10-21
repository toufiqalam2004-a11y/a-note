/**
 * Predefined video editing categories and types for A Note clients.
 */
export const PREDEFINED_VIDEO_TYPES: string[] = [
  'Cinematic Edit',
  'Short Edit',
  'Reel / Reels Edit',
  'YouTube Video',
  'Wedding Film',
  'Event Highlight',
  'Documentary',
  'Real Estate Video',
  'Football / Sports Edit',
  'Podcast Edit',
  'Advertisement / Promo',
];

/**
 * Returns a clean, deterministic video type for a given video number,
 * based on the client's selected video types.
 *
 * - If user selected 1 type: that type is used for all videos.
 * - If user selected multiple types: types are assigned predictably in order (cycling).
 * - If user selected no types: returns defaultLabel (e.g. 'No type selected').
 */
export function getDeterministicVideoType(
  videoNumber: number,
  clientVideoTypes?: string[] | null,
  assignedVideoType?: string | null,
  defaultLabel: string = 'No type selected'
): string {
  if (assignedVideoType && assignedVideoType.trim().length > 0) {
    return assignedVideoType.trim();
  }

  if (clientVideoTypes && clientVideoTypes.length > 0) {
    const cleanTypes = clientVideoTypes.filter((t) => t && t.trim().length > 0);
    if (cleanTypes.length === 1) {
      return cleanTypes[0];
    }
    if (cleanTypes.length > 1) {
      const index = (Math.max(1, videoNumber) - 1) % cleanTypes.length;
      return cleanTypes[index];
    }
  }

  return defaultLabel;
}
