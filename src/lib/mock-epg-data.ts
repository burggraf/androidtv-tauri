/** Mock data for the EPG guide — realistic coverage across full timeline */

export interface Channel {
  id: string;
  number: string;
  name: string;
  logo?: string;
}

export interface Program {
  id: string;
  channelId: string;
  title: string;
  startHour: number; // hours from midnight (e.g., 13.5 = 1:30 PM)
  durationHours: number;
  description?: string;
  thumbnail?: string;
}

export interface Category {
  id: string;
  name: string;
  channelIds: string[];
}

// Time helpers




// Mock channels (12 channels)
export const MOCK_CHANNELS: Channel[] = [
  { id: "ch1", number: "1", name: "US American Heroes Channel", logo: "TV" },
  { id: "ch2", number: "2", name: "US Antenna TV", logo: "TV" },
  { id: "ch3", number: "3", name: "US Cartoon Network", logo: "TV" },
  { id: "ch4", number: "4", name: "US CNN", logo: "TV" },
  { id: "ch5", number: "5", name: "US CNN (West)", logo: "TV" },
  { id: "ch6", number: "6", name: "US Comedy Central", logo: "CC" },
  { id: "ch7", number: "7", name: "US E! Entertainment", logo: "E!" },
  { id: "ch8", number: "8", name: "US Food Network", logo: "TV" },
  { id: "ch9", number: "9", name: "US Fox News", logo: "TV" },
  { id: "ch10", number: "10", name: "US HGTV", logo: "TV" },
  { id: "ch11", number: "11", name: "US History Channel", logo: "TV" },
  { id: "ch12", number: "12", name: "US Lifetime", logo: "TV" },
];

// Generate programs relative to current time for realistic coverage


// Helper to create programs for a channel
function createPrograms(channelId: string, programs: { title: string; start: number; dur: number; desc?: string }[]): Program[] {
  return programs.map((p, i) => ({
    id: `${channelId}_p${i}`,
    channelId,
    title: p.title,
    startHour: p.start,
    durationHours: p.dur,
    description: p.desc,
  }));
}

// Mock programs with full timeline coverage
export const MOCK_PROGRAMS: Program[] = [
  // Channel 1 - American Heroes (3 channels worth of content)
  ...createPrograms("ch1", [
    { title: "Codes and Conspiracies", start: 13, dur: 2, desc: "Fascinating facts about America's Founding Fathers reveal which one used sex as a weapon of diplomacy and which one engaged in the nation's greatest cover-up." },
    { title: "Declassified", start: 15, dur: 1.5, desc: "Classified operations from the Cold War era finally revealed." },
    { title: "War Stories", start: 16.5, dur: 1.5, desc: "Oliver North examines military history." },
    { title: "Patton 360", start: 18, dur: 1, desc: "The legendary general's battles examined in detail." },
    { title: "America's Heroes", start: 19, dur: 1, desc: "Profiles of American military heroes." },
  ]),

  // Channel 2 - Antenna TV
  ...createPrograms("ch2", [
    { title: "Too Close for Comfort", start: 13, dur: 1, desc: "Classic sitcom about a cartoonist and his family." },
    { title: "Family Ties", start: 14, dur: 1.5, desc: "Alex P. Keaton navigates conservative values in liberal San Francisco." },
    { title: "Three's Company", start: 15.5, dur: 1.5, desc: "Jack Tripper poses as gay to live with two women." },
    { title: "What's Happening!!", start: 17, dur: 1, desc: "Raj and his friends deal with high school life." },
    { title: "Good Times", start: 18, dur: 1, desc: "The Evans family struggles in Chicago projects." },
    { title: "Maude", start: 19, dur: 1, desc: "Bea Arthur stars as the outspoken Maude Findlay." },
  ]),

  // Channel 3 - Cartoon Network
  ...createPrograms("ch3", [
    { title: "Regular Show", start: 13, dur: 1, desc: "Mordecai and Rigby's surreal adventures at the park." },
    { title: "Ed, Edd n Eddy", start: 14, dur: 1.5, desc: "Three friends scheme to get jawbreaker money." },
    { title: "Bob's Burgers", start: 15.5, dur: 1.5, desc: "The Belcher family runs a struggling burger restaurant." },
    { title: "Teen Titans Go!", start: 17, dur: 1, desc: "The young heroes deal with everyday problems." },
    { title: "Adventure Time", start: 18, dur: 1, desc: "Finn and Jake explore the Land of Ooo." },
    { title: "Steven Universe", start: 19, dur: 1, desc: "Steven learns to control his magical gem powers." },
  ]),

  // Channel 4 - CNN
  ...createPrograms("ch4", [
    { title: "The Arena With Kasie Hunt", start: 13, dur: 1.5, desc: "Political news and analysis with Kasie Hunt." },
    { title: "The Lead With Jake Tapper", start: 14.5, dur: 1.5, desc: "Breaking news coverage from Jake Tapper." },
    { title: "The Situation Room", start: 16, dur: 2, desc: "Wolf Blitzer reports on the day's top stories." },
    { title: "Erin Burnett OutFront", start: 18, dur: 1, desc: "Erin Burnett examines the day's news." },
    { title: "Anderson Cooper 360", start: 19, dur: 1, desc: "Anderson Cooper's in-depth reporting." },
  ]),

  // Channel 5 - CNN West
  ...createPrograms("ch5", [
    { title: "The Arena With Kasie Hunt", start: 13, dur: 1.5, desc: "Political news and analysis." },
    { title: "The Lead With Jake Tapper", start: 14.5, dur: 1.5, desc: "Breaking news coverage." },
    { title: "The Situation Room", start: 16, dur: 2, desc: "West coast edition of Wolf Blitzer's show." },
    { title: "Erin Burnett OutFront", start: 18, dur: 1, desc: "Evening news analysis." },
    { title: "Anderson Cooper 360", start: 19, dur: 1, desc: "West coast edition." },
  ]),

  // Channel 6 - Comedy Central
  ...createPrograms("ch6", [
    { title: "Seinfeld", start: 13, dur: 1, desc: "The show about nothing continues to entertain." },
    { title: "The Office", start: 14, dur: 1.5, desc: "Michael Scott and the Dunder Mifflin crew." },
    { title: "South Park", start: 15.5, dur: 1, desc: "Stan, Kyle, Cartman, and Kenny's misadventures." },
    { title: "Key & Peele", start: 16.5, dur: 1, desc: "Comedy sketches by Keegan-Michael Key and Jordan Peele." },
    { title: "The Daily Show", start: 17.5, dur: 1, desc: "Late-night satire and political commentary." },
    { title: "Chappelle's Show", start: 18.5, dur: 1, desc: "Dave Chappelle's groundbreaking sketch comedy." },
    { title: "Broad City", start: 19.5, dur: 0.5, desc: "Abbi and Ilana navigate NYC." },
  ]),

  // Channel 7 - E! Entertainment
  ...createPrograms("ch7", [
    { title: "Harry Potter and the Goblet of Fire", start: 13, dur: 3, desc: "The fourth Harry Potter film brings the Triwizard Tournament." },
    { title: "The Kardashians", start: 16, dur: 1, desc: "Reality show following the famous family." },
    { title: "Total Bellas", start: 17, dur: 1, desc: "The Bella twins navigate life and wrestling." },
    { title: "E! News", start: 18, dur: 1, desc: "Entertainment news and celebrity updates." },
    { title: "Botched", start: 19, dur: 1, desc: "Plastic surgery makeovers and transformations." },
  ]),

  // Channel 8 - Food Network
  ...createPrograms("ch8", [
    { title: "Chopped", start: 13, dur: 1, desc: "Chefs compete with mystery basket ingredients." },
    { title: "Diners, Drive-Ins and Dives", start: 14, dur: 1, desc: "Guy Fieri visits America's best casual eateries." },
    { title: "Beat Bobby Flay", start: 15, dur: 1, desc: "Chefs try to defeat the Iron Chef." },
    { title: "The Kitchen", start: 16, dur: 1, desc: "Five food experts share recipes and tips." },
    { title: "Pioneer Woman", start: 17, dur: 1, desc: "Ree Drummond cooks for her family on the ranch." },
    { title: "Good Eats", start: 18, dur: 1, desc: "Alton Brown explores the science of cooking." },
    { title: "Iron Chef America", start: 19, dur: 1, desc: "Top chefs battle in the Kitchen Stadium." },
  ]),

  // Channel 9 - Fox News
  ...createPrograms("ch9", [
    { title: "The Five", start: 13, dur: 2, desc: "Panel discussion of the day's top stories." },
    { title: "Special Report", start: 15, dur: 1, desc: "Bret Baier reports on Washington." },
    { title: "Tucker Carlson Tonight", start: 16, dur: 1, desc: "Political commentary and interviews." },
    { title: "Hannity", start: 17, dur: 1, desc: "Sean Hannity's opinion show." },
    { title: "The Ingraham Angle", start: 18, dur: 1, desc: "Laura Ingraham's take on current events." },
    { title: "Gutfeld!", start: 19, dur: 1, desc: "Greg Gutfeld's late-night satire." },
  ]),

  // Channel 10 - HGTV
  ...createPrograms("ch10", [
    { title: "Fixer Upper", start: 13, dur: 1, desc: "Chip and Joanna Gaines renovate homes in Waco." },
    { title: "Property Brothers", start: 14, dur: 1, desc: "Drew and Jonathan Scott help families find homes." },
    { title: "House Hunters", start: 15, dur: 1, desc: "Families search for their perfect home." },
    { title: "Love It or List It", start: 16, dur: 1, desc: "Homeowners decide whether to renovate or move." },
    { title: "Flip or Flop", start: 17, dur: 1, desc: "Tarek and Christina flip houses for profit." },
    { title: "Beachfront Bargain Hunt", start: 18, dur: 1, desc: "Families hunt for coastal properties." },
    { title: "Holmes on Homes", start: 19, dur: 1, desc: "Mike Holmes fixes botched renovations." },
  ]),

  // Channel 11 - History Channel
  ...createPrograms("ch11", [
    { title: "Ancient Aliens", start: 13, dur: 1, desc: "Theories about extraterrestrial influence on ancient civilizations." },
    { title: "Forged in Fire", start: 14, dur: 1, desc: "Bladesmiths compete to create the best weapon." },
    { title: "Pawn Stars", start: 15, dur: 1, desc: "The Gold & Silver Pawn Shop in Las Vegas." },
    { title: "Ice Road Truckers", start: 16, dur: 1, desc: "Truckers brave dangerous ice roads in Alaska." },
    { title: "American Pickers", start: 17, dur: 1, desc: "Mike and Frank hunt for vintage treasures." },
    { title: "Vikings", start: 18, dur: 1, desc: "The saga of Ragnar Lothbrok and his sons." },
    { title: "The Curse of Oak Island", start: 19, dur: 1, desc: "Treasure hunters search for buried riches." },
  ]),

  // Channel 12 - Lifetime
  ...createPrograms("ch12", [
    { title: "A Mother's Sacrifice", start: 13, dur: 2, desc: "Drama film about a mother's love." },
    { title: "Married at First Sight", start: 15, dur: 1, desc: "Couples meet for the first time at their wedding." },
    { title: "Little Women: Atlanta", start: 16, dur: 1, desc: "Reality show about women with dwarfism." },
    { title: "Dance Moms", start: 17, dur: 1, desc: "Young dancers compete under Abby Lee Miller." },
    { title: "Project Runway", start: 18, dur: 1, desc: "Fashion designers compete for a spot at NYFW." },
    { title: "UnREAL", start: 19, dur: 1, desc: "Behind-the-scenes drama of a dating reality show." },
  ]),
];

// Mock categories
export const MOCK_CATEGORIES: Category[] = [
  { id: "cat-fav", name: "Favorites", channelIds: ["ch1", "ch2", "ch3", "ch4", "ch5", "ch6", "ch7"] },
  { id: "cat-usa", name: "USA", channelIds: ["ch1", "ch2", "ch3", "ch4", "ch5", "ch6", "ch7", "ch8", "ch9", "ch10", "ch11", "ch12"] },
  { id: "cat-news", name: "USA | NEWS | REGIONALS", channelIds: ["ch4", "ch5", "ch9"] },
  { id: "cat-entertainment", name: "ENTERTAINMENT", channelIds: ["ch1", "ch2", "ch3", "ch6", "ch7"] },
  { id: "cat-lifestyle", name: "LIFESTYLE", channelIds: ["ch8", "ch10"] },
];

export const MOCK_PROVIDER_NAME = "Maureen";
