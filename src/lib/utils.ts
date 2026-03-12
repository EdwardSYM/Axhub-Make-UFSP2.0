type ClassDictionary = Record<string, boolean | null | undefined>;
type ClassValue = ClassArray | ClassDictionary | number | string | false | null | undefined;
type ClassArray = ClassValue[];

function collectClassNames(value: ClassValue, result: string[]): void {
  if (!value) return;

  if (typeof value === 'string' || typeof value === 'number') {
    result.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectClassNames(item, result));
    return;
  }

  Object.entries(value).forEach(([className, enabled]) => {
    if (enabled) result.push(className);
  });
}

export function cn(...inputs: ClassValue[]): string {
  const classNames: string[] = [];

  inputs.forEach((input) => collectClassNames(input, classNames));

  return classNames.join(' ');
}
