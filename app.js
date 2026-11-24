const { createApp } = Vue;
const TOWNS = [
  { id: 'agbara',   name: 'Agbara',              lat: 6.505, lon: 3.100 },
  { id: 'igbesa',   name: 'Igbesa',              lat: 6.534, lon: 3.134 },
  { id: 'crawford', name: 'Crawford University', lat: 6.529, lon: 3.136 },
];

createApp({
  data() {
    return {
      TOWNS,
      townId: savedTownId(),
       };
  },

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
    watch: {
    townId(id) {
      this.weather = null;
      this.air = null;
      try {
        localStorage.setItem('subterrain-town', id);
      } catch (e) {
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
