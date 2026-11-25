const { createApp } = Vue;
const TOWNS = [
  { id: 'agbara',   name: 'Agbara',              lat: 6.505, lon: 3.100 },
  { id: 'igbesa',   name: 'Igbesa',              lat: 6.534, lon: 3.134 },
  { id: 'crawford', name: 'Crawford University', lat: 6.529, lon: 3.136 },
];

const TIMEZONE = 'Africa/Lagos';
const WEATHER_CODES = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
  80: 'Light showers', 81: 'Showers', 82: 'Violent showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with hail',
};

function describe(code) {
  return WEATHER_CODES[code] || 'Unknown';
}

function fmt(value, digits = 0) {
  if (value == null || isNaN(value)) return '—';
  return Number(value).toFixed(digits);
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function weatherUrl(lat, lon) {
  return 'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
    latitude: lat, longitude: lon, timezone: TIMEZONE, forecast_days: 7,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
    hourly: 'precipitation,precipitation_probability',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
  });
}

const HEAVY_MM = 20; 

function fmtHour(time) {
  const hour = Number(time.slice(11, 13));
  return (hour % 12 || 12) + ' ' + (hour < 12 ? 'AM' : 'PM');
}

function findStart(times, nowTime) {
  return times.findIndex((t) => t >= nowTime.slice(0, 13) + ':00');
}

const AQI_BANDS = [
  { max: 50,       label: 'Good',                           color: '#6fbf8a' },
  { max: 100,      label: 'Moderate',                       color: '#e0c25a' },
  { max: 150,      label: 'Unhealthy for sensitive groups', color: '#e39a4c' },
  { max: 200,      label: 'Unhealthy',                      color: '#d65f4a' },
  { max: 300,      label: 'Very unhealthy',                 color: '#a05aa8' },
  { max: Infinity, label: 'Hazardous',                      color: '#c0536a' },
];

function aqiBand(value) {
  if (value == null) return null;
  return AQI_BANDS.find((band) => value <= band.max);
}

function airUrl(lat, lon) {
  return 'https://air-quality-api.open-meteo.com/v1/air-quality?' + new URLSearchParams({
    latitude: lat, longitude: lon, timezone: TIMEZONE, forecast_days: 2,
    current: 'us_aqi,pm10,pm2_5,nitrogen_dioxide',
    hourly: 'us_aqi',
  });
}

  return TOWNS[0].id;
}

createApp({
  data() {
    return {
      TOWNS,
      townId: savedTownId(),

      weather: null,
      loading: false,

      HEAVY_MM,

      air: null,


  computed: {
    town() {
      return TOWNS.find((t) => t.id === this.townId);
    },

    cur() {
      return this.weather ? this.weather.current : null;
    },

    days() {
      if (!this.weather) return [];
      const d = this.weather.daily;
      return d.time.map((date, i) => {
        const rain = d.precipitation_sum[i] || 0;
        return {
          date,
          label: i === 0 ? 'Today' : new Date(date + 'T12:00:00').toLocaleDateString('en-NG', { weekday: 'short' }),
          rain,
          pop: d.precipitation_probability_max[i],
          hi: d.temperature_2m_max[i],
          lo: d.temperature_2m_min[i],
          heavy: rain >= HEAVY_MM,
        };
      });
    },

    rainScale() {
      return Math.max(HEAVY_MM * 1.25, ...this.days.map((d) => d.rain));
    },

    weekTotal() {
      return this.days.reduce((sum, d) => sum + d.rain, 0);
    },


    heavyDays() {
      return this.days.filter((d) => d.heavy).length;
    },

    hours() {
      if (!this.weather) return [];
      const h = this.weather.hourly;
      const start = findStart(h.time, this.weather.current.time);
      if (start < 0) return [];
      const count = Math.min(24, h.time.length - start);
      const list = [];
      for (let i = 0; i < count; i++) {
        list.push({
          time: h.time[start + i],
          pop: h.precipitation_probability[start + i],
          mm: h.precipitation[start + i],
        });
      }
      return list;
    },

    rainOutlook() {
      if (!this.hours.length) return 'Loading the next 24 hours…';
      const firstWet = this.hours.find((h) => h.mm >= 0.2);
      if (!firstWet) return 'No rain expected in the next 24 hours.';
      if (firstWet.time === this.hours[0].time) return 'Rain is likely right now or within the hour.';
      return 'Rain expected from about ' + fmtHour(firstWet.time) + '.';
    },
    
    aqi() {
      return this.air ? this.air.current.us_aqi : null;
    },

    band() {
      return aqiBand(this.aqi);
    },
    
    airHours() {
      if (!this.air) return [];
      const h = this.air.hourly;
      const start = findStart(h.time, this.air.current.time);
      if (start < 0) return [];
      const count = Math.min(24, h.time.length - start);
      const list = [];
      for (let i = 0; i < count; i++) {
        const value = h.us_aqi[start + i];
        list.push({ time: h.time[start + i], value, band: aqiBand(value) });
      }
      return list;
    },
  },

  watch: {
    townId(id) {
      this.weather = null;
      this.air = null;
      try {
        localStorage.setItem('subterrain-town', id);
      } catch (e) {
        // ignore
      }
      this.load();
    },
  },

  methods: {
    describe,
    fmt,
    fmtHour,

    async load() {
      const askedFor = this.townId;
      const { lat, lon } = this.town;
      this.loading = true;

      const [w, a] = await Promise.allSettled([
        getJson(weatherUrl(lat, lon)),
        getJson(airUrl(lat, lon)),
      ]);

     
 
