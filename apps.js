/* Harbor - app registry and data helpers.
 * To add a new app: add one entry to HARBOR_APPS below, push, done.
 *   id        short unique id
 *   name      shown on the tile
 *   tag       one-line description
 *   url       where the app lives (leave "" and set status:"soon" if not live yet)
 *   emoji     tile icon
 *   color     [from, to] gradient colours
 *   group     "learn" (school apps) or "home" (family / around the house)
 *   subject   "math" | "words" | null  -> links the app to progress shown in the Parent area
 *   parentParam  query string appended to open the app's own parent/teacher view
 *   status    "live" | "soon"
 *   progress  "ea" for apps whose progress Harbor reads from the family's _ea record (Math/Words use subject instead)
 *   familyGroup  "pantry" for Our Kitchen / Our Home: they use their own WORD-1234 family code (set in Parent > Settings), not the Math/Words one.
 *   mic       true if the app uses the microphone. In the native app these always open in the browser window
 *             (Harbor has no microphone permission of its own). Works inside the frame on the website.
 *   open      optional: "frame" (inside Harbor) or "browser" (system browser / Custom Tab). Default: browser in the
 *             native app, frame on the web. A parent can override this in Parent area > Settings.
 */
window.HARBOR_APPS = [
  { id: "math", name: "Math Adventure", tag: "Numbers, games & puzzles", url: "https://math.jacobsiler.com",
    emoji: "🧮", color: ["#2D6BE4", "#1F4FB5"], group: "learn", subject: "math", parentParam: "view=parent", status: "live" },
  { id: "words", name: "Words Adventure", tag: "Letters, words & stories", url: "https://words.jacobsiler.com",
    emoji: "📚", color: ["#0FBF94", "#0A8F70"], group: "learn", subject: "words", parentParam: "view=parent", status: "live" },
  { id: "electronics", name: "Electronics Adventure", tag: "Circuits, logic & making", url: "https://electronics.jacobsiler.com",
    emoji: "⚡", color: ["#E69A00", "#B36B00"], group: "learn", subject: null, progress: "ea", parentParam: "view=parent", status: "live" },
  { id: "music", name: "Music Adventure", tag: "Listen, play & wonder", url: "https://music.jacobsiler.com",
    emoji: "🎼", color: ["#6B4FD8", "#4a31a0"], group: "learn", subject: null, progress: "mu", parentParam: "view=parent", status: "live" },
  // Sight Singing is hosted on Firebase Hosting for now. When it gets its new name and domain, change url (and name) here.
  { id: "sing", name: "Sight Singing", tag: "Read and sing music", url: "https://homeschool-math.web.app/",
    emoji: "🎵", color: ["#9B6BE4", "#6F43B8"], group: "learn", subject: null, parentParam: "", mic: true, status: "live" },
  { id: "home", name: "Our Home", tag: "Our family's home base", url: "https://home.jacobsiler.com",
    emoji: "🏡", color: ["#3E9FA8", "#2B7A83"], group: "home", subject: null, parentParam: "", familyGroup: "pantry", status: "live" },
  { id: "kitchen", name: "Our Kitchen", tag: "Pantry, meals & shopping", url: "https://kitchen.jacobsiler.com",
    emoji: "🍳", color: ["#FF7A6B", "#D9493A"], group: "home", subject: null, parentParam: "", familyGroup: "pantry", status: "live" },
  { id: "fueld", name: "Fueld", tag: "Athletic nutrition & training", url: "https://fueld.jacobsiler.com",
    emoji: "🥗", color: ["#7CB82F", "#55871A"], group: "home", subject: null, parentParam: "", status: "live" },
  { id: "forge", name: "Forge Planner", tag: "Plan, focus & get things done", url: "https://forge.jacobsiler.com",
    emoji: "🗓️", color: ["#F29B38", "#C77413"], group: "home", subject: null, parentParam: "", status: "live" }
];

/* Words Adventure topic keys. Anything not in this list is treated as a Math topic. */
window.HARBOR_WORD_TOPICS = new Set(("american_lit argument british_lit character classical compare compound_words context_clues " +
  "early_colours early_letters early_rhyme early_sight early_story essay figurative grammar_adv inference lit_crit " +
  "literary_devices long_vowels main_idea paragraph parts_of_speech phonics_blends plot_structure poetry_adv poetry_basics " +
  "pov prefixes_suffixes punctuation research rhetoric rhyme_families shakespeare short_vowels sight_words_k2 " +
  "simple_sentences spelling story_elements syntax text_evidence theme vocab_context world_lit").split(" "));

/* Grade ids used by Math and Words -> label per country. */
window.HARBOR_GRADES = {
  PS: { IE: "Nursery", UK: "Nursery", US: "Nursery" }, PK: { IE: "Pre-School", UK: "Pre-School", US: "Pre-K" },
  K: { IE: "Junior Infants", UK: "Reception", US: "Kindergarten" },
  1: { IE: "1st Class", UK: "Year 2", US: "Grade 1" }, 2: { IE: "2nd Class", UK: "Year 3", US: "Grade 2" },
  3: { IE: "3rd Class", UK: "Year 4", US: "Grade 3" }, 4: { IE: "4th Class", UK: "Year 5", US: "Grade 4" },
  5: { IE: "5th Class", UK: "Year 6", US: "Grade 5" }, 6: { IE: "6th Class", UK: "Year 7", US: "Grade 6" },
  7: { IE: "1st Year", UK: "Year 8", US: "Grade 7" }, 8: { IE: "2nd Year", UK: "Year 9", US: "Grade 8" },
  9: { IE: "3rd Year", UK: "Year 10", US: "Grade 9" }, 10: { IE: "TY / 4th Year", UK: "Year 11", US: "Grade 10" },
  11: { IE: "5th Year", UK: "Year 12", US: "Grade 11" }, 12: { IE: "6th Year", UK: "Year 13", US: "Grade 12" },
  AD: { IE: "Adult", UK: "Adult", US: "Adult" }
};

/* Same public web config the Math and Words apps use (one shared Firebase project). */
window.HARBOR_FIREBASE = {
  apiKey: "AIzaSyCxqGRhdCyh92LyiFvrTi6ETTiFKVhDvUM",
  authDomain: "homeschool-math.firebaseapp.com",
  projectId: "homeschool-math",
  storageBucket: "homeschool-math.firebasestorage.app",
  messagingSenderId: "275309549483",
  appId: "1:275309549483:web:3c118499f22eb23e6f24ee"
};

/* Native app downloads shown on the website (hidden inside the app and when installed to the home screen).
 * android: the rolling "android-latest" GitHub release, refreshed by the Build Android workflow on every push.
 * play / appstore: fill in when the store listings are live (they replace the APK / Add-to-Home-Screen hints). */
window.HARBOR_DOWNLOADS = {
  android: "https://github.com/JacobDSiler/harbor/releases/download/android-latest/Harbor.apk",
  play: "",
  appstore: ""
};
