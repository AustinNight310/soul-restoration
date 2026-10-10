// "At the bench" on the home page: one step per stage of a pair's trip, from hand-off to back home.
//
// To use a Creattie (or any Lottie) animation for a step: export it as Lottie JSON, save it in
// public/bench/ (for example public/bench/01-handoff.json) and set `lottie` on that step below.
// Steps without a file keep showing the drawn placeholder scene.
//
// `track` is the matching status on the customer's tracking page (index into TRACK).
export const TRACK = ['Booked', 'Received', 'Inspected', 'In restoration', 'Ready for pickup', 'Picked up'];

export const STEPS = [
  { n: '01', title: 'Hand-off', track: 0, lottie: null,
    body: 'Book online, then drop your pair off in the Bronx or we pick it up in the evening. It gets an order number and a tag right away.',
    gets: 'An order number to follow every step.' },
  { n: '02', title: 'Check-in', track: 2, lottie: null,
    body: 'Before any work, your pair is photographed and inspected. Scuffs, sole wear and older materials are noted on your order.',
    gets: 'A condition record, and a call before any extra work.' },
  { n: '03', title: 'Deep clean', track: 3, lottie: null,
    body: 'Upper, midsole, insoles and laces, cleaned by hand.',
    gets: 'A clean base for everything else.' },
  { n: '04', title: 'Restoration', track: 3, lottie: null,
    body: 'The work you booked: un-yellowing, icing, suede revival, sole repair or paint.',
    gets: 'Only what you approved.' },
  { n: '05', title: 'Packaged', track: 4, lottie: null,
    body: 'A final check against the intake photos, then your pair is boxed and labeled with your order number.',
    gets: 'Your pair, protected and ready.' },
  { n: '06', title: 'Back to you', track: 5, lottie: null,
    body: "We let you know when it's ready, and your tracking page shows it too. Then it's back in your hands.",
    gets: "A heads-up the moment it's ready." },
];

// How long each step stays on screen while the walkthrough plays, in milliseconds.
export const DWELL_MS = 5600;
