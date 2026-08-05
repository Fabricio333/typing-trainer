/* Stoic and self-improvement passages: a 50-rule list for living, plus classic
 * lines from Marcus Aurelius, Seneca and Epictetus. `length` is derived at
 * load time so the UI can filter short/medium/long. */
(function (TT) {
  'use strict';

  var RULES = 'Ryan Holiday, rules for life';

  var QUOTES = [
    { text: 'Focus on what you can control.', source: RULES },
    { text: 'Meditate on your mortality every day.', source: RULES },
    { text: 'Own the morning.', source: RULES },
    { text: 'Think about progress, not perfection.', source: RULES },
    { text: 'When you read, ask: what do I plan to do with this information?', source: RULES },
    { text: 'Value time more than money and possessions.', source: RULES },
    { text: 'Try to find the good in people.', source: RULES },
    { text: 'Never be overheard complaining, not even to yourself.', source: RULES },
    { text: 'Listen more than you speak.', source: RULES },
    { text: 'Be strict with yourself and tolerant with others.', source: RULES },
    { text: 'Treat the body rigorously so it better obeys the mind.', source: RULES },
    { text: 'Learn something from everyone.', source: RULES },
    { text: 'Define what success means to you.', source: RULES },
    { text: 'Do not be afraid to ask for help.', source: RULES },
    { text: 'Find one thing that makes you wiser every day.', source: RULES },
    { text: 'Study the greats. Stand on the shoulders of giants.', source: RULES },
    { text: 'Find the beauty in ordinary things.', source: RULES },
    { text: 'Associate with people who make you better.', source: RULES },
    { text: 'Associate with people who you can make better.', source: RULES },
    { text: 'Do not watch the news.', source: RULES },
    { text: 'Do a kindness every day.', source: RULES },
    { text: 'Pick up trash when you see it.', source: RULES },
    { text: 'Do not look outside yourself for approval.', source: RULES },
    { text: 'Spend time with old people.', source: RULES },
    { text: 'When evaluating an opportunity, ask yourself: what will teach me the most?', source: RULES },
    { text: 'Try to be different, not better.', source: RULES },
    { text: 'Cut toxic people out of your life.', source: RULES },
    { text: 'Leave places better than you found them.', source: RULES },
    { text: 'Spend time in bookstores.', source: RULES },
    { text: 'Be quiet, work hard, and stay healthy. It is not ambition or skill that is going to set you apart but sanity. Silence is power.', source: RULES },
    { text: 'Ask: am I using this technology, or is it using me?', source: RULES },
    { text: 'Live an interesting life.', source: RULES },
    { text: 'Remember: nobody is thinking about you. They are too busy thinking about themselves.', source: RULES },
    { text: 'Do not just read books, re-read books.', source: RULES },
    { text: 'Do not talk about projects until you are finished.', source: RULES },
    { text: 'See opportunities where others see obstacles.', source: RULES },
    { text: 'Print out good advice and put it where you work.', source: RULES },
    { text: 'If a book sucks, stop reading it.', source: RULES },
    { text: 'Be OK with looking clueless or stupid.', source: RULES },
    { text: 'Do your job well, whatever it is, because how you do anything is how you do everything.', source: RULES },
    { text: 'Give up on the idea of getting revenge.', source: RULES },
    { text: 'Before you act out anger, delay.', source: RULES },
    { text: 'Do not choose unhappiness over uncertainty.', source: RULES },
    { text: 'Instead of believing in yourself, generate evidence.', source: RULES },
    { text: 'Never think you have it all figured out.', source: RULES },
    { text: 'Focus on the moment, not the monsters that may or may not be up ahead.', source: RULES },
    { text: 'Go the fck to sleep.', source: RULES },
    { text: 'Relax. Whatever it is, you are probably taking it too seriously.', source: RULES },
    { text: 'Take walks.', source: RULES },
    { text: 'Make a little progress every day.', source: RULES },

    { text: 'If a man knows not to which port he sails, no wind is favorable.', source: 'Seneca, Letters to Lucilius' },
    { text: 'It is a shame for a man to grow old without seeing the beauty and the strength of which his body is capable.', source: 'Socrates, via Xenophon' },
    { text: 'You have power over your mind, not outside events. Realize this, and you will find strength.', source: 'Marcus Aurelius, Meditations' },
    { text: 'Waste no more time arguing about what a good man should be. Be one.', source: 'Marcus Aurelius, Meditations' },
    { text: 'Very little is needed to make a happy life; it is all within yourself, in your way of thinking.', source: 'Marcus Aurelius, Meditations' },
    { text: 'When you arise in the morning, think of what a precious privilege it is to be alive: to breathe, to think, to enjoy, to love.', source: 'Marcus Aurelius, Meditations' },
    { text: 'The impediment to action advances action. What stands in the way becomes the way.', source: 'Marcus Aurelius, Meditations' },
    { text: 'If it is not right, do not do it; if it is not true, do not say it.', source: 'Marcus Aurelius, Meditations' },
    { text: 'Do not act as if you had ten thousand years to live. While you live, while it is in your power, be good.', source: 'Marcus Aurelius, Meditations' },
    { text: 'The best revenge is to be unlike him who performed the injury.', source: 'Marcus Aurelius, Meditations' },
    { text: 'Confine yourself to the present.', source: 'Marcus Aurelius, Meditations' },
    { text: 'Look well into yourself; there is a source of strength which will always spring up if you will always look.', source: 'Marcus Aurelius, Meditations' },
    { text: 'At dawn, when you have trouble getting out of bed, tell yourself: I have to go to work as a human being. What do I have to complain of, if I am going to do what I was born for, the things I was brought into the world to do? Or is this what I was created for: to huddle under the blankets and stay warm?', source: 'Marcus Aurelius, Meditations' },
    { text: 'It is not that we have a short time to live, but that we waste a lot of it. Life is long enough for the highest achievements, if it were all well invested.', source: 'Seneca, On the Shortness of Life' },
    { text: 'Putting things off is the biggest waste of life: it snatches away each day as it comes, and denies us the present by promising the future. The whole future lies in uncertainty: live immediately. Expecting is the greatest impediment to living: in anticipation of tomorrow, it loses today.', source: 'Seneca, On the Shortness of Life' },
    { text: 'We suffer more often in imagination than in reality.', source: 'Seneca, Letters to Lucilius' },
    { text: 'Luck is what happens when preparation meets opportunity.', source: 'Attributed to Seneca' },
    { text: 'Every night before going to sleep, we must ask ourselves: what weakness did I overcome today? What virtue did I acquire?', source: 'Seneca, On Anger' },
    { text: 'It is not what happens to you, but how you react to it that matters.', source: 'Epictetus' },
    { text: 'No man is free who is not master of himself.', source: 'Epictetus' },
    { text: 'Do not explain your philosophy. Embody it.', source: 'Epictetus' },
    { text: 'We have two ears and one mouth so that we can listen twice as much as we speak.', source: 'Epictetus' },
    { text: 'First say to yourself what you would be; and then do what you have to do.', source: 'Epictetus, Discourses' },
    { text: 'Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are, and you will have a tranquil flow of life.', source: 'Epictetus, Enchiridion' }
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
