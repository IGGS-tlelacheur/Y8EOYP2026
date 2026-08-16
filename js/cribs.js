/* What each room is asking for, in plain English, for a supervisor who does not
   teach mathematics.

   This is the most important text in the repository. Four of the six lessons are
   supervised by someone who cannot be expected to know what a line of best fit
   is, and the question they will be asked forty times is "is this good enough?".
   If they have to guess, the room has failed, not them.

   Rules this text follows:
     - It says what to look for, not what to know.
     - "Good enough" is a thing that can be seen on a screen, never a judgement
       about quality. A Learning Coach must never have to decide whether an
       answer is clever.
     - Every room has a "say this" line, because the hardest moment is a student
       stuck and looking up, and silence is worse than the wrong sentence.
     - No answers. Not one. They are on the printed sheet and on paper only.

   Imported by staff.html and by scripts/make-staff-sheet.mjs, so the screen and
   the paper cannot drift apart. */

export const CRIBS = [
  {
    id: 'l1',
    room: 'Lesson 1',
    name: 'Getting started',
    badge: null,
    asking: 'Sorting eight everyday things into three kinds of data, then picking '
      + 'the question their crew will spend the unit answering.',
    deliverable: 'A question written into the crew\'s Data Evidence Card.',
    goodEnough: [
      'The question names two things that can both be measured.',
      'Both of them can be measured at home, with a bucket, a phone or a tape.',
      'It is not settled forever — they can change it in Lesson 3.'
    ],
    sayThis: '"What are the two things you would have to measure? Can you measure '
      + 'both of them at your place?"',
    dontWorry: 'The sorting activity is not marked and nobody has to finish it. '
      + 'Getting it wrong first go is the point of it.'
  },
  {
    id: 'l2',
    room: 'Lesson 2',
    name: 'Reading charts',
    badge: 'Reader',
    asking: 'Reading charts other people made. They do not make any today.',
    deliverable: 'Three questions answered. There is nothing to hand in.',
    goodEnough: [
      'Three green ticks on screen, and a code shown at the bottom of the room.',
      'That is the whole test. The badge appears by itself.'
    ],
    sayThis: '"Press I need a hint. It is meant to be pressed — the last hint '
      + 'tells you the answer and you still get your code."',
    dontWorry: 'Using every hint costs them nothing. The badge does not know the '
      + 'difference, and it is not supposed to.'
  },
  {
    id: 'l3',
    room: 'Lesson 3',
    name: 'Collecting data',
    badge: 'Collector',
    asking: 'Finding what is wrong with another crew\'s recording sheet, then '
      + 'planning their own.',
    deliverable: 'Three questions answered, AND at least ten rows of their crew\'s '
      + 'own measurements typed into the collection table.',
    goodEnough: [
      'Ten rows or more in the collection table. The room counts them and says so.',
      'Each row has both measurements, not one.',
      'The method on the Card could be followed by someone in another crew.'
    ],
    sayThis: '"Could I follow your method without asking you anything? Read it to '
      + 'me and let me try."',
    dontWorry: 'The numbers do not have to be tidy or impressive. Messy real '
      + 'measurements are worth more here than neat invented ones, and a crew who '
      + 'measured nothing can borrow a data set — ask them to write "borrowed" in '
      + 'the source box and carry on.'
  },
  {
    id: 'l4',
    room: 'Lesson 4',
    name: 'Plotting it',
    badge: 'Plotter',
    asking: 'Choosing the right chart for the data, and spotting an axis that '
      + 'has been set up to mislead.',
    deliverable: 'Three questions answered, AND two charts attached to the crew\'s Card.',
    goodEnough: [
      'Two charts on the Card. The room says which one is missing if one is.',
      'Every axis has a word AND a unit on it — "Water used (litres)", not "Water".',
      'The vertical axis starts at zero, unless they can say why it should not.'
    ],
    sayThis: '"Read me the label on the bottom of your chart. Now read me the '
      + 'unit. If there isn\'t one, that is the thing to fix."',
    dontWorry: 'Whether the chart is pretty. A correct chart with a plain label '
      + 'beats a handsome one with no unit.'
  },
  {
    id: 'l5',
    room: 'Lesson 5',
    name: 'Predicting',
    badge: 'Predictor',
    asking: 'Drawing a straight line through their scatterplot and using it to say '
      + 'something about a value they never measured.',
    deliverable: 'Three questions answered, AND three boxes filled on the Card: '
      + 'the line, the interpolation and the extrapolation.',
    goodEnough: [
      'A line drawn through the points, with roughly as many above it as below.',
      'A sentence about water, not about maths. "For every extra minute, about '
      + 'nine more litres" — not "the gradient is nine".',
      'The extrapolation box says how much to trust it, not only what it predicts.'
    ],
    sayThis: '"Say what your line means using the word water, or litres, and no '
      + 'letters. If you can say it out loud you can write it."',
    dontWorry: 'Exactly where the line sits. Two crews will draw slightly '
      + 'different lines through the same points and both are right. There is no '
      + 'single correct line by eye and they are not expected to find one.'
  },
  {
    id: 'l6',
    room: 'Lesson 6',
    name: 'The whole story',
    badge: null,
    asking: 'Being shown their own Lesson 2 answer and asked what it is worth. Then '
      + 'finishing and checking Cards.',
    deliverable: 'A printed Card, and another crew\'s Card checked.',
    goodEnough: [
      'The Card prints on two sheets with a chart on each.',
      'Every box has something in it.',
      'They have found at least one thing to say about another crew\'s Card.'
    ],
    sayThis: '"What else changes when it gets hot? Is there something making both '
      + 'of those go up at once?"',
    dontWorry: 'Nobody has to reach the words "correlation" and "causation" '
      + 'unprompted. Getting to "it is the hot weather" is the whole idea; the '
      + 'names for it are on the board.'
  }
];

/* What every badge needs, in one place, because it is the question a supervisor
   is actually asked. Checkpoints alone are never enough except in Lesson 2. */
export const BADGE_RULES = [
  ['Reader', 'Lesson 2', 'Three questions answered. Nothing else.'],
  ['Collector', 'Lesson 3', 'Three questions answered, and ten or more rows in the collection table.'],
  ['Plotter', 'Lesson 4', 'Three questions answered, and two charts on the Card.'],
  ['Predictor', 'Lesson 5', 'Three questions answered, and the line, interpolation and extrapolation boxes filled on the Card.']
];

/* The things that will actually go wrong, and what to do. Ordered by how often
   they are likely to come up rather than by how serious they are. */
export const TROUBLE = [
  {
    when: 'They have finished the questions but there is no badge.',
    do: 'The room is waiting for the other half. Read the yellow line at the '
      + 'bottom of the room — it names exactly what is missing. Their code works '
      + 'either way, so they are not stuck.'
  },
  {
    when: 'They have lost the code for the next room.',
    do: 'Send them back to the room before. The code is worked out from their own '
      + 'answers, so it is still there on screen. Nothing has been lost.'
  },
  {
    when: 'The code will not open the room.',
    do: 'Codes are theirs alone — a code from the student next to them will not work, '
      + 'and that is deliberate. Check they are reading their own. If it still fails, '
      + 'use the staff code for that room on this sheet.'
  },
  {
    when: 'Their work has vanished after a laptop swap or a reimage.',
    do: 'Sign in again first: their badges, codes and data set all come back from '
      + 'their ID alone. Only their typed sentences and their table need the .h2o file. '
      + 'Import it on the sign-in page, or from this page.'
  },
  {
    when: 'They cannot sign in.',
    do: 'The page says which half is wrong. "Not on the list" means the ID; '
      + '"does not match" means the password. Staff are on the same roll and sign '
      + 'in the same way.'
  },
  {
    when: 'Two students are editing the crew Card at once.',
    do: 'The Card warns and offers Save a copy. Let them talk to each other — it '
      + 'is a conversation to have, not a thing the site should prevent.'
  },
  {
    when: 'A crew collected no data at all.',
    do: 'They borrow a data set and write "borrowed" in the source box. They can '
      + 'still earn Plotter and Predictor and still finish the Card. They lose '
      + 'Collector, which is the one that was actually about collecting.'
  }
];
