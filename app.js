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
