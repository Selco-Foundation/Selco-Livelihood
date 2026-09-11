export interface EndUserSite {
  id: string;
  name: string;
  phoneNumber: string;
  stateCode: string;
  districtCode: string;
  blockCode: string;
  sectorCode: string;
}

// Mock end-user/facility registry — no real facility-registry integration
// exists yet. Every block in `boundary-data.ts` deliberately has two sites,
// so the project facility-ingestion template can be populated from the
// project's selected blocks during static UI development.
export const END_USER_SITES: EndUserSite[] = [
  {
    id: "ED/2026/0093",
    name: "Ananya Rao",
    phoneNumber: "9876501001",
    stateCode: "KA",
    districtCode: "BLR",
    blockCode: "BLR_EAST",
    sectorCode: "AGRICULTURE",
  },
  {
    id: "ED/2026/0094",
    name: "Vikram Shetty",
    phoneNumber: "9876501002",
    stateCode: "KA",
    districtCode: "BLR",
    blockCode: "BLR_EAST",
    sectorCode: "TEXTILE_CRAFTS",
  },
  {
    id: "ED/2026/0095",
    name: "Kavya Nair",
    phoneNumber: "9876501003",
    stateCode: "KA",
    districtCode: "BLR",
    blockCode: "BLR_SOUTH",
    sectorCode: "MICRO_BUSINESS",
  },
  {
    id: "ED/2026/0096",
    name: "Rohan Prakash",
    phoneNumber: "9876501004",
    stateCode: "KA",
    districtCode: "BLR",
    blockCode: "BLR_SOUTH",
    sectorCode: "AGRICULTURE",
  },
  {
    id: "ED/2026/0097",
    name: "Meera Kulkarni",
    phoneNumber: "9876501005",
    stateCode: "KA",
    districtCode: "MYS",
    blockCode: "MYS_NORTH",
    sectorCode: "AGRICULTURE",
  },
  {
    id: "ED/2026/0098",
    name: "Arjun Gowda",
    phoneNumber: "9876501006",
    stateCode: "KA",
    districtCode: "MYS",
    blockCode: "MYS_NORTH",
    sectorCode: "MICRO_BUSINESS",
  },
  {
    id: "ED/2026/0099",
    name: "Priya Iyer",
    phoneNumber: "9876501007",
    stateCode: "TN",
    districtCode: "CHN",
    blockCode: "CHN_CENTRAL",
    sectorCode: "TEXTILE_CRAFTS",
  },
  {
    id: "ED/2026/0100",
    name: "Karthik Raman",
    phoneNumber: "9876501008",
    stateCode: "TN",
    districtCode: "CHN",
    blockCode: "CHN_CENTRAL",
    sectorCode: "MICRO_BUSINESS",
  },
  {
    id: "ED/2026/0101",
    name: "Nandhini Selvam",
    phoneNumber: "9876501009",
    stateCode: "TN",
    districtCode: "CBE",
    blockCode: "CBE_SOUTH",
    sectorCode: "AGRICULTURE",
  },
  {
    id: "ED/2026/0102",
    name: "Suresh Kumar",
    phoneNumber: "9876501010",
    stateCode: "TN",
    districtCode: "CBE",
    blockCode: "CBE_SOUTH",
    sectorCode: "TEXTILE_CRAFTS",
  },
];
