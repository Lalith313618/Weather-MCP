export interface SubRegionInfo {
  name: string;
  cities: string[];
}

export interface RegionInfo {
  name: string;
  defaultCities: string[];
  subRegions?: Record<string, SubRegionInfo>;
}

export const REGIONAL_DESTINATIONS: Record<string, RegionInfo> = {
  tamilnadu: {
    name: 'Tamil Nadu',
    defaultCities: ['Kodaikanal', 'Madurai', 'Ooty', 'Kanniyakumari', 'Rameswaram', 'Chennai', 'Coimbatore'],
    subRegions: {
      south: {
        name: 'South Districts of Tamil Nadu',
        cities: ['Madurai', 'Kodaikanal', 'Kanniyakumari', 'Rameswaram', 'Tirunelveli', 'Tenkasi']
      },
      north: {
        name: 'North Districts of Tamil Nadu',
        cities: ['Chennai', 'Mahabalipuram', 'Kanchipuram', 'Vellore']
      },
      west: {
        name: 'West / Kongu Region of Tamil Nadu',
        cities: ['Ooty', 'Coimbatore', 'Yercaud', 'Pollachi']
      },
      central: {
        name: 'Central / Delta Region of Tamil Nadu',
        cities: ['Tiruchirappalli', 'Thanjavur', 'Kumbakonam']
      }
    }
  },
  kerala: {
    name: 'Kerala',
    defaultCities: ['Munnar', 'Wayanad', 'Kochi', 'Varkala', 'Alappuzha'],
    subRegions: {
      south: {
        name: 'South Kerala',
        cities: ['Thiruvananthapuram', 'Varkala', 'Kovalam', 'Kollam']
      },
      central: {
        name: 'Central Kerala',
        cities: ['Munnar', 'Kochi', 'Alappuzha', 'Thekkady']
      },
      north: {
        name: 'North Kerala',
        cities: ['Wayanad', 'Kozhikode', 'Kannur']
      }
    }
  },
  karnataka: {
    name: 'Karnataka',
    defaultCities: ['Madikeri', 'Mysuru', 'Chikmagalur', 'Gokarna', 'Bengaluru'],
    subRegions: {
      south: {
        name: 'South Karnataka',
        cities: ['Madikeri', 'Mysuru', 'Chikmagalur', 'Bengaluru']
      },
      coastal: {
        name: 'Coastal Karnataka',
        cities: ['Gokarna', 'Mangaluru', 'Udupi']
      },
      north: {
        name: 'North Karnataka',
        cities: ['Hampi', 'Hubballi', 'Belagavi']
      }
    }
  },
  maharashtra: {
    name: 'Maharashtra',
    defaultCities: ['Lonavala', 'Mahabaleshwar', 'Pune', 'Mumbai', 'Nashik', 'Alibag'],
    subRegions: {
      south: {
        name: 'South / Western Maharashtra',
        cities: ['Mahabaleshwar', 'Pune', 'Lonavala']
      },
      coastal: {
        name: 'Coastal Maharashtra',
        cities: ['Mumbai', 'Alibag']
      }
    }
  },
  goa: {
    name: 'Goa',
    defaultCities: ['Panaji', 'Calangute', 'Margao', 'Vagator']
  },
  rajasthan: {
    name: 'Rajasthan',
    defaultCities: ['Udaipur', 'Jaipur', 'Jodhpur', 'Mount Abu', 'Jaisalmer']
  },
  himachal: {
    name: 'Himachal Pradesh',
    defaultCities: ['Shimla', 'Manali', 'Dharamshala', 'Kasauli']
  },
  uttarakhand: {
    name: 'Uttarakhand',
    defaultCities: ['Rishikesh', 'Mussoorie', 'Nainital', 'Dehradun']
  },
  andhra: {
    name: 'Andhra Pradesh',
    defaultCities: ['Visakhapatnam', 'Tirupati', 'Vijayawada']
  },
  telangana: {
    name: 'Telangana',
    defaultCities: ['Hyderabad', 'Warangal']
  }
};

export interface HillStationInfo {
  city: string;
  state: string;
  region: 'south' | 'north' | 'west' | 'east';
  tagline: string;
  topTouristSpots: string[];
}

export const HILL_STATIONS: HillStationInfo[] = [
  // South India
  {
    city: 'Munnar',
    state: 'Kerala',
    region: 'south',
    tagline: 'Kashmir of South India & Tea Gardens Capital',
    topTouristSpots: [
      'Eravikulam National Park (Nilgiri Tahr sightings)',
      'Mattupetty Dam & Echo Point boating',
      'Top Station & Cloud-covered mountain peaks',
      'Tea Museum & Endless green plantation trails'
    ]
  },
  {
    city: 'Ooty',
    state: 'Tamil Nadu',
    region: 'south',
    tagline: 'Queen of Hill Stations & Nilgiri Toy Train',
    topTouristSpots: [
      'Government Botanical Garden (historic 55-acre flora)',
      'Doddabetta Peak (highest viewpoint at 2,637 m)',
      'Pykara Lake, Boathouse & Cascading Waterfalls',
      'Nilgiri Mountain Railway heritage ride'
    ]
  },
  {
    city: 'Kodaikanal',
    state: 'Tamil Nadu',
    region: 'south',
    tagline: 'Princess of Hill Stations & Misty Lakes',
    topTouristSpots: [
      'Coaker\'s Walk & Pine Forest misty valley trails',
      'Star-shaped Kodai Lake cycling & row boating',
      'Pillar Rocks & mysterious Guna Caves',
      'Bryant Park landscaped horticultural walks'
    ]
  },
  {
    city: 'Wayanad',
    state: 'Kerala',
    region: 'south',
    tagline: 'Misty Mountains & Wilderness Trails',
    topTouristSpots: [
      'Banasura Sagar Dam (India\'s largest earthen dam)',
      'Chembra Peak & heart-shaped natural lake trek',
      'Edakkal Caves prehistoric stone-age petroglyphs',
      'Lakkidi View Point & Thusharagiri Waterfalls'
    ]
  },
  {
    city: 'Coorg',
    state: 'Karnataka',
    region: 'south',
    tagline: 'Scotland of India & Aromatic Coffee Country',
    topTouristSpots: [
      'Abbey Falls roaring amidst lush coffee estates',
      'Raja\'s Seat historic musical sunset viewpoint',
      'Dubare Elephant Camp river interactions',
      'Namdroling Golden Temple (Tibetan Monastery)'
    ]
  },
  {
    city: 'Chikmagalur',
    state: 'Karnataka',
    region: 'south',
    tagline: 'Coffee Cradle & Karnataka\'s Highest Peak',
    topTouristSpots: [
      'Mullayanagiri Peak (Karnataka\'s highest elevation at 1,930 m)',
      'Baba Budangiri sacred mountain range & caves',
      'Hebbe Falls two-tiered cascades & Z Point trek',
      'Aromatic Arabica coffee plantation tours'
    ]
  },
  {
    city: 'Yercaud',
    state: 'Tamil Nadu',
    region: 'south',
    tagline: 'Jewel of the Shevaroy Hills',
    topTouristSpots: [
      'Yercaud Emerald Lake & Deer Park promenade',
      'Lady\'s Seat & Gent\'s Seat panoramic cliff viewpoints',
      'Shevaroy Temple at the highest point',
      'Kiliyur Falls & Pagoda Point'
    ]
  },
  {
    city: 'Vagamon',
    state: 'Kerala',
    region: 'south',
    tagline: 'Serene Pine Forests & Rolling Meadows',
    topTouristSpots: [
      'Vagamon Pine Forest whispers & canopy walk',
      'Kurisumala Ashram & pristine dairy farms',
      'Marmala Waterfalls natural jungle pool',
      'Vagamon Glass Bridge & adventure park'
    ]
  },

  // North India
  {
    city: 'Manali',
    state: 'Himachal Pradesh',
    region: 'north',
    tagline: 'Valley of the Gods & Snow Adventures',
    topTouristSpots: [
      'Solang Valley paragliding & zorbing adventures',
      'Rohtang Pass high-altitude snow & glacier panoramas',
      'Hadimba Devi 16th-century cedar forest temple',
      'Old Manali riverside cafes & apple orchard trails'
    ]
  },
  {
    city: 'Shimla',
    state: 'Himachal Pradesh',
    region: 'north',
    tagline: 'Summer Capital & Majestic Colonial Architecture',
    topTouristSpots: [
      'The Ridge & Mall Road pedestrian promenade',
      'Jakhoo Temple hill & giant Hanuman statue',
      'Kufri Himalayan nature park & panoramic snow views',
      'Christ Church neo-Gothic heritage marvel'
    ]
  },
  {
    city: 'Dharamshala',
    state: 'Himachal Pradesh',
    region: 'north',
    tagline: 'Spiritual Sanctuary & Dhauladhar Mountain Views',
    topTouristSpots: [
      'McLeod Ganj & Tsuglagkhang Dalai Lama residence',
      'Bhagsunag Waterfall & scenic mountain trail',
      'Triund Trek ridge beneath the Dhauladhar peaks',
      'HPCA Cricket Stadium scenic sports arena'
    ]
  },
  {
    city: 'Mussoorie',
    state: 'Uttarakhand',
    region: 'north',
    tagline: 'Queen of the Garhwal Hills',
    topTouristSpots: [
      'Kempty Falls famous natural swimming cascades',
      'Gun Hill cable car mountain lookout',
      'Camel\'s Back Road peaceful sunset walk',
      'Lal Tibba highest viewpoint over Himalayan peaks'
    ]
  },
  {
    city: 'Nainital',
    state: 'Uttarakhand',
    region: 'north',
    tagline: 'Lake Paradise of the Kumaon Himalayas',
    topTouristSpots: [
      'Emerald Naini Lake yachting & paddle boating',
      'Snow View Point cable car vistas of Nanda Devi',
      'Tiffin Top (Dorothy\'s Seat) hilltop picnic spot',
      'Naina Devi Temple on the northern lake shore'
    ]
  },
  {
    city: 'Mahabaleshwar',
    state: 'Maharashtra',
    region: 'west',
    tagline: 'Strawberry Capital & Western Ghats Panoramas',
    topTouristSpots: [
      'Arthur\'s Seat (Queen of Points) deep canyon lookouts',
      'Venna Lake pedal boating & equestrian rides',
      'Elephant\'s Head Point & Kate\'s Point rock formations',
      'Mapro Garden fresh strawberry picking & treats'
    ]
  },
  {
    city: 'Lonavala',
    state: 'Maharashtra',
    region: 'west',
    tagline: 'Misty Waterfalls & Sahyadri Mountain Forts',
    topTouristSpots: [
      'Tiger\'s Leap sheer cliff lookout over green valleys',
      'Bhushi Dam overflowing steps & waterfalls',
      'Karla & Bhaja ancient rock-cut Buddhist caves',
      'Rajmachi Point & scenic Khandala viewpoints'
    ]
  },

  {
    city: 'Darjeeling',
    state: 'West Bengal',
    region: 'east',
    tagline: 'Queen of the Himalayas & Champagne of Teas',
    topTouristSpots: [
      'Tiger Hill sunrise over Mt. Kanchenjunga',
      'Batasia Loop & Gorkha War Memorial',
      'Darjeeling Himalayan Toy Train UNESCO heritage',
      'Happy Valley 1854 heritage tea estate'
    ]
  },
  {
    city: 'Gangtok',
    state: 'Sikkim',
    region: 'east',
    tagline: 'Land of Monasteries & Alpine Lakes',
    topTouristSpots: [
      'Tsomgo Glacial Lake (3,753 m altitude) & Yak rides',
      'Rumtek Dharma Chakra Centre monastery',
      'Nathula Pass mountain trade route at 4,310 m',
      'MG Marg pedestrian boulevard & flower exhibitions'
    ]
  },
  {
    city: 'Shillong',
    state: 'Meghalaya',
    region: 'east',
    tagline: 'Scotland of the East & Cascading Falls',
    topTouristSpots: [
      'Elephant Falls three-tiered mountain drop',
      'Umiam Lake expansive blue waters & water sports',
      'Shillong Peak highest viewpoint over the plateau',
      'Ward\'s Lake horse-shoe wooden bridge & cherry blossoms'
    ]
  }
];
