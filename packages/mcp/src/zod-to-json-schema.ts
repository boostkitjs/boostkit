import type { ZodLikeObject } from './types.js'

/**
 * Minimal Zod-to-JSON-Schema converter for MCP tool input schemas.
 *
 * Covers the types tools actually use: primitives, arrays, optional/default,
 * enum, nested objects, unions, literals, nullable, date, record, tuple.
 *
 * Supports both Zod v3 (`_def.typeName: "ZodString"`) and Zod v4
 * (`_def.type: "string"`) internal representations.
 */
export function zodToJsonSchema(schema: ZodLikeObject): Record<string, unknown> {
  const shape = schema.shape
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const [key, value] of Object.entries(shape)) {
    const field = value as ZodField
    properties[key] = zodTypeToJson(field)

    if (!isOptional(field)) {
      required.push(key)
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  }
}

type ZodField = { _def?: Record<string, unknown>; description?: unknown; shape?: Record<string, unknown> }

function zodTypeToJson(field: ZodField): Record<string, unknown> {
  const def = (field as unknown as { _def: Record<string, unknown> })._def ?? {}

  // Zod v3 uses `def.typeName` (e.g. "ZodString").
  // Zod v4 uses `def.type` (e.g. "string").
  const typeName = def['typeName'] as string | undefined
  const typeTag  = def['type']     as string | undefined
  const kind     = normalizeKind(typeName, typeTag)

  const description = getDescription(field, def)
  const withDesc = (body: Record<string, unknown>): Record<string, unknown> =>
    description ? { ...body, description } : body

  switch (kind) {
    case 'string':
      return withDesc({ type: 'string' })
    case 'number':
      return withDesc({ type: 'number' })
    case 'boolean':
      return withDesc({ type: 'boolean' })
    case 'date':
      // No native JSON Schema "date"; tools that send dates over MCP serialize
      // to ISO strings, so date-time is the right format hint.
      return withDesc({ type: 'string', format: 'date-time' })
    case 'array': {
      // v3: def.type is the element; v4: def.element
      const elem = (def['element'] ?? def['type']) as ZodField
      return withDesc({ type: 'array', items: elem ? zodTypeToJson(elem) : {} })
    }
    case 'optional':
    case 'default':
    case 'nullable':
      // Optional/default just unwrap. Nullable also unwraps but adds "null" to
      // the type union — JSON Schema's way to allow null alongside another type.
      {
        const inner = zodTypeToJson(def['innerType'] as ZodField)
        if (kind !== 'nullable') return inner
        const t = inner['type']
        if (typeof t === 'string') return withDesc({ ...inner, type: [t, 'null'] })
        if (Array.isArray(t) && !t.includes('null')) return withDesc({ ...inner, type: [...t, 'null'] })
        return withDesc(inner)
      }
    case 'enum': {
      // v3: def.values is an array; v4: def.entries is a record { key: key }
      const values = Array.isArray(def['values'])
        ? (def['values'] as string[])
        : Object.values((def['entries'] ?? {}) as Record<string, string>)
      return withDesc({ type: 'string', enum: values })
    }
    case 'literal': {
      // v3: single `value`; v4: `values` array (allows multiple literals).
      const single = def['value']
      const list = def['values'] as unknown[] | undefined
      if (Array.isArray(list) && list.length > 1) return withDesc({ enum: list })
      const v = single ?? list?.[0]
      return withDesc({ const: v })
    }
    case 'union': {
      const options = (def['options'] ?? []) as ZodField[]
      return withDesc({ anyOf: options.map((o) => zodTypeToJson(o)) })
    }
    case 'object': {
      // Nested object — recurse via the converter entry point. Both v3 and v4
      // expose `.shape` on the schema instance (v3 also has `_def.shape` as a
      // thunk we don't need to call).
      const inner = zodToJsonSchema(field as unknown as ZodLikeObject)
      return description ? { ...inner, description } : inner
    }
    case 'record': {
      // JSON Schema models a string-keyed map as an object with
      // additionalProperties. Drop keyType — it's almost always string.
      const valueType = def['valueType'] as ZodField | undefined
      return withDesc({
        type: 'object',
        additionalProperties: valueType ? zodTypeToJson(valueType) : true,
      })
    }
    case 'tuple': {
      // JSON Schema 2020-12: prefixItems for fixed-position items, items: false
      // to disallow extras. (Older draft used `items: [...]` — prefixItems is
      // what the MCP TS SDK / Anthropic clients accept.)
      const items = (def['items'] ?? []) as ZodField[]
      return withDesc({
        type: 'array',
        prefixItems: items.map((i) => zodTypeToJson(i)),
        items: false,
      })
    }
    default:
      return withDesc({ type: 'string' })
  }
}

function normalizeKind(typeName: string | undefined, typeTag: string | undefined): string | undefined {
  if (typeName) {
    // Strip "Zod" prefix and lowercase first letter — ZodString → "string"
    const stripped = typeName.replace(/^Zod/, '')
    return stripped.charAt(0).toLowerCase() + stripped.slice(1)
  }
  return typeTag
}

/** Zod v3 stores `.describe()` in `_def.description`; v4 stores it on the instance. */
function getDescription(field: ZodField, def: Record<string, unknown>): string | undefined {
  const fromDef = def['description']
  if (typeof fromDef === 'string') return fromDef
  const fromInstance = field.description
  if (typeof fromInstance === 'string') return fromInstance
  return undefined
}

function isOptional(field: ZodField): boolean {
  const def = (field as unknown as { _def: Record<string, unknown> })._def ?? {}
  const typeName = def['typeName'] as string | undefined
  const typeTag  = def['type']     as string | undefined
  const kind = normalizeKind(typeName, typeTag)
  // ZodNullable is intentionally NOT here — nullable means the field is present
  // but its value can be null. JSON Schema separates required from nullability.
  return kind === 'optional' || kind === 'default'
}
