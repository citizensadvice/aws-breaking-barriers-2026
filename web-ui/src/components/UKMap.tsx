import { useEffect, useState } from 'react'

interface UKMapProps {
  postcode?: string
  className?: string
}

interface Coordinates {
  lat: number
  lng: number
  postcode: string
  region?: string
}

const UKMap = ({ postcode, className = '' }: UKMapProps) => {
  const [coords, setCoords] = useState<Coordinates | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!postcode || postcode.trim().length < 2) {
      setCoords(null)
      setError(null)
      return
    }

    const lookupPostcode = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.trim())}`)
        const data = await res.json()
        if (data.status === 200 && data.result) {
          setCoords({
            lat: data.result.latitude,
            lng: data.result.longitude,
            postcode: data.result.postcode,
            region: data.result.region || data.result.country
          })
        } else {
          setError('Postcode not found')
          setCoords(null)
        }
      } catch {
        setError('Could not lookup postcode')
        setCoords(null)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(lookupPostcode, 500)
    return () => clearTimeout(debounce)
  }, [postcode])

  // Use CSS filter to create dark theme map
  const lat = coords?.lat ?? 54.5
  const lng = coords?.lng ?? -2
  
  const mapUrl = coords 
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.05},${lat-0.03},${lng+0.05},${lat+0.03}&layer=mapnik&marker=${lat},${lng}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=-8,50,2,59&layer=mapnik`

  return (
    <div className={`uk-map-container ${className}`}>
      {loading && <div className="uk-map-loading">Looking up location...</div>}
      {error && <div className="uk-map-error">{error}</div>}
      <iframe
        title="Your location on map"
        src={mapUrl}
        style={{ border: 0, width: '100%', height: '100%' }}
        allowFullScreen
        loading="lazy"
      />
      {!postcode && (
        <div className="uk-map-hint">Add your postcode in your profile to see your location</div>
      )}
    </div>
  )
}

export default UKMap
