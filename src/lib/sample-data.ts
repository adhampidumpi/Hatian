/**
 * The Siargao Trip sample group from docs/product-spec.md.
 * Shared by the seed script and the money tests so they can't drift apart.
 * Amounts are in centavos.
 */
import type { SplitMode } from "./money/split";

export const siargaoMembers = [
  // The demo user. The UI calls the signed-in user "You"; initials "MS".
  { id: "you", name: "Maria Santos", email: "demo@hatian.app" },
  { id: "ana", name: "Ana", email: "ana@example.com" },
  { id: "bea", name: "Bea", email: "bea@example.com" },
  { id: "carlo", name: "Carlo", email: "carlo@example.com" },
  { id: "dan", name: "Dan", email: "dan@example.com" },
] as const;

export type SampleExpense = {
  date: string;
  description: string;
  categoryId: string;
  paidById: string;
  amount: number;
  mode: SplitMode;
  participants: string[];
};

const everyone = siargaoMembers.map((m) => m.id);

export const siargaoExpenses: SampleExpense[] = [
  {
    date: "2026-11-12",
    description: "Villa, 2 nights",
    categoryId: "lodging",
    paidById: "you",
    amount: 1_800_000,
    mode: "EQUAL",
    participants: everyone,
  },
  {
    date: "2026-11-12",
    description: "Groceries",
    categoryId: "groceries",
    paidById: "bea",
    amount: 234_000,
    mode: "EQUAL",
    participants: everyone.filter((id) => id !== "dan"),
  },
  {
    date: "2026-11-13",
    description: "Island hopping boat",
    categoryId: "activities",
    paidById: "carlo",
    amount: 600_000,
    mode: "EQUAL",
    participants: everyone,
  },
  {
    date: "2026-11-13",
    description: "Habal-habal rides",
    categoryId: "transport",
    paidById: "dan",
    amount: 125_000,
    mode: "EQUAL",
    participants: everyone,
  },
  {
    date: "2026-11-14",
    description: "Surf lessons",
    categoryId: "activities",
    paidById: "ana",
    amount: 1_250_000,
    mode: "EQUAL",
    participants: everyone,
  },
  {
    date: "2026-11-14",
    description: "Dinner at Kermit",
    categoryId: "food",
    paidById: "you",
    amount: 486_000,
    mode: "EQUAL",
    participants: everyone,
  },
];

/** Expected results, straight from the spec. */
export const siargaoExpected = {
  total: 4_495_000,
  balances: {
    you: 1_375_300,
    ana: 339_300,
    carlo: -310_700,
    bea: -676_700,
    dan: -727_200,
  },
  simplified: [
    { from: "dan", to: "you", amount: 727_200 },
    { from: "bea", to: "you", amount: 648_100 },
    { from: "carlo", to: "ana", amount: 310_700 },
    { from: "bea", to: "ana", amount: 28_600 },
  ],
  pairwise: [
    { from: "dan", to: "you", amount: 432_200 },
    { from: "bea", to: "you", amount: 398_700 },
    { from: "carlo", to: "you", amount: 337_200 },
    { from: "dan", to: "ana", amount: 225_000 },
    { from: "ana", to: "you", amount: 207_200 },
    { from: "bea", to: "ana", amount: 191_500 },
    { from: "carlo", to: "ana", amount: 130_000 },
    { from: "dan", to: "carlo", amount: 95_000 },
    { from: "bea", to: "carlo", amount: 61_500 },
    { from: "bea", to: "dan", amount: 25_000 },
  ],
};

export const categories = [
  { id: "food", name: "Food & drink", icon: "utensils" },
  { id: "groceries", name: "Groceries", icon: "shopping-basket" },
  { id: "lodging", name: "Lodging", icon: "bed-double" },
  { id: "transport", name: "Transport", icon: "car" },
  { id: "activities", name: "Activities", icon: "ticket" },
  { id: "utilities", name: "Utilities", icon: "zap" },
  { id: "rent", name: "Rent", icon: "house" },
  { id: "shopping", name: "Shopping", icon: "shopping-bag" },
  { id: "other", name: "Other", icon: "receipt" },
] as const;
