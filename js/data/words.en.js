/* English word list, roughly frequency-ordered: the most common words come first,
 * so slicing the front of the array gives you a "top N" drill for free.
 * 1314 words, no duplicates (see tests/run.js). */
(function (TT) {
  'use strict';

  var LIST = (
    'the be to of and a in that have i it for not on with he as you do at ' +
    'this but his by from they we say her she or an will my one all would ' +
    'there their what so up out if about who get which go me when make can ' +
    'like time no just him know take people into year your good some could ' +
    'them see other than then now look only come its over think also back ' +
    'after use two how our work first well way even new want because any ' +
    'these give day most us is was are been has had were said did may part ' +
    'very still made many before must through much where mean old here ' +
    'thing tell become show house both between need live world school own ' +
    'under last right move thought keep never each same another seem next ' +
    'few always those help talk turn start might hand place again off went ' +
    'ask read land different home try kind picture change play spell air ' +
    'away animal point page letter mother answer found study learn should ' +
    'america great small every story earth name sentence man line set three ' +
    'boy follow came does large big grow river state hard soon such why men ' +
    'light near self add food told class list body music farm hold below ' +
    'country plant ready father let night open example begin life door ' +
    'without paper often together got group second carry took rain eat room ' +
    'friend began idea fish mountain north once base hear horse cut sure ' +
    'watch color war lay against pattern slow center love person money ' +
    'serve appear road map science rule govern pull cold notice voice fall ' +
    'power town fine certain fly unit lead cry dark machine note wait plan ' +
    'figure star box noun field rest correct able pound done beauty drive ' +
    'stood contain front teach week final gave green oh quick develop sleep ' +
    'warm free minute strong special mind behind clear tail produce fact ' +
    'street inch lot nothing course stay wheel full force blue object ' +
    'decide surface deep moon island foot system busy test record boat ' +
    'common gold possible plane age dry wonder laugh thousand ago ran check ' +
    'game shape yes hot miss brought heat snow tire bring distant fill east ' +
    'paint language among grand ball yet wave drop heart present heavy ' +
    'dance engine position arm wide sail material size speak weight general ' +
    'ice matter circle pair include divide syllable felt perhaps pick ' +
    'sudden count square reason length represent art subject region energy ' +
    'hunt probable bed brother egg ride cell believe fraction forest sit ' +
    'race window store summer train listen prove lone leg exercise wall ' +
    'catch mount wish sky board joy winter written wild instrument kept ' +
    'glass grass cow job edge sign visit past soft fun bright gas weather ' +
    'month million bear finish happy hope flower clothe strange gone trade ' +
    'melody trip office receive row mouth exact symbol die least trouble ' +
    'shout except wrote seed tone join suggest clean break lady yard rise ' +
    'bad blow oil blood touch grew cent mix team wire cost lost brown wear ' +
    'garden equal sent choose fell fit flow fair bank collect save control ' +
    'decimal gentle woman captain practice separate difficult doctor please ' +
    'protect noon crop modern element hit student corner party supply whose ' +
    'locate ring character insect period indicate radio spoke atom human ' +
    'history effect electric expect bone rail imagine provide agree thus ' +
    'capital chair danger fruit rich thick soldier process operate guess ' +
    'necessary sharp wing create neighbor wash bat crowd corn compare poem ' +
    'string bell depend meat rub tube famous dollar stream fear sight thin ' +
    'triangle planet hurry chief colony clock mine tie enter major fresh ' +
    'search send yellow gun allow print dead spot desert suit current lift ' +
    'rose arrive master track parent shore division sheet substance metal ' +
    'connect post spend chord fat glad original share station dad bread ' +
    'charge proper bar offer segment slave duck instant market degree ' +
    'populate chick dear enemy reply drink occur support speech nature ' +
    'range steam motion path liquid log meant quotient teeth shell neck ' +
    'oxygen sugar death pretty skill women season solution magnet silver ' +
    'thank branch match suffix especially fig afraid huge sister steel ' +
    'discuss forward similar guide experience score apple bought led pitch ' +
    'coat mass card band rope slip win dream evening condition feed tool ' +
    'total basic smell valley nor double seat continue block chart hat sell ' +
    'success company subtract event particular deal swim term opposite wife ' +
    'shoe shoulder spread arrange camp invent cotton born determine quart ' +
    'nine truck noise level chance gather shop stretch throw shine property ' +
    'column molecule select wrong gray repeat require broad prepare salt ' +
    'nose plural anger claim continent quiet whole better best worse early ' +
    'late hour morning tonight today tomorrow yesterday weekend everything ' +
    'something anything someone anyone everyone nobody myself yourself ' +
    'himself herself itself ourselves themselves across along beyond during ' +
    'inside outside toward within upon beneath beside around above almost ' +
    'already although anyway either neither rather really simply surely ' +
    'truly usually whether while whenever wherever whatever whoever however ' +
    'therefore question problem result cause purpose method project program ' +
    'design detail sample report review theory value simple single public ' +
    'private social local global national natural normal actual active ' +
    'alive aware clever curious eager honest patient polite proud silent ' +
    'brave calm careful cheerful clumsy foolish generous graceful grateful ' +
    'helpful hungry lonely lovely nervous serious sorry tender tiny weary ' +
    'wicked worried angry bitter bored close cool crazy cruel dirty empty ' +
    'funny giant harsh humble ideal inner joint junior keen legal loose ' +
    'loud lucky mature mild minor moral narrow neat noble odd plain plenty ' +
    'prime pure rapid rare raw rough round royal rural safe shy silly smart ' +
    'smooth solid sour spare steady steep stiff strict sweet swift tall ' +
    'tame tight tough vast weak wet wise young accept access account ' +
    'achieve acquire adapt adjust admire admit adopt advance advise afford ' +
    'alert amount analyze announce apply approach approve argue arise ' +
    'arrest assign assist assume attach attack attempt attend attract avoid ' +
    'balance battle behave belong benefit blame borrow bother breathe bury ' +
    'cancel capture celebrate challenge chase cheer climb collapse combine ' +
    'command comment commit compete complain complete concern confirm ' +
    'confuse consider consist consult consume contact convince cooperate ' +
    'copy credit crush cure damage debate declare defeat defend define ' +
    'delay deliver demand deny depart deserve destroy detect devote differ ' +
    'direct disagree discover dismiss display dispute disturb donate doubt ' +
    'earn educate elect embrace emerge employ enable encourage endure ' +
    'enforce engage enhance enjoy ensure entertain escape establish ' +
    'estimate evaluate examine exceed exchange excite excuse exist expand ' +
    'explain explore export express extend faith fault favor fetch fight ' +
    'forbid forgive format freeze gain gaze grab grant greet handle happen ' +
    'harvest hesitate hide honor identify ignore impress improve increase ' +
    'infect inform inherit inject injure inquire insist inspect inspire ' +
    'install instruct insult intend interpret introduce invade invest ' +
    'invite involve isolate justify knock label lack launch lean lend limit ' +
    'link load lock manage manufacture mark measure mention merge modify ' +
    'monitor motivate multiply navigate neglect negotiate notify obey ' +
    'observe obtain occupy offend oppose order organize overcome owe pack ' +
    'participate perform permit persuade phone plead possess postpone ' +
    'praise predict prefer preserve press pretend prevent proceed promise ' +
    'promote pronounce propose protest publish punish purchase pursue ' +
    'qualify quit quote raise reach realize recall recognize recommend ' +
    'recover reduce refer reflect refuse regret reject relate relax release ' +
    'rely remain remind remove repair replace request rescue resemble ' +
    'reserve resist resolve respond restore retain retire reveal reverse ' +
    'revise reward rush satisfy scatter schedule scream secure seek seize ' +
    'settle shake shift shock shrink sigh signal sink smile solve sort ' +
    'spill split sponsor spray squeeze stare steal stick sting stir strike ' +
    'struggle submit succeed suffer summon supervise suppose surprise ' +
    'surround survive suspect sustain swallow swear sweep switch tackle ' +
    'target tease tempt threaten thrive tolerate trace transfer transform ' +
    'translate transport treat tremble trust twist undergo understand unite ' +
    'update upgrade urge validate vanish vary venture verify view violate ' +
    'vote wander warn waste weaken welcome whisper withdraw witness worry ' +
    'worship wrap yield'
  ).split(/\s+/);

  TT.data = TT.data || {};
  TT.data.words = TT.data.words || {};
  TT.data.words.en = LIST;
})(window.TT = window.TT || {});
