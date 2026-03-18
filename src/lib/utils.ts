export type ClassDictionary = Record<string, boolean | null | undefined>

export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassDictionary
  | ClassValue[]

function flattenClassValue(value: ClassValue, tokens: string[]) {
  if (!value) return

  if (typeof value === "string" || typeof value === "number") {
    tokens.push(String(value))
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => flattenClassValue(item, tokens))
    return
  }

  Object.entries(value).forEach(([key, enabled]) => {
    if (enabled) tokens.push(key)
  })
}

export function cn(...inputs: ClassValue[]) {
  const tokens: string[] = []
  inputs.forEach((input) => flattenClassValue(input, tokens))

  return [...new Set(tokens.join(" ").split(/\s+/).filter(Boolean))].join(" ")
}
