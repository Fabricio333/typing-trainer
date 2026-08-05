/* Spanish word list, roughly frequency-ordered. Accents and ñ are kept exactly as
 * written — typing them correctly (via dead keys) is part of the point.
 * 706 words, no duplicates (see tests/run.js). */
(function (TT) {
  'use strict';

  var LIST = (
    'de la que el en y a los se del las un por con no una su para es al lo ' +
    'como más o pero sus le ha me si sin sobre este ya entre cuando todo ' +
    'esta ser son dos también fue había era muy años hasta desde está mi ' +
    'porque qué sólo han yo hay vez puede todos así nos ni parte tiene él ' +
    'uno donde bien tiempo mismo ese ahora cada vida otro después te otros ' +
    'aunque esa eso hace otra gobierno tan durante siempre día tanto ella ' +
    'tres sí dijo sido gran país según menos mundo año antes estado contra ' +
    'sino forma caso nada hacer general estaba poco estos presidente mayor ' +
    'ante unos les algo hacia casa ellos ayer hoy hombre mujer niño niña ' +
    'familia amigo trabajo ciudad agua tierra fuego aire noche mañana tarde ' +
    'semana mes hora minuto momento lugar grupo persona gente pueblo calle ' +
    'camino puerta ventana mesa silla libro papel mano ojo cara cuerpo ' +
    'cabeza pie brazo corazón voz palabra nombre número punto línea color ' +
    'luz sombra sol luna estrella cielo mar río monte campo árbol flor hoja ' +
    'fruta pan leche carne comida bebida vino café azúcar sal aceite huevo ' +
    'queso arroz pescado pollo verdura ensalada sopa postre dulce amargo ' +
    'salado fresco caliente frío nuevo viejo joven grande pequeño largo ' +
    'corto alto bajo ancho estrecho fuerte débil rápido lento fácil difícil ' +
    'bueno malo mejor peor primero último cerca lejos dentro fuera arriba ' +
    'abajo delante detrás izquierda derecha norte sur oeste centro medio ' +
    'final principio nunca jamás quizá tal apenas casi bastante demasiado ' +
    'mucho nadie alguien algunos ninguno cualquiera propio ajeno hablar ' +
    'decir contar leer escribir escuchar mirar ver oír sentir pensar saber ' +
    'conocer entender aprender enseñar estudiar trabajar descansar dormir ' +
    'despertar comer beber cocinar limpiar lavar vestir salir entrar llegar ' +
    'volver seguir parar correr andar caminar subir bajar abrir cerrar ' +
    'empezar terminar continuar cambiar buscar encontrar perder ganar jugar ' +
    'cantar bailar reír llorar amar querer odiar temer esperar creer dudar ' +
    'ayudar cuidar servir usar llevar traer dar recibir tomar dejar poner ' +
    'quitar guardar romper arreglar construir crear pintar dibujar comprar ' +
    'vender pagar costar valer deber necesitar preferir elegir decidir ' +
    'intentar lograr conseguir permitir prohibir mandar obedecer preguntar ' +
    'responder explicar mostrar esconder abrazar besar saludar despedir ' +
    'invitar visitar viajar volar nadar conducir montar caer levantar ' +
    'empujar tirar coger soltar sostener tocar sentar acostar vivir morir ' +
    'nacer crecer envejecer curar doler sanar respirar mover quedar ' +
    'volverse convertir parecer resultar ocurrir pasar suceder existir ' +
    'faltar sobrar bastar importar interesar gustar encantar molestar ' +
    'preocupar alegrar entristecer asustar sorprender aburrir cansar ' +
    'descubrir inventar imaginar recordar olvidar repetir practicar mejorar ' +
    'empeorar aumentar reducir dividir sumar restar medir pesar comparar ' +
    'clasificar ordenar organizar planear preparar cumplir fallar acertar ' +
    'equivocar corregir revisar comprobar demostrar probar negar aceptar ' +
    'rechazar proponer sugerir aconsejar advertir avisar informar comunicar ' +
    'expresar traducir escapar defender atacar luchar pelear discutir ' +
    'acordar firmar escuela colegio universidad clase alumno maestro ' +
    'profesor examen tarea lección cuaderno lápiz pluma pizarra biblioteca ' +
    'historia ciencia matemática lengua arte música deporte juego equipo ' +
    'partido campeón premio dinero banco tienda mercado precio cuenta ' +
    'factura empresa oficina jefe empleado sueldo cliente producto servicio ' +
    'negocio proyecto plan idea problema solución razón causa efecto ' +
    'resultado ejemplo detalle información dato noticia periódico revista ' +
    'radio televisión película teatro concierto fiesta viaje vacaciones ' +
    'hotel aeropuerto estación tren coche autobús avión barco bicicleta ' +
    'avenida plaza parque jardín iglesia hospital médico enfermo salud ' +
    'dolor medicina farmacia policía ley juez derecho justicia paz guerra ' +
    'ejército soldado nación patria bandera rey reina costumbre cultura ' +
    'religión dios alma espíritu sueño verdad mentira secreto misterio ' +
    'suerte destino futuro pasado presente edad juventud vejez niñez ' +
    'infancia amor amistad odio miedo alegría tristeza sorpresa enojo calma ' +
    'paciencia esperanza fuerza energía poder deseo necesidad hambre sed ' +
    'cansancio enorme lleno vacío limpio sucio claro oscuro brillante suave ' +
    'áspero duro blando pesado ligero seco mojado ácido ruidoso silencioso ' +
    'tranquilo nervioso feliz triste contento enfadado cansado ocupado ' +
    'libre listo tonto amable grosero honesto sincero valiente cobarde ' +
    'generoso egoísta paciente perezoso trabajador simpático antipático ' +
    'hermoso feo guapo rico pobre sano sabio ignorante moderno antiguo ' +
    'común raro extraño normal especial importante útil inútil posible ' +
    'imposible necesario seguro peligroso cierto falso verdadero completo ' +
    'entero doble triple único varios muchos pocos suficiente demás además ' +
    'tampoco entonces luego mientras pues salvo excepto incluso tras ' +
    'mediante'
  ).split(/\s+/);

  TT.data = TT.data || {};
  TT.data.words = TT.data.words || {};
  TT.data.words.es = LIST;
})(window.TT = window.TT || {});
