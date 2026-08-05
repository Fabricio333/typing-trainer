/* Public-domain English passages (classic literature, historical speeches, proverbs).
 * `length` is derived at load time so the UI can filter short/medium/long. */
(function (TT) {
  'use strict';

  var QUOTES = [
    { text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.', source: 'Jane Austen, Pride and Prejudice' },
    { text: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.', source: 'Charles Dickens, A Tale of Two Cities' },
    { text: 'Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, I thought I would sail about a little and see the watery part of the world.', source: 'Herman Melville, Moby Dick' },
    { text: 'All happy families are alike; each unhappy family is unhappy in its own way.', source: 'Leo Tolstoy, Anna Karenina' },
    { text: 'The only thing we have to fear is fear itself.', source: 'Franklin D. Roosevelt' },
    { text: 'Ask not what your country can do for you, ask what you can do for your country.', source: 'John F. Kennedy' },
    { text: 'To be, or not to be, that is the question: whether it is nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles.', source: 'William Shakespeare, Hamlet' },
    { text: 'We hold these truths to be self evident, that all men are created equal.', source: 'United States Declaration of Independence' },
    { text: 'It is our choices that show what we truly are, far more than our abilities. The rest is only weather, and weather always passes.', source: 'Original passage' },
    { text: 'The quick brown fox jumps over the lazy dog while the sleepy cat watches from a sunny windowsill nearby.', source: 'Pangram' },
    { text: 'Pack my box with five dozen liquor jugs, then quickly ship the whole lot by express freight before the weather turns.', source: 'Pangram' },
    { text: 'How vexingly quick daft zebras jump when a lazy fox saunters past the watering hole at dusk.', source: 'Pangram' },
    { text: 'Two roads diverged in a wood, and I took the one less travelled by, and that has made all the difference.', source: 'Robert Frost' },
    { text: 'I wandered lonely as a cloud that floats on high over vales and hills, when all at once I saw a crowd, a host of golden daffodils.', source: 'William Wordsworth' },
    { text: 'Do not go gentle into that good night. Rage, rage against the dying of the light.', source: 'Dylan Thomas' },
    { text: 'Because I could not stop for Death, he kindly stopped for me; the carriage held but just ourselves and immortality.', source: 'Emily Dickinson' },
    { text: 'Hope is the thing with feathers that perches in the soul, and sings the tune without the words, and never stops at all.', source: 'Emily Dickinson' },
    { text: 'The mass of men lead lives of quiet desperation. What is called resignation is confirmed desperation.', source: 'Henry David Thoreau, Walden' },
    { text: 'I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach.', source: 'Henry David Thoreau, Walden' },
    { text: 'Whatever you are, be a good one.', source: 'Attributed to Abraham Lincoln' },
    { text: 'A journey of a thousand miles begins with a single step.', source: 'Proverb' },
    { text: 'Early to bed and early to rise makes a man healthy, wealthy, and wise.', source: 'Benjamin Franklin' },
    { text: 'An investment in knowledge pays the best interest.', source: 'Benjamin Franklin' },
    { text: 'Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less.', source: 'Marie Curie' },
    { text: 'Imagination is more important than knowledge. Knowledge is limited. Imagination encircles the world.', source: 'Albert Einstein' },
    { text: 'The important thing is not to stop questioning. Curiosity has its own reason for existing.', source: 'Albert Einstein' },
    { text: 'It is not the strongest of the species that survives, nor the most intelligent, but the one most responsive to change.', source: 'Attributed to Charles Darwin' },
    { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', source: 'Attributed to Aristotle' },
    { text: 'The unexamined life is not worth living.', source: 'Socrates, via Plato' },
    { text: 'You have power over your mind, not outside events. Realize this, and you will find strength.', source: 'Marcus Aurelius, Meditations' },
    { text: 'Waste no more time arguing about what a good man should be. Be one.', source: 'Marcus Aurelius, Meditations' },
    { text: 'Very little is needed to make a happy life; it is all within yourself, in your way of thinking.', source: 'Marcus Aurelius, Meditations' },
    { text: 'The sun rose over the quiet harbour, and the fishing boats began to drift out past the breakwater one by one, their lamps still burning against the last of the dark.', source: 'Original passage' },
    { text: 'She opened the old wooden box and found nothing inside but a folded map, a brass key, and a letter that had never been sent.', source: 'Original passage' },
    { text: 'Type slowly and deliberately at first. Speed is a side effect of accuracy, never the other way around, and the fingers learn what the mind repeats.', source: 'Original passage' },
    { text: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair.', source: 'Charles Dickens, A Tale of Two Cities' },
    { text: 'Four score and seven years ago our fathers brought forth on this continent a new nation, conceived in liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure.', source: 'Abraham Lincoln, Gettysburg Address' },
    { text: 'There is a tide in the affairs of men which, taken at the flood, leads on to fortune; omitted, all the voyage of their life is bound in shallows and in miseries. On such a full sea are we now afloat, and we must take the current when it serves, or lose our ventures.', source: 'William Shakespeare, Julius Caesar' },
    { text: 'The practice room is quieter than anyone expects. There is no audience, no applause, and no shortcut worth taking. There is only the same passage played again, a little slower than feels comfortable, until the hands stop asking the mind for directions and simply know the way on their own.', source: 'Original passage' }
  ];

  function classify(n) {
    if (n < 120) return 'short';
    if (n <= 250) return 'medium';
    return 'long';
  }

  TT.data = TT.data || {};
  TT.data.quotes = TT.data.quotes || {};
  TT.data.quotes.en = QUOTES.map(function (q) {
    return { text: q.text, source: q.source, chars: q.text.length, length: classify(q.text.length) };
  });
})(window.TT = window.TT || {});
