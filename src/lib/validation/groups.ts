/**
 * Validation for groups and members, shared by the forms (react-hook-form
 * zodResolver) and the API routers, so both enforce the same rules.
 */
import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "../money/currency";

/** Icons a group can use; the components live in features/groups/group-icon. */
export const GROUP_ICONS = [
  "users",
  "waves",
  "tree-palm",
  "house",
  "utensils",
  "mountain",
  "plane",
  "car",
  "briefcase",
  "shopping-basket",
] as const;
export type GroupIconName = (typeof GROUP_ICONS)[number];

export const MAX_MEMBERS = 50;

export const groupNameSchema = z
  .string()
  .trim()
  .min(1, "Give the group a name.")
  .max(60, "Keep the name under 60 characters.");

export const memberNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(40, "Keep names under 40 characters.");

export const groupIdSchema = z.object({ groupId: z.string().min(1) });

export const createGroupSchema = z.object({
  name: groupNameSchema,
  icon: z.enum(GROUP_ICONS),
  currency: z.enum(SUPPORTED_CURRENCIES),
  /** Friends to add by name now (placeholders); the creator is added too. */
  memberNames: z
    .array(memberNameSchema)
    .max(MAX_MEMBERS - 1)
    .refine(
      (names) =>
        new Set(names.map((n) => n.toLowerCase())).size === names.length,
      "Each person needs a different name.",
    ),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = groupIdSchema.extend({
  name: groupNameSchema.optional(),
  icon: z.enum(GROUP_ICONS).optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  simplifyDebts: z.boolean().optional(),
});
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

export const addMemberSchema = groupIdSchema.extend({
  name: memberNameSchema,
});

export const renameMemberSchema = groupIdSchema.extend({
  memberId: z.string().min(1),
  name: memberNameSchema,
});

export const memberRefSchema = groupIdSchema.extend({
  memberId: z.string().min(1),
});
