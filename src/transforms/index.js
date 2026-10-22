// Transformation rule plugins.
//
// To add a rule, drop a new .js file in this folder — it registers itself
// automatically (no other file needs editing). To remove a rule, delete
// its file. Each file must default-export a definition:
//
//   export default {
//     id: 'unique_id',            // required — stable key used on canvas nodes
//     label: 'Palette label',     // required — shown on the palette card + node header
//     description: 'short hint',  // optional — shown under the label in the palette
//     apply: (value) => newValue, // required — the transformation; return null/undefined for "no value"
//   }
const modules = import.meta.glob('./*.js', { eager: true })

const TRANSFORMS = {}
for (const [path, mod] of Object.entries(modules)) {
  if (path.endsWith('/index.js')) continue
  const t = mod.default
  if (t && typeof t.id === 'string' && typeof t.apply === 'function') TRANSFORMS[t.id] = t
}

export const TRANSFORM_LIST = Object.values(TRANSFORMS)
export default TRANSFORMS
