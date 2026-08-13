// GPS capture with an optional best-effort reverse-geocoding lookup.
function getGPSLocation() {
  const gpsBtn = document.getElementById('gpsBtn');
  const gpsInput = document.getElementById('gps_location');

  if (!confirm('Save the current location (latitude and longitude) to this device\'s VFX record?')) return;
  if (!navigator.geolocation) {
    alert('GPS is not supported by your browser/device.');
    return;
  }

  gpsBtn.innerText = 'Locating...';
  gpsBtn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    async position => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      const altitude = position.coords.altitude ? `${Math.round(position.coords.altitude)}m` : '';
      const coordinates = `${lat}, ${lng}${altitude ? ` / ${altitude}` : ''}`;
      gpsInput.value = coordinates;
      gpsBtn.innerText = '📍 Get GPS';
      gpsBtn.disabled = false;

      if (!navigator.onLine) return;
      gpsBtn.innerText = 'Finding place…';
      gpsBtn.disabled = true;
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`, {
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const { address = {} } = await response.json();
        const place = [
          address.road || address.pedestrian || address.neighbourhood,
          address.suburb || address.city_district,
          address.city || address.town || address.village || address.municipality,
          address.state,
          address.country
        ].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(', ');
        if (place) gpsInput.value = `${coordinates} / ${place}`;
      } catch (error) {
        console.info('Place-name lookup unavailable; saved coordinates only.', error);
      } finally {
        gpsBtn.innerText = '📍 Get GPS';
        gpsBtn.disabled = false;
      }
    },
    error => {
      alert(`GPS Error: ${error.message}`);
      gpsBtn.innerText = '📍 Get GPS';
      gpsBtn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}
