/* ==========================================================================
   STORY CONTENT — edit this file to change what the game says.
   Nothing in here is code you need to understand; it's just text and lists.
   ========================================================================== */

window.GAME_CONTENT = {

  /* ---------- Title screen ---------- */
  title: "A Letter for You",
  subtitle: "a small game, made by hand",
  credits: [
    "Written & made by Dino",
    "For Yana"
  ],

  /* ---------- Characters ---------- */
  characters: {
    dino: { name: "Dino" }
  },

  /* ---------- Scenes ----------
     Scenes play in the order listed. Each one has an `id` and a `type`.
     `next` names the scene that follows it. To add a scene later, add an
     object here and point the previous scene's `next` at its id.        */
  scenes: [

    /* ===== SCENE ONE — the question ===== */
    {
      id: "question",
      type: "choice",
      setting: "Late evening. A quiet desk.",   // small caption; "" to hide
      speaker: "dino",
      prompt: "What would Yana want?",
      choices: [
        { text: "A bouquet of flowers.", correct: false },
        { text: "A box of chocolates.",  correct: false },
        { text: "A handmade letter!",    correct: true  },
        { text: "An expensive gift.",    correct: false }
      ],
      wrongResponse: "I'm too broke rn, maybe something else.",
      next: "letter"
    },

    /* ===== SCENE TWO — the letter ===== */
    {
      id: "letter",
      type: "letter",
      /* -------------------------------------------------------------------
         THE LETTER — replace everything between the backticks ( ` ).
         • A blank line starts a new paragraph.
         • A single line break starts a new line (good for the sign-off).
         • Punctuation, capitals and emoji/Unicode are all kept as written.
         ------------------------------------------------------------------- */
      text: `Dear Yana,

It's your special day today! I hope this letter finds you well.

Thank you for being the greatest light in my life, for putting a beat in my soul, and for making me want to give my all, not just to you, but to everything I do.

This is the second year we've celebrated your birthday together! Unlike last time, though, I might not be able to be there with you. But I hope you keep growing stronger within yourself.

Have a great day today, and happy birthday!

Your nerdiest loser,
Dino`,
      next: "to-be-continued"
    },

    /* ===== PLACEHOLDER — where the next scene will go =====
       Replace this with the real next scene when it's ready.            */
    {
      id: "to-be-continued",
      type: "end",
      heading: "To be continued",
      body: "The next part of this story hasn't been written yet."
    }
  ],

  /* ---------- Small interface wording ---------- */
  ui: {
    letterHintWriting: "Tap the page to write faster",
    letterHintFast:    "Tap again to finish the letter",
    letterContinue:    "Continue",
    newGameConfirm:    "Start over from the beginning? Your saved place will be replaced."
  }
};
