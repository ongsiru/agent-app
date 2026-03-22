export function extractFirstJsonBlock(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const startObj = text.indexOf("{");
  const endObj = text.lastIndexOf("}");
  if (startObj >= 0 && endObj > startObj) {
    return text.slice(startObj, endObj + 1);
  }

  throw new Error(`Could not find JSON object in model output:\n${text.slice(0, 500)}`);
}

export function parseJsonObject<T>(text: string): T {
  const json = extractFirstJsonBlock(text);
  return JSON.parse(json) as T;
}
