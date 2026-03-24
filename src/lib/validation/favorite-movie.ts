import { z } from "zod";

/** Server-only validation: trim and length bounds for favorite movie title. */
export const favoriteMovieTitleSchema = z
  .string()
  .trim()
  .min(1, "Movie title is required")
  .max(200, "Movie title must be at most 200 characters");

export type FavoriteMovieTitle = z.infer<typeof favoriteMovieTitleSchema>;
