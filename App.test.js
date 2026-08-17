// Define mock KEYWORDS mapping identical to App.js for isolation testing
const KEYWORDS = {
  rudraksha:  ["शिवाय", "shivaya", "shivaay", "namah shivaya", "namah"],
  tulsi_jai:  ["सियाराम", "siyaram", "jai siya", "jai ram", "जय राम"],
  tulsi_hare: ["कृष्ण", "krishna", "hare krishna", "हरे राम", "hare rama"],
  chandan:    ["वासुदेवाय", "vasudev", "bhagwate", "vasudevaaya", "नमो"],
  crystal:    ["श्रीं", "shreem", "shrim", "श्री", "shree"],
  kamalgatta: ["महालक्ष्मी", "mahalakshmi", "lakshmi", "mahalakshmyai"],
  karungali:  ["मुरुगा", "muruga", "murugan"],
};

function getKeywords(malaId, tulsiMantra) {
  if (malaId === "tulsi") return KEYWORDS[tulsiMantra === "jaisiyaram" ? "tulsi_jai" : "tulsi_hare"];
  return KEYWORDS[malaId] || [];
}

function matchesMantra(transcript, malaId, tulsiMantra) {
  const kws = getKeywords(malaId, tulsiMantra);
  const t   = transcript.toLowerCase().replace(/\s+/g, "");
  const ts  = transcript.toLowerCase().trim();
  return kws.some((kw) => t.includes(kw.toLowerCase().replace(/\s+/g,"")) || ts.includes(kw.toLowerCase().trim()));
}

describe("Jaap Mala Mantra Recognition Logic", () => {

  test("should match Rudraksha keywords correctly", () => {
    expect(matchesMantra("Om Namah Shivaya", "rudraksha")).toBe(true);
    expect(matchesMantra("शिवाय नमः", "rudraksha")).toBe(true);
    expect(matchesMantra("shivaay", "rudraksha")).toBe(true);
    expect(matchesMantra("Hello how are you shivaya", "rudraksha")).toBe(true);
    
    // Non-matching words
    expect(matchesMantra("Om Namo Narayanaya", "rudraksha")).toBe(false);
    expect(matchesMantra("Siya Ram", "rudraksha")).toBe(false);
  });

  test("should match Tulsi (Jai Siya Ram) keywords correctly", () => {
    expect(matchesMantra("Jai Siya Ram", "tulsi", "jaisiyaram")).toBe(true);
    expect(matchesMantra("सियाराम जय", "tulsi", "jaisiyaram")).toBe(true);
    
    // Should not match Hare Krishna when Jai Siya Ram is chosen
    expect(matchesMantra("Hare Krishna", "tulsi", "jaisiyaram")).toBe(false);
  });

  test("should match Tulsi (Hare Krishna) keywords correctly", () => {
    expect(matchesMantra("Hare Krishna Hare Rama", "tulsi", "harekrishna")).toBe(true);
    expect(matchesMantra("हरे राम", "tulsi", "harekrishna")).toBe(true);
    
    // Should not match Siya Ram when Hare Krishna is chosen
    expect(matchesMantra("Siya Ram", "tulsi", "harekrishna")).toBe(false);
  });

  test("should match Chandan keywords correctly", () => {
    expect(matchesMantra("Om Namo Bhagavate Vasudevaya", "chandan")).toBe(true);
    expect(matchesMantra("वासुदेवाय नमः", "chandan")).toBe(true);
    expect(matchesMantra("Random speech vasudev", "chandan")).toBe(true);
    expect(matchesMantra("Shree Ram", "chandan")).toBe(false);
  });

  test("should match Karungali keywords correctly", () => {
    expect(matchesMantra("Om Muruga", "karungali")).toBe(true);
    expect(matchesMantra("मुरुगा नमः", "karungali")).toBe(true);
    expect(matchesMantra("Shiva", "karungali")).toBe(false);
  });

  test("should match Crystal (Shreem) keywords correctly", () => {
    expect(matchesMantra("Om Shreem Namaha", "crystal")).toBe(true);
    expect(matchesMantra("श्रीम", "crystal")).toBe(true);
    expect(matchesMantra("Om Namah Shivaya", "crystal")).toBe(false);
  });
});
