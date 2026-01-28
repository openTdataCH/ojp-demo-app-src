// Map stops that have levels underground, based on Jan export of OSM data, 
//    full list here https://gist.github.com/vasile/faf7ec203299026719173d7ffce0ea25
export const MapStopsLevelsUnderground: Record<string, number> = {
  // Bern RBS
  'ch:1:sloid:7000:500:21': -2,
  'ch:1:sloid:7000:500:22': -2,
  'ch:1:sloid:7000:501:23': -2,
  'ch:1:sloid:7000:501:24': -2,

  // Zürich HB 31-34
  'ch:1:sloid:3000:500:31': -4,
  'ch:1:sloid:3000:500:32': -4,
  'ch:1:sloid:3000:501:33': -4,
  'ch:1:sloid:3000:501:34': -4,

  // Zürich HB 21-22
  'ch:1:sloid:3088:0:99992': -2,
  'ch:1:sloid:3088:0:82204': -2,

  // Zürich HB 41-44
  'ch:1:sloid:3000:502:41': -3,
  'ch:1:sloid:3000:502:42': -3,
  'ch:1:sloid:3000:503:43': -3,
  'ch:1:sloid:3000:503:44': -3,

  // Locarno FART
  'ch:1:sloid:5470::38503': -2,
  'ch:1:sloid:5470::38504': -2,
  'ch:1:sloid:5470:0:38501': -2,
  'ch:1:sloid:5470::38501': -2,
  'ch:1:sloid:5470::38502': -2,

  // Zürich, Tierspital
  'ch:1:sloid:91393::0': -2,
  'ch:1:sloid:91393::1': -2,

  // Zürich, Waldgarten
  'ch:1:sloid:91420::1': -1,
  'ch:1:sloid:91420::0': -1,

  // Zürich, Ueberlandpark
  'ch:1:sloid:91343::0': -2,
  'ch:1:sloid:91343::1': -2,

  // Stettbach
  'ch:1:sloid:3147:1:1': -2,
  'ch:1:sloid:3147:1:2': -2,

  // Zürich Flughafen
  'ch:1:sloid:3016:1:1': -2,
  'ch:1:sloid:3016:1:2': -2,
  'ch:1:sloid:3016:2:3': -2,
  'ch:1:sloid:3016:2:4': -2,

  // Lausanne Metro
  // Lausanne, En Marin
  'ch:1:sloid:4171:0:292': -2,
  'ch:1:sloid:4171:0:300': -2,
  // Lausanne, Croisettes
  'ch:1:sloid:79239:0:523': -1,
  'ch:1:sloid:79239:0:513': -1,
  // Lausanne, Fourmi
  'ch:1:sloid:92048:0:654': -3,
  'ch:1:sloid:92048:0:649': -3,
  // Lausanne, Sallaz
  'ch:1:sloid:79238:0:754': -1,
  'ch:1:sloid:79238:0:758': -1,
  // Lausanne, Ours
  'ch:1:sloid:79237:0:834': -2,
  'ch:1:sloid:79237:0:835': -2,
  // Lausanne, Bessières
  'ch:1:sloid:89523:0:892': -2,
  'ch:1:sloid:89523:0:890': -2,
  // Lausanne, Riponne - Maurice Béjart
  'ch:1:sloid:90442:0:1026': -2,
  'ch:1:sloid:90442:0:1025': -2,
  // Lausanne-Flon
  'ch:1:sloid:1181:0:1083': -1,
  'ch:1:sloid:1181:0:1082': -1,
  // Lausanne-Flon
  'ch:1:sloid:91818:0:1063': -2,
  'ch:1:sloid:91818:0:1061': -2,
  'ch:1:sloid:91818:0:1108': -1,
  // Lausanne-Gare
  'ch:1:sloid:92050:0:1101': -1,
  'ch:1:sloid:92050:0:1096': -1,
  // Lausanne, Jordils
  'ch:1:sloid:92061:0:1159': -1,
  'ch:1:sloid:92061:0:1161': -1,
  // Lausanne-Chauderon
  'ch:1:sloid:1160:0:1193': -4,
  'ch:1:sloid:1160:0:1191': -4,
  // Lausanne, Vigie
  'ch:1:sloid:92133:0:1214': -1,

  // Basel Dreispitz
  'ch:1:sloid:136:1:1': -1,
  'ch:1:sloid:136:2:2': -1,

  // Genève-Eaux-Vives
  'ch:1:sloid:16273:1:1': -1,
  'ch:1:sloid:16273:1:2': -1,

  // Genève-Aéroport
  'ch:1:sloid:1026:1:1': -2,
  'ch:1:sloid:1026:1:2': -2,
  'ch:1:sloid:1026:2:3': -2,
  'ch:1:sloid:1026:2:4': -2,
};
