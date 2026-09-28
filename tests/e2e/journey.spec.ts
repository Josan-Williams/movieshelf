// The main user journey, in a real browser (desktop and mobile viewport).
import { expect, test } from "@playwright/test";

test("protected pages redirect to sign-in when logged out", async ({ page }) => {
  await page.goto("/collection");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("sign up, search, add, rate, see collection and activity, sign out", async ({ page }, info) => {
  const email = `e2e-${info.project.name}-${Date.now()}@example.com`;

  // Sign up
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/search$/);
  expect(page.url()).not.toContain("password"); // regression test for the GET-form bug (AI log row 8)

  // Search by director + genre
  await page.getByRole("textbox", { name: "Director" }).fill("Christopher Nolan");
  await page.getByRole("combobox", { name: "Genre" }).selectOption({ label: "Science Fiction" });
  await page.getByRole("button", { name: "Search", exact: true }).first().click();
  await expect(page.getByText("directed by Christopher Nolan")).toBeVisible();
  await page.getByRole("link", { name: /Inception/ }).click();

  // Details: add to collection and rate
  await expect(page).toHaveURL(/\/movies\/27205$/);
  await page.getByRole("button", { name: "Add to collection" }).click();
  await expect(page.getByText("Added to your collection.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove from collection" })).toBeVisible();
  await page.getByLabel("Rating (1 to 10)").selectOption("8");
  await page.getByLabel("Review (optional)").fill("Great in a browser too.");
  await page.getByRole("button", { name: "Save rating" }).click();
  await expect(page.getByText("Rating saved.")).toBeVisible();
  await expect(page.getByText("8/10", { exact: true })).toBeVisible();

  // Collection shows the movie with my rating
  await page.getByRole("link", { name: "My collection" }).click();
  await expect(page.getByText("Your rating: 8/10")).toBeVisible();

  // AI search without a key uses the fallback and says so
  await page.getByRole("link", { name: "Search" }).click();
  await page.getByLabel("Natural-language search").fill("sci-fi by Christopher Nolan");
  await page.getByRole("button", { name: "Search", exact: true }).last().click();
  await expect(page.getByText(/Basic search \(AI unavailable\) understood/)).toBeVisible();

  // Activity lists what just happened
  await page.getByRole("link", { name: "Activity" }).click();
  for (const label of ["Created account", "Added to collection", "Rated a movie", "AI search"]) {
    await expect(page.getByRole("cell", { name: label, exact: true }).first()).toBeVisible();
  }

  // Sign out
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/activity");
  await expect(page).toHaveURL(/\/sign-in$/);
});
