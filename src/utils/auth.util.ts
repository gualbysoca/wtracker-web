const textEncoder = new TextEncoder();

/** Constant-time comparison of a `Authorization: Bearer <token>` header against the expected token. */
export const hasValidBearerToken = (request: Request, expectedToken: string | undefined): boolean => {
  if (!expectedToken) return false;

  const header = request.headers.get("Authorization") ?? "";
  const providedToken = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  const provided = textEncoder.encode(providedToken);
  const expected = textEncoder.encode(expectedToken);
  if (provided.byteLength !== expected.byteLength) return false;

  return (crypto.subtle as unknown as { timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): boolean }).timingSafeEqual(
    provided,
    expected,
  );
};
