/* Pasajes en español de dominio público (literatura clásica, refranes) y textos propios.
 * Incluyen acentos, ñ y signos de apertura ¿ ¡ a propósito. */
(function (TT) {
  'use strict';

  var QUOTES = [
    { text: 'En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor.', source: 'Miguel de Cervantes, Don Quijote' },
    { text: 'La razón de la sinrazón que a mi razón se hace, de tal manera mi razón enflaquece, que con razón me quejo de la vuestra fermosura.', source: 'Miguel de Cervantes, Don Quijote' },
    { text: 'Muchos años después recordaría aquella tarde de invierno en que su abuelo le enseñó a encender el fuego sin más ayuda que dos piedras y mucha paciencia.', source: 'Pasaje original' },
    { text: 'Volverán las oscuras golondrinas en tu balcón sus nidos a colgar, y otra vez con el ala a sus cristales jugando llamarán.', source: 'Gustavo Adolfo Bécquer' },
    { text: 'Verde que te quiero verde. Verde viento. Verdes ramas. El barco sobre la mar y el caballo en la montaña.', source: 'Federico García Lorca' },
    { text: 'Caminante, no hay camino, se hace camino al andar.', source: 'Antonio Machado' },
    { text: 'Todo pasa y todo queda, pero lo nuestro es pasar, hacer caminos, caminos sobre la mar.', source: 'Antonio Machado' },
    { text: '¿Qué es la vida? Un frenesí. ¿Qué es la vida? Una ilusión, una sombra, una ficción, y el mayor bien es pequeño.', source: 'Calderón de la Barca, La vida es sueño' },
    { text: 'Yo sé quién soy, y sé que puedo ser no sólo los que he dicho, sino todos los doce pares de Francia.', source: 'Miguel de Cervantes, Don Quijote' },
    { text: 'La libertad, Sancho, es uno de los más preciosos dones que a los hombres dieron los cielos.', source: 'Miguel de Cervantes, Don Quijote' },
    { text: 'No hay mal que por bien no venga, ni bien que dure cien años, ni cuerpo que lo resista.', source: 'Refrán' },
    { text: 'A quien madruga, Dios le ayuda, pero conviene madrugar con un plan bajo el brazo.', source: 'Refrán' },
    { text: 'Más vale pájaro en mano que ciento volando.', source: 'Refrán' },
    { text: 'El que mucho abarca, poco aprieta.', source: 'Refrán' },
    { text: 'Camarón que se duerme, se lo lleva la corriente.', source: 'Refrán' },
    { text: '¡Qué extraño es todo! El niño preguntó por qué el cielo cambiaba de color al atardecer, y nadie supo darle una respuesta sencilla.', source: 'Pasaje original' },
    { text: 'La mañana llegó despacio sobre los tejados del pueblo, y el panadero encendió el horno mientras la señora del quiosco levantaba la persiana.', source: 'Pasaje original' },
    { text: 'Escribir a máquina es como tocar un instrumento: primero la precisión, después la velocidad, y sólo al final la música.', source: 'Pasaje original' },
    { text: 'El pequeño ñandú corrió por la llanura seca mientras el sol de la tarde teñía de naranja las montañas lejanas.', source: 'Pasaje original' },
    { text: 'Aquella noche la lluvia golpeó las ventanas durante horas, y al amanecer el jardín amaneció lleno de charcos donde antes había polvo.', source: 'Pasaje original' },
    { text: '¿Cuántas veces habrá que repetir un gesto para que deje de costar esfuerzo? Nadie lo sabe con certeza, pero la respuesta siempre es más de las que uno cree.', source: 'Pasaje original' },
    { text: 'La memoria es un cuaderno que se escribe solo, y que a veces arranca sus propias páginas sin pedir permiso.', source: 'Pasaje original' },
    { text: 'El año pasado aprendí que la paciencia no es esperar sin hacer nada, sino trabajar mientras se espera.', source: 'Pasaje original' },
    { text: 'Sueña el rico en su riqueza, que más cuidados le ofrece; sueña el pobre que padece su miseria y su pobreza.', source: 'Calderón de la Barca, La vida es sueño' },
    { text: 'Érase un hombre a una nariz pegado, érase una nariz superlativa, érase una alquitara medio viva.', source: 'Francisco de Quevedo' },
    { text: 'En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor. Una olla de algo más vaca que carnero, salpicón las más noches, duelos y quebrantos los sábados, lentejas los viernes.', source: 'Miguel de Cervantes, Don Quijote' },
    { text: '¿Qué es la vida? Un frenesí. ¿Qué es la vida? Una ilusión, una sombra, una ficción, y el mayor bien es pequeño, que toda la vida es sueño, y los sueños, sueños son. Así, mientras el hombre duerme, sueña que despierta, y mientras despierta, sueña que vivirá para siempre.', source: 'Calderón de la Barca, La vida es sueño' },
    { text: 'La sala de práctica es más silenciosa de lo que cualquiera espera. No hay público, ni aplausos, ni ningún atajo que valga la pena tomar. Sólo está el mismo pasaje repetido otra vez, un poco más lento de lo que resulta cómodo, hasta que las manos dejan de preguntarle el camino a la mente y simplemente lo saben.', source: 'Pasaje original' }
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
