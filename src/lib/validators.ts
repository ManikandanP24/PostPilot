import { z } from "zod";
export const postInputSchema = z.object({
  title: z.string().trim().max(120).default("Untitled post"),
  imageAssetId: z.string().uuid(),
  audioAssetId: z.string().uuid().nullable().optional(),
  videoAssetId: z.string().uuid().nullable().optional(),
  instagramCaption: z.string().max(2200).default(""),
  linkedinCaption: z.string().max(3000).default(""),
  facebookCaption: z.string().max(2200).default(""),
  platforms: z.array(z.enum(["instagram", "facebook", "linkedin"])).min(1),
  addMusic: z.boolean().default(false), hideLikeCount: z.boolean().default(false), alsoPostToFacebook: z.boolean().default(false),
  publishNow: z.boolean().default(true), scheduledFor: z.string().datetime().nullable().optional(), timezone: z.string().min(1).max(80).default("Asia/Kolkata"),
});
export type PostInput = z.infer<typeof postInputSchema>;
export function validateInstagramRatio(width: number, height: number) {
  if (width <= 0 || height <= 0) throw new Error("The uploaded image dimensions could not be read.");
  const ratio = width / height;
  if (ratio < 0.8 || ratio > 1.91) throw new Error("Instagram images must have an aspect ratio from 4:5 to 1.91:1. Please crop the image and upload again.");
}
