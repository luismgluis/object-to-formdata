export type Options = {
  indices?: boolean;
  nullsAsUndefineds?: boolean;
  booleansAsIntegers?: boolean;
  allowEmptyArrays?: boolean;
  noAttributesWithArrayNotation?: boolean;
  noFilesWithArrayNotation?: boolean;
  dotsForObjectNotation?: boolean;
  getObj?: (obj: Record<string, any>) => void
};

export function serialize<T = {}>(
  object: T,
  options?: Options,
  existingFormData?: FormData,
  keyPrefix?: string,
): FormData;
