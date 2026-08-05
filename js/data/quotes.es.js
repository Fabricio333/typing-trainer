/* Pasajes estoicos y de superación personal: una lista de 50 reglas para vivir,
 * más líneas clásicas de Marco Aurelio, Séneca y Epicteto. Incluyen acentos,
 * ñ y signos de apertura ¿ ¡ a propósito. `length` se deriva al cargar. */
(function (TT) {
  'use strict';

  var REGLAS = 'Ryan Holiday, reglas de vida';

  var QUOTES = [
    { text: 'Concéntrate en lo que puedes controlar.', source: REGLAS },
    { text: 'Medita sobre tu mortalidad todos los días.', source: REGLAS },
    { text: 'Haz tuya la mañana.', source: REGLAS },
    { text: 'Piensa en el progreso, no en la perfección.', source: REGLAS },
    { text: 'Cuando leas, pregúntate: ¿qué pienso hacer con esta información?', source: REGLAS },
    { text: 'Valora el tiempo más que el dinero y las posesiones.', source: REGLAS },
    { text: 'Intenta encontrar lo bueno en las personas.', source: REGLAS },
    { text: 'Que nunca te escuchen quejarte, ni siquiera a ti mismo.', source: REGLAS },
    { text: 'Escucha más de lo que hablas.', source: REGLAS },
    { text: 'Sé estricto contigo mismo y tolerante con los demás.', source: REGLAS },
    { text: 'Trata al cuerpo con rigor para que obedezca mejor a la mente.', source: REGLAS },
    { text: 'Aprende algo de cada persona.', source: REGLAS },
    { text: 'Define qué significa el éxito para ti.', source: REGLAS },
    { text: 'No tengas miedo de pedir ayuda.', source: REGLAS },
    { text: 'Encuentra cada día una cosa que te haga más sabio.', source: REGLAS },
    { text: 'Estudia a los grandes. Súbete a hombros de gigantes.', source: REGLAS },
    { text: 'Encuentra la belleza en las cosas comunes.', source: REGLAS },
    { text: 'Júntate con gente que te haga mejor.', source: REGLAS },
    { text: 'Júntate con gente a la que puedas hacer mejor.', source: REGLAS },
    { text: 'No mires las noticias.', source: REGLAS },
    { text: 'Haz un acto de bondad cada día.', source: REGLAS },
    { text: 'Recoge la basura cuando la veas.', source: REGLAS },
    { text: 'No busques aprobación fuera de ti.', source: REGLAS },
    { text: 'Pasa tiempo con las personas mayores.', source: REGLAS },
    { text: 'Al evaluar una oportunidad, pregúntate: ¿qué me va a enseñar más?', source: REGLAS },
    { text: 'Intenta ser diferente, no mejor.', source: REGLAS },
    { text: 'Aparta de tu vida a las personas tóxicas.', source: REGLAS },
    { text: 'Deja los lugares mejor de lo que los encontraste.', source: REGLAS },
    { text: 'Pasa tiempo en librerías.', source: REGLAS },
    { text: 'Trabaja duro, mantente sano y guarda silencio. No es la ambición ni el talento lo que te va a distinguir, sino la cordura. El silencio es poder.', source: REGLAS },
    { text: 'Pregúntate: ¿estoy usando esta tecnología, o me está usando a mí?', source: REGLAS },
    { text: 'Vive una vida interesante.', source: REGLAS },
    { text: 'Recuerda: nadie está pensando en ti. Están demasiado ocupados pensando en sí mismos.', source: REGLAS },
    { text: 'No leas libros solamente: reléelos.', source: REGLAS },
    { text: 'No hables de tus proyectos hasta haberlos terminado.', source: REGLAS },
    { text: 'Ve oportunidades donde otros ven obstáculos.', source: REGLAS },
    { text: 'Imprime los buenos consejos y ponlos donde trabajas.', source: REGLAS },
    { text: 'Si un libro es malo, deja de leerlo.', source: REGLAS },
    { text: 'Acepta parecer despistado o tonto.', source: REGLAS },
    { text: 'Haz bien tu trabajo, sea cual sea, porque como haces una cosa es como lo haces todo.', source: REGLAS },
    { text: 'Renuncia a la idea de vengarte.', source: REGLAS },
    { text: 'Antes de actuar con ira, espera.', source: REGLAS },
    { text: 'No elijas la infelicidad por miedo a la incertidumbre.', source: REGLAS },
    { text: 'En vez de creer en ti mismo, genera evidencia.', source: REGLAS },
    { text: 'Nunca creas que ya lo tienes todo resuelto.', source: REGLAS },
    { text: 'Concéntrate en el momento, no en los monstruos que puede que haya o no más adelante.', source: REGLAS },
    { text: 'Vete a dormir de una vez.', source: REGLAS },
    { text: 'Relájate. Sea lo que sea, probablemente te lo estás tomando demasiado en serio.', source: REGLAS },
    { text: 'Sal a caminar.', source: REGLAS },
    { text: 'Haz un poco de progreso cada día.', source: REGLAS },

    { text: 'Ningún viento es favorable para el que no sabe a qué puerto va.', source: 'Séneca, Cartas a Lucilio' },
    { text: 'Es una vergüenza envejecer sin ver la belleza y la fuerza de las que tu cuerpo es capaz.', source: 'Sócrates, según Jenofonte' },
    { text: 'Tienes poder sobre tu mente, no sobre los acontecimientos externos. Comprende esto y encontrarás la fuerza.', source: 'Marco Aurelio, Meditaciones' },
    { text: 'No pierdas más tiempo discutiendo cómo debe ser un hombre bueno. Sé uno.', source: 'Marco Aurelio, Meditaciones' },
    { text: 'Muy poco se necesita para una vida feliz; todo está dentro de ti, en tu manera de pensar.', source: 'Marco Aurelio, Meditaciones' },
    { text: 'Cuando te levantes por la mañana, piensa en el precioso privilegio de estar vivo: de respirar, de pensar, de disfrutar, de amar.', source: 'Marco Aurelio, Meditaciones' },
    { text: 'Lo que impide la acción hace avanzar la acción. Lo que se interpone en el camino se convierte en el camino.', source: 'Marco Aurelio, Meditaciones' },
    { text: 'Si no es correcto, no lo hagas; si no es verdad, no lo digas.', source: 'Marco Aurelio, Meditaciones' },
    { text: 'No actúes como si fueras a vivir diez mil años. Mientras vivas, mientras esté en tu poder, sé bueno.', source: 'Marco Aurelio, Meditaciones' },
    { text: 'La mejor venganza es no parecerte a quien te hizo daño.', source: 'Marco Aurelio, Meditaciones' },
    { text: 'Limítate al presente.', source: 'Marco Aurelio, Meditaciones' },
    { text: 'Mira bien dentro de ti; ahí hay una fuente de fuerza que brotará siempre que mires.', source: 'Marco Aurelio, Meditaciones' },
    { text: 'Al amanecer, cuando te cueste salir de la cama, dite a ti mismo: tengo que ir a trabajar como ser humano. ¿De qué me quejo, si voy a hacer aquello para lo que nací, las cosas para las que fui traído al mundo? ¿O acaso fui creado para esto: para quedarme abrigado debajo de las mantas?', source: 'Marco Aurelio, Meditaciones' },
    { text: 'No es que tengamos poco tiempo para vivir, sino que desperdiciamos mucho. La vida es lo bastante larga para las metas más altas, si se invirtiera toda bien.', source: 'Séneca, Sobre la brevedad de la vida' },
    { text: 'Posponer las cosas es el mayor desperdicio de vida: arrebata cada día a medida que llega y nos niega el presente prometiéndonos el futuro. Todo el futuro descansa en la incertidumbre: vive de inmediato. La espera es el mayor impedimento para vivir: por anticipar el mañana, se pierde el hoy.', source: 'Séneca, Sobre la brevedad de la vida' },
    { text: 'Sufrimos más en la imaginación que en la realidad.', source: 'Séneca, Cartas a Lucilio' },
    { text: 'La suerte es lo que sucede cuando la preparación se encuentra con la oportunidad.', source: 'Atribuida a Séneca' },
    { text: 'Cada noche, antes de dormir, preguntémonos: ¿qué debilidad vencí hoy? ¿Qué virtud adquirí?', source: 'Séneca, Sobre la ira' },
    { text: 'No importa lo que te sucede, sino cómo reaccionas a ello.', source: 'Epicteto' },
    { text: 'Ningún hombre es libre si no es dueño de sí mismo.', source: 'Epicteto' },
    { text: 'No expliques tu filosofía. Encárnala.', source: 'Epicteto' },
    { text: 'Tenemos dos orejas y una boca para escuchar el doble de lo que hablamos.', source: 'Epicteto' },
    { text: 'Primero dite a ti mismo qué quieres ser; luego haz lo que tengas que hacer.', source: 'Epicteto, Disertaciones' },
    { text: 'No pidas que las cosas sucedan como tú quieres; quiere que sucedan como suceden, y tu vida tendrá un curso sereno.', source: 'Epicteto, Enquiridión' }
  ];

  function classify(n) {
    if (n < 120) return 'short';
    if (n <= 250) return 'medium';
    return 'long';
  }

  TT.data = TT.data || {};
  TT.data.quotes = TT.data.quotes || {};
  TT.data.quotes.es = QUOTES.map(function (q) {
    return { text: q.text, source: q.source, chars: q.text.length, length: classify(q.text.length) };
  });
})(window.TT = window.TT || {});
