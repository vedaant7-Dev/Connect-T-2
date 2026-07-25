const OFFICIAL_NAGARSEVAK_ENGLISH_NAMES: Record<number, string> = {
  1: "Karjule Patil Tejashree Vishwajeet",
  2: "Gaikwad Dinesh Dharamdas",
  3: "Gaikar Sangeeta Kisan",
  4: "Patil Darshana Umesh",
  5: "Patil Pradeep Nana",
  6: "Gaikwad Kabir Naresh",
  7: "Rasal Archana Charan",
  8: "Walekar Meena Suresh",
  9: "Singh Meenu Ravindra",
  10: "Walekar Pavan Suresh",
  11: "Bhoir Shailesh Shalik",
  12: "Chaubey Kiran Pramodkumar",
  13: "Surve Reshma Dharmanjay",
  14: "Aathav Dilip Bhausaheb",
  15: "Bagul Sunita Rajendra",
  16: "Karjule Ravindra Sarjerao",
  17: "Gejge Rupali Vinayak",
  18: "Walekar Rajendra Shivaling",
  19: "Patil Tejaswini Milind",
  20: "Rathod Kiran Badrinath",
  21: "Gaikwad Deepa Ajit",
  22: "Someshwar Vikas Hemraj",
  23: "Devde Sanjeevani Rahul",
  24: "Patil Vipul Pradeep",
  25: "Mhatre Manish Shantaram",
  26: "Jaishankar Dhanalakshmi Jaishankar",
  27: "Patil Harshada Pankaj",
  28: "Abdul Gulampir Sheikh",
  29: "Bharade Sandeep Vasant",
  30: "Gore Alpana Yogesh",
  31: "Karjule Abhijit Gulabrao",
  32: "Thete Vaishali Jagdish",
  33: "Telange Sandeep Ananta",
  34: "Bhoir Rohini Manish",
  35: "Shelar Meera Vinod",
  36: "Patil Sadashiv Hendar",
  37: "Manchekar Shamala Mallappa",
  38: "Mohorikar Amruta Ajay",
  39: "Ugale Veena Purushottam",
  40: "Chaudhary Nikhil Sunil",
  41: "Bhoir Kunal Subhash",
  42: "Aparna Kunal Bhoir",
  43: "Phulare Mahesh Kashinath",
  44: "Jyotsna Chandrakant Bhoir",
  45: "Bhoir Sujata Dilip",
  46: "Bhoir Anita Prakash",
  47: "Rukade Pallavi Sandeep",
  48: "Manoj Namdev Gunjal",
  49: "Kothekar Ranjana Deepak",
  50: "Bagul Swapnil Arun",
  51: "Waringe Pandharinath Laxman",
  52: "Gundekar Reshma Sameer",
  53: "Patil Sunita Tanaji",
  54: "Patil Sachin Sadashiv",
  55: "Patil Swati Atish",
  56: "Gunjal Sachin Shantaram",
  57: "Rinjad Monika Shridhar",
  58: "Patil Poonam Rakesh",
  59: "Waghe Sunil Baliram",
  60: "Sorkhade Payal Kishor",
  61: "Vishwajeet Gulabrao Karjule",
  62: "Umesh Ananta Patil",
  63: "Maruti Amruta Dere",
  64: "Subhash Narayan Salunkhe",
  65: "Rohit Raju Mahadik",
};

const DEVANAGARI_CONSONANTS: Record<string, string> = {
  क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "ng",
  च: "ch", छ: "chh", ज: "j", झ: "jh", ञ: "ny",
  ट: "t", ठ: "th", ड: "d", ढ: "dh", ण: "n",
  त: "t", थ: "th", द: "d", ध: "dh", न: "n",
  प: "p", फ: "ph", ब: "b", भ: "bh", म: "m",
  य: "y", र: "r", ल: "l", व: "v", श: "sh",
  ष: "sh", स: "s", ह: "h", ळ: "l",
};

const DEVANAGARI_VOWELS: Record<string, string> = {
  अ: "a", आ: "aa", इ: "i", ई: "ee", उ: "u", ऊ: "oo",
  ऋ: "ri", ए: "e", ऐ: "ai", ओ: "o", औ: "au",
};

const DEVANAGARI_MATRAS: Record<string, string> = {
  ा: "aa", ि: "i", ी: "ee", ु: "u", ू: "oo", ृ: "ri",
  े: "e", ै: "ai", ो: "o", ौ: "au",
};

function transliterateWord(word: string) {
  const prepared = word.replace(/क्ष/g, "KSH").replace(/ज्ञ/g, "DNY").replace(/श्र/g, "SHR");
  const chars = Array.from(prepared);
  let result = "";

  for (let index = 0; index < chars.length; index += 1) {
    const character = chars[index];
    if (/[A-Z]/.test(character)) {
      result += character.toLowerCase();
      continue;
    }
    if (DEVANAGARI_VOWELS[character]) {
      result += DEVANAGARI_VOWELS[character];
      continue;
    }
    const consonant = DEVANAGARI_CONSONANTS[character];
    if (consonant) {
      const next = chars[index + 1];
      if (DEVANAGARI_MATRAS[next]) {
        result += consonant + DEVANAGARI_MATRAS[next];
        index += 1;
      } else if (next === "्") {
        result += consonant;
        index += 1;
      } else {
        result += `${consonant}a`;
      }
      continue;
    }
    if (character === "ं" || character === "ँ") result += "n";
    else if (character === "ः") result += "h";
    else if (character !== "़") result += character;
  }

  const cleaned = result.replace(/aa+/g, "aa").replace(/a$/u, "");
  return cleaned ? `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}` : word;
}

export function officialNagarsevakEnglishName(sourceSerial?: number | null): string | undefined {
  if (!sourceSerial) return undefined;
  return OFFICIAL_NAGARSEVAK_ENGLISH_NAMES[sourceSerial];
}

export function nagarsevakEnglishDisplayName(originalName: string, sourceSerial?: number | null): string {
  const officialName = officialNagarsevakEnglishName(sourceSerial);
  if (officialName) return officialName;
  if (!/[\u0900-\u097F]/u.test(originalName)) return originalName;
  return originalName.split(/\s+/).filter(Boolean).map(transliterateWord).join(" ");
}

export { OFFICIAL_NAGARSEVAK_ENGLISH_NAMES };
