import { isCrossOriginWrite } from "./http";

describe("isCrossOriginWrite", () => {
  const HOST = "localhost:3000";

  it("never blocks safe methods, even cross-origin", () => {
    expect(isCrossOriginWrite("GET", "http://evil.com", HOST)).toBe(false);
    expect(isCrossOriginWrite("HEAD", "http://evil.com", HOST)).toBe(false);
    expect(isCrossOriginWrite("OPTIONS", "http://evil.com", HOST)).toBe(false);
  });

  it("allows same-origin writes", () => {
    expect(
      isCrossOriginWrite("POST", "http://localhost:3000", HOST),
    ).toBe(false);
  });

  it("blocks cross-origin writes", () => {
    expect(isCrossOriginWrite("POST", "http://evil.com", HOST)).toBe(true);
    expect(
      isCrossOriginWrite("POST", "https://localhost:3000", "localhost:3001"),
    ).toBe(true);
  });

  it("allows writes with no Origin (non-browser clients can't be CSRF'd)", () => {
    expect(isCrossOriginWrite("POST", null, HOST)).toBe(false);
  });

  it("treats a malformed Origin as hostile", () => {
    expect(isCrossOriginWrite("POST", "not-a-url", HOST)).toBe(true);
  });

  it("is case-insensitive on the method", () => {
    expect(isCrossOriginWrite("post", "http://localhost:3000", HOST)).toBe(
      false,
    );
    expect(isCrossOriginWrite("get", "http://evil.com", HOST)).toBe(false);
  });
});
