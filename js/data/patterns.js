/* Highest-frequency letter patterns per language.
 *
 * These drive the "patterns" test mode: rather than typing whole words you drill
 * the letter transitions that actually dominate the language, which is where most
 * of the speed ceiling lives. `clusters` holds longer language-specific chunks
 * that are worth practising as a unit. */
(function (TT) {
  'use strict';

  function split(s) { return s.split(/\s+/); }

  TT.data = TT.data || {};
  TT.data.patterns = {
    en: {
      bigrams: split(
        'th he in er an re on at en nd ti es or te of ed is it al ar st to nt ' +
        'ng se ha as ou io le ve co me de hi ri ro ic ne ea ra ce li ch ll be ' +
        'ma si om ur ca el ta la ns di fo ho pe ec pr no ct us ac ot il tr ly'
      ),
      trigrams: split(
        'the and ing ion tio ent ati for her ter hat tha ere ate his con res ' +
        'ver all ons nce men ith ted ers pro thi wit are ess not ive was ect ' +
        'rea com eve per int est sta cti ica ist ear ain one our iti rat'
      ),
      clusters: split(
        'tion ment ness ould ight ough ance ence able ible sion ture ally ' +
        'ing ed er est ly re un pre dis'
      )
    },
    es: {
      bigrams: split(
        'de es en el la os ar ra as er ad al an ac co ta on or ca re do to ci ' +
        'st se na ro ia nt le po qu pa te ue me ma si so ie ir mo pe ba tr pr ' +
        'br cr gr fr dr tu ur um im am om em ll rr ñe ña ño'
      ),
      trigrams: split(
        'que ent del con ada par los est com nte ado ien ero ara res pro ese ' +
        'tra ant per ora aba ion cio nci ida ame tar cer ver lla rre gue gui ' +
        'qui año eño ito ita oso osa'
      ),
      clusters: split(
        'ción sión mente ando iendo able ible dad tad eza oso osa illo illa ' +
        'ñ ll rr qu gu ch á é í ó ú ü'
      )
    }
  };
})(window.TT = window.TT || {});
