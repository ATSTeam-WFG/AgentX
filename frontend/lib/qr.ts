export interface QrPayload {
  tp: string;
  sig: string;
}

export function parseQrParams(searchParams: URLSearchParams): QrPayload | null {
  const tp = searchParams.get('tp');
  const sig = searchParams.get('sig');
  if (!tp || !sig) return null;
  return { tp, sig };
}
