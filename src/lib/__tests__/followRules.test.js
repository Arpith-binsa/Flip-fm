import { describe, it, expect } from "vitest";
import { canFollow } from "../followRules";

describe("canFollow", () => {
  it("returns false when the ids are the same (self-follow)", () => {
    expect(canFollow("user-1", "user-1")).toBe(false);
  });

  it("returns true for two different users", () => {
    expect(canFollow("user-1", "user-2")).toBe(true);
  });

  it("returns false when either id is missing", () => {
    expect(canFollow(null, "user-2")).toBe(false);
    expect(canFollow("user-1", null)).toBe(false);
    expect(canFollow(undefined, undefined)).toBe(false);
  });
});
