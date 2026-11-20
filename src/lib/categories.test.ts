import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { categories } from "./categories";

it("every category has a row in the Category migration", () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      "prisma/migrations/20261121000000_category_rows/migration.sql",
    ),
    "utf8",
  );
  for (const { id, name, icon } of categories) {
    expect(sql).toContain(`('${id}', '${name}', '${icon}')`);
  }
});
