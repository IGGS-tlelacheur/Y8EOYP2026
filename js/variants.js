/* Which of the six dataset variants a student gets.
   Derived from their studentId, so it is the same on any laptop, on any day, and
   after any number of cleared caches. Nothing about it is random or stored. */

export const VARIANT_COUNT = 6;

export function assignVariant(studentId) {
  if (typeof studentId !== 'string' || studentId.length < 8) {
    throw new Error('assignVariant needs a full studentId hash');
  }
  return parseInt(studentId.slice(0, 8), 16) % VARIANT_COUNT;
}

/* Pulls one student's slice out of a datasets.json entry. Throws rather than
   falling back to variant 0: a missing variant is a data bug, and silently
   handing six students the same numbers would hide it until the vault codes clash. */
export function variantOf(set, variant) {
  const chosen = set?.variants?.[variant];
  if (!chosen) throw new Error(`no variant ${variant} in dataset`);
  return chosen;
}
