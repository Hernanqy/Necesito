const fs = require('fs')

const file = 'src/App.tsx'
const backup = 'src/App.tsx.backup-gemini-utf8'

fs.copyFileSync(file, backup)

let s = fs.readFileSync(file, 'utf8')

const stateMarker = "  const [showSplash, setShowSplash] = useState(true)\n"

if (!s.includes("const [isSearching, setIsSearching] = useState(false)")) {
  if (!s.includes(stateMarker)) {
    throw new Error("No se encontro el bloque de estados")
  }

  s = s.replace(
    stateMarker,
    stateMarker + "  const [isSearching, setIsSearching] = useState(false)\n"
  )
}

if (!s.includes("async function performSearch(value = search)")) {
  const start = s.indexOf("  function performSearch(value = search) {")
  const end = s.indexOf("  function goHome() {", start)

  if (start < 0 || end < 0) {
    throw new Error("No se encontro performSearch")
  }

  const newFunction = `  async function performSearch(value = search) {
    const clean = value.trim()

    if (!clean || isSearching) return

    setIsSearching(true)

    try {
      const response = await fetch('/api/interpretar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ texto: clean }),
      })

      if (!response.ok) {
        throw new Error('AI search failed')
      }

      const interpreted = await response.json()

      const interpretedTerm =
        typeof interpreted?.termino === 'string'
          ? interpreted.termino.trim()
          : ''

      setSearch(clean)
      setQuery(interpretedTerm || clean)
      setView('results')
      setSelectedProduct(null)
      setSelectedService(null)
      setSelectedBusiness(null)
    } catch (error) {
      console.error('AI search error:', error)

      setSearch(clean)
      setQuery(clean)
      setView('results')
      setSelectedProduct(null)
      setSelectedService(null)
      setSelectedBusiness(null)
    } finally {
      setIsSearching(false)
    }
  }

`

  s = s.slice(0, start) + newFunction + s.slice(end)
}

fs.writeFileSync(file, s, 'utf8')

console.log('OK - App.tsx restaurado y Gemini conectado')
console.log('Backup creado:', backup)
