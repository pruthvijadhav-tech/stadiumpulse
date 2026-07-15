export const stadiumData = {
  stadiumName: "MetLife Stadium (East Rutherford, NJ) - World Cup 2026 Arena",
  capacity: 82500,
  languages: ["en", "es"], // English and Spanish
  
  // Match Information
  matches: [
    {
      id: "match-1",
      teams: { home: "USA", away: "England" },
      stage: "Group Stage - Group A",
      date: "2026-07-07",
      time: "20:00 EST",
      status: "Upcoming (Doors open in 2 hours)"
    }
  ],

  // Zones with real-time density simulation targets
  zones: {
    "Gate A": {
      name: "Gate A (North Entrance)",
      type: "gate",
      currentWaitTime: 12, // in minutes
      density: 45, // percentage 0-100 (green)
      amenities: ["Security", "Ticketing", "First Aid"]
    },
    "Gate B": {
      name: "Gate B (East Entrance)",
      type: "gate",
      currentWaitTime: 35, // in minutes (red/high congestion)
      density: 85,
      amenities: ["Security", "Ticketing", "VIP Lounge"]
    },
    "Gate C": {
      name: "Gate C (South Entrance)",
      type: "gate",
      currentWaitTime: 8, // in minutes (green)
      density: 20,
      amenities: ["Security", "Ticketing"]
    },
    "Gate D": {
      name: "Gate D (West Entrance)",
      type: "gate",
      currentWaitTime: 22, // in minutes (yellow)
      density: 65,
      amenities: ["Security", "Ticketing", "Information Desk"]
    },
    "Concourse North": {
      name: "Concourse North",
      type: "concourse",
      density: 50, // yellow
      amenities: ["Restrooms North A", "Taco Stand", "FIFA Fan Shop", "Beer Garden"]
    },
    "Concourse South": {
      name: "Concourse South",
      type: "concourse",
      density: 78, // red
      amenities: ["Restrooms South A", "Hotdog Arena", "Hydration Station 1", "Medical Station 2"]
    },
    "Section 100": {
      name: "Lower Bowl (Sections 100-199)",
      type: "seating",
      density: 72, // red
      amenities: ["Beverage Express", "Restrooms Section 120"]
    },
    "Section 200": {
      name: "Club Level (Sections 200-299)",
      type: "seating",
      density: 40, // green
      amenities: ["VIP Lounge", "Gourmet Burgers", "Restrooms Section 214"]
    },
    "Section 300": {
      name: "Suite Level (Sections 300-399)",
      type: "seating",
      density: 30, // green
      amenities: ["Executive Restrooms", "Premium Bar"]
    },
    "Section 400": {
      name: "Upper Bowl (Sections 400-499)",
      type: "seating",
      density: 58, // yellow
      amenities: ["Hydration Station 2", "Snack Bar A", "Restrooms Section 410"]
    }
  },

  // Static directions/FAQ database for LLM context grounding
  amenitiesDetails: {
    restrooms: [
      { id: "restroom-1", name: "Restrooms North A", location: "Concourse North, near Section 112", gender: "All", hasChanger: true },
      { id: "restroom-2", name: "Restrooms South A", location: "Concourse South, near Section 134", gender: "All", hasChanger: true },
      { id: "restroom-3", name: "Restrooms Section 120", location: "Section 100, near Gate A", gender: "Men/Women", hasChanger: false },
      { id: "restroom-4", name: "Restrooms Section 214", location: "Section 200, near VIP Lounge", gender: "All", hasChanger: true },
      { id: "restroom-5", name: "Restrooms Section 410", location: "Section 400, near Hydration Station 2", gender: "Men/Women", hasChanger: false }
    ],
    foodStalls: [
      { id: "food-1", name: "Taco Stand", location: "Concourse North", cuisine: "Mexican", popularItem: "Carnitas Tacos", waitTime: 5 },
      { id: "food-2", name: "Beer Garden", location: "Concourse North", cuisine: "Beverages", popularItem: "Budweiser / Local Craft", waitTime: 12 },
      { id: "food-3", name: "Hotdog Arena", location: "Concourse South", cuisine: "American Fast Food", popularItem: "Jumbo Stadium Dog", waitTime: 18 },
      { id: "food-4", name: "Gourmet Burgers", location: "Section 200", cuisine: "Gourmet Burgers", popularItem: "Truffle Fries & Cheeseburger", waitTime: 15 },
      { id: "food-5", name: "Snack Bar A", location: "Section 400", cuisine: "Snacks", popularItem: "Pretzels & Nachos", waitTime: 4 }
    ],
    hydrationStations: [
      { id: "hydro-1", name: "Hydration Station 1", location: "Concourse South, near Section 130", details: "Free filtered water refills, cups provided" },
      { id: "hydro-2", name: "Hydration Station 2", location: "Section 400, near Section 420", details: "Free filtered water refills, cups provided" }
    ],
    medicalStations: [
      { id: "med-1", name: "Medical Station 1", location: "Gate A, Main Concourse", phone: "+1-201-555-0199" },
      { id: "med-2", name: "Medical Station 2", location: "Concourse South, Section 140", phone: "+1-201-555-0122" }
    ]
  },

  // Parking & Transit Guide
  transit: {
    parkingLots: [
      { id: "lot-gold", name: "Gold Lot (VIP & Pre-booked)", occupancy: "95%", walkTime: "5 mins to Gate B" },
      { id: "lot-silver", name: "Silver Lot (Public)", occupancy: "75%", walkTime: "12 mins to Gate A" },
      { id: "lot-bronze", name: "Bronze Lot (Public)", occupancy: "40%", walkTime: "18 mins to Gate D" }
    ],
    publicTransit: {
      train: {
        name: "Meadowlands Station Rail Link",
        frequency: "Every 10 mins post-match",
        nextDeparture: "Direct transit to NYC Penn Station running continuously",
        location: "Outside Gate C"
      },
      shuttle: {
        name: "FIFA Fan Zone Shuttle",
        frequency: "Every 15 mins",
        location: "Outside Gate D"
      }
    }
  }
};
