(() => {
    const CLAVE_GUARDADO = "laspistas-alineaciones-v2";
    const estado = document.getElementById("estado-alineacion");
    const contenedor = document.getElementById("alineaciones");
    const alineaciones = {};
    let jugadorSeleccionado = null;
    let estadisticasTemporada = {};

    fetch("jugadores.json")
        .then(respuesta => {
            if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
            return respuesta.json();
        })
        .then(datos => {
            const jugadores = Array.isArray(datos) ? datos : datos.jugadores;
            if (!Array.isArray(jugadores) || jugadores.length < 7) {
                throw new Error("No hay siete jugadores disponibles en la plantilla.");
            }
            inicializar(jugadores);
            cargarEstadisticasTemporada(jugadores);
        })
        .catch(error => {
            console.error("No se pudo cargar la plantilla:", error);
            estado.textContent = "No se pudo cargar la plantilla. Inténtalo de nuevo más tarde.";
            estado.classList.add("error");
        });

    function leerGuardado() {
        try {
            return JSON.parse(localStorage.getItem(CLAVE_GUARDADO) || "{}");
        } catch {
            return {};
        }
    }

    function guardar() {
        try {
            localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(alineaciones));
        } catch (error) {
            console.warn("No se pudieron guardar las alineaciones:", error);
        }
    }

    function inicializar(jugadores) {
        const listado = [...jugadores].sort((a, b) => Number(a.dorsal) - Number(b.dorsal));
        const guardado = leerGuardado();
        crearAlineacion(listado, "a", "Con posesión", guardado.a || {});
        crearAlineacion(listado, "b", "Sin posesión", guardado.b || {});
        estado.textContent = "Arrastra jugadores a cualquier punto del campo. En móvil, toca un jugador y después el campo.";
        contenedor.hidden = false;
    }

    function cargarEstadisticasTemporada(jugadores) {
        fetchChecked(obtenerUrlEventosTemporadaActual())
            .then(respuesta => respuesta.text())
            .then(csv => {
                const estadisticas = Object.fromEntries(jugadores.map(jugador => [
                    String(jugador.dorsal), { goles: 0, asistencias: 0 }
                ]));
                csvToJSON(csv).forEach(evento => {
                    const goleador = String(evento.dorsal_goleador || "").trim();
                    const asistente = String(evento.dorsal_asistente || "").trim();
                    if (estadisticas[goleador]) estadisticas[goleador].goles++;
                    if (estadisticas[asistente]) estadisticas[asistente].asistencias++;
                });
                estadisticasTemporada = estadisticas;
                contenedor.querySelectorAll(".alineacion-card").forEach(card => {
                    pintarAlineacion(card, [...card._jugadores.values()]);
                });
            })
            .catch(error => console.warn("No se pudieron cargar las estadísticas de esta temporada:", error));
    }

    function crearAlineacion(jugadores, id, titulo, guardado) {
        const card = document.createElement("section");
        card.className = "alineacion-card";
        card.dataset.lineup = id;
        alineaciones[id] = {};
        const jugadoresPorDorsal = new Map(jugadores.map(jugador => [String(jugador.dorsal), jugador]));

        const encabezado = document.createElement("div");
        encabezado.className = "alineacion-card-header";
        const h3 = document.createElement("h3");
        h3.textContent = titulo;
        const limpiar = document.createElement("button");
        limpiar.type = "button";
        limpiar.className = "limpiar-alineacion";
        limpiar.textContent = "Vaciar campo";
        limpiar.addEventListener("click", () => {
            alineaciones[id] = {};
            jugadorSeleccionado = null;
            pintarAlineacion(card, jugadores);
            guardar();
            anunciar(card, "Campo vacío.");
        });
        const acciones = document.createElement("div");
        acciones.className = "alineacion-acciones";
        if (id === "a") {
            const copiar = document.createElement("button");
            copiar.type = "button";
            copiar.className = "copiar-alineacion";
            copiar.textContent = "Copiar al campo sin posesión";
            copiar.addEventListener("click", () => {
                alineaciones.b = JSON.parse(JSON.stringify(alineaciones.a));
                jugadorSeleccionado = null;
                const destino = document.querySelector('.alineacion-card[data-lineup="b"]');
                if (destino) {
                    pintarAlineacion(destino, listadoJugadores(destino));
                    anunciar(destino, "Alineación copiada desde Con posesión.");
                }
                guardar();
                anunciar(card, "Alineación copiada a Sin posesión.");
            });
            acciones.appendChild(copiar);
        }
        acciones.appendChild(limpiar);
        encabezado.append(h3, acciones);

        const espacioTrabajo = document.createElement("div");
        espacioTrabajo.className = "alineacion-workspace";
        const campo = document.createElement("div");
        campo.className = "campo-futbol campo-alineacion";
        campo.setAttribute("aria-label", `Campo de ${titulo}`);
        const panelCampo = document.createElement("div");
        panelCampo.className = "alineacion-campo-panel";
        const jugadoresColocados = document.createElement("div");
        jugadoresColocados.className = "alineacion-jugadores-campo";
        campo.appendChild(jugadoresColocados);
        campo.addEventListener("dragover", evento => {
            evento.preventDefault();
            evento.dataTransfer.dropEffect = "move";
            campo.classList.add("drop-activo");
        });
        campo.addEventListener("dragleave", evento => {
            if (!campo.contains(evento.relatedTarget)) campo.classList.remove("drop-activo");
        });
        campo.addEventListener("drop", evento => {
            evento.preventDefault();
            campo.classList.remove("drop-activo");
            let datos;
            try { datos = JSON.parse(evento.dataTransfer.getData("text/plain")); } catch { return; }
            const rect = campo.getBoundingClientRect();
            const x = Math.max(5, Math.min(95, ((evento.clientX - rect.left) / rect.width) * 100));
            const y = Math.max(4, Math.min(96, ((evento.clientY - rect.top) / rect.height) * 100));
            asignar(id, datos.dorsal, { x, y }, datos.pos, jugadores, card);
        });
        campo.addEventListener("click", evento => {
            if (!jugadorSeleccionado || evento.target.closest(".jugador-en-campo")) return;
            const rect = campo.getBoundingClientRect();
            const x = Math.max(5, Math.min(95, ((evento.clientX - rect.left) / rect.width) * 100));
            const y = Math.max(4, Math.min(96, ((evento.clientY - rect.top) / rect.height) * 100));
            asignar(id, jugadorSeleccionado.dorsal, { x, y }, jugadorSeleccionado.pos, jugadores, card);
        });

        const papelera = document.createElement("div");
        papelera.className = "papelera-alineacion";
        papelera.tabIndex = 0;
        papelera.setAttribute("role", "button");
        papelera.setAttribute("aria-label", "Arrastra aquí a un jugador para quitarlo del campo");
        papelera.title = "Arrastra aquí a un jugador para quitarlo del campo";
        papelera.innerHTML = '<span class="icono-papelera" aria-hidden="true">🗑</span><span>Arrastra aquí para quitar</span>';
        papelera.addEventListener("dragover", evento => {
            evento.preventDefault();
            evento.dataTransfer.dropEffect = "move";
            papelera.classList.add("papelera-activa");
        });
        papelera.addEventListener("dragleave", () => papelera.classList.remove("papelera-activa"));
        papelera.addEventListener("drop", evento => {
            evento.preventDefault();
            papelera.classList.remove("papelera-activa");
            let datos;
            try { datos = JSON.parse(evento.dataTransfer.getData("text/plain")); } catch { return; }
            quitarJugador(id, datos.dorsal, jugadores, card);
        });
        papelera.addEventListener("click", () => {
            if (jugadorSeleccionado?.id === id) quitarJugador(id, jugadorSeleccionado.dorsal, jugadores, card);
        });
        papelera.addEventListener("keydown", evento => {
            if ((evento.key === "Enter" || evento.key === " ") && jugadorSeleccionado?.id === id) {
                evento.preventDefault();
                quitarJugador(id, jugadorSeleccionado.dorsal, jugadores, card);
            }
        });
        panelCampo.append(campo, papelera);

        const banquillo = crearBanquillo(jugadores, id, card);
        espacioTrabajo.append(panelCampo, banquillo);

        const mensaje = document.createElement("p");
        mensaje.className = "alineacion-mensaje";
        mensaje.setAttribute("aria-live", "polite");
        card._mensaje = mensaje;

        card.append(encabezado, espacioTrabajo, mensaje);
        contenedor.appendChild(card);
        card._campo = campo;
        card._jugadoresColocados = jugadoresColocados;
        card._jugadores = jugadoresPorDorsal;
        card._mensaje = mensaje;

        Object.entries(guardado).forEach(([clave, valor], indice) => {
            // Acepta tanto el formato libre actual (dorsal -> coordenadas) como
            // las alineaciones anteriores (posición fija -> dorsal).
            const esFormatoLibre = jugadoresPorDorsal.has(String(clave));
            const dorsal = esFormatoLibre ? String(clave) : String(valor);
            if (!jugadoresPorDorsal.has(dorsal) || alineaciones[id][dorsal]) return;
            const coordenadas = esFormatoLibre && valor && typeof valor === "object"
                ? valor
                : { x: [50, 25, 75, 35, 65, 35, 65][indice % 7], y: [8, 30, 30, 53, 53, 78, 78][indice % 7] };
            alineaciones[id][dorsal] = {
                x: Math.max(5, Math.min(95, Number(coordenadas.x) || 50)),
                y: Math.max(4, Math.min(96, Number(coordenadas.y) || 50))
            };
        });
        pintarAlineacion(card, jugadores);
    }

    function crearBanquillo(jugadores, id, card) {
        const panel = document.createElement("aside");
        panel.className = "alineacion-banquillo";
        const titulo = document.createElement("h4");
        titulo.textContent = "Plantilla";
        const ayuda = document.createElement("p");
        ayuda.className = "banquillo-ayuda";
        ayuda.textContent = "Arrastra hasta 7 jugadores a cualquier punto del campo.";
        const lista = document.createElement("div");
        lista.className = "lista-arrastrable";
        panel.append(titulo, ayuda, lista);

        jugadores.forEach(jugador => {
            const dorsal = String(jugador.dorsal);
            const boton = document.createElement("button");
            boton.type = "button";
            boton.className = "jugador-arrastrable";
            boton.draggable = true;
            boton.dataset.dorsal = dorsal;
            const numero = document.createElement("span");
            numero.className = "jugador-arrastrable-dorsal";
            numero.textContent = dorsal;
            const nombre = document.createElement("span");
            nombre.className = "jugador-arrastrable-nombre";
            nombre.textContent = jugador.alias || jugador.nombre;
            boton.append(numero, nombre);

            boton.addEventListener("click", () => {
                const yaColocado = Object.prototype.hasOwnProperty.call(alineaciones[id], dorsal);
                seleccionarJugador(id, dorsal, yaColocado ? "campo" : null, card);
            });
            boton.addEventListener("dragstart", evento => {
                const posActual = Object.prototype.hasOwnProperty.call(alineaciones[id], dorsal) ? "campo" : null;
                evento.dataTransfer.setData("text/plain", JSON.stringify({ dorsal, pos: posActual }));
                evento.dataTransfer.effectAllowed = "move";
                boton.classList.add("arrastrando");
            });
            boton.addEventListener("dragend", () => boton.classList.remove("arrastrando"));
            lista.appendChild(boton);
        });
        return panel;
    }

    function seleccionarJugador(id, dorsal, pos, card) {
        jugadorSeleccionado = { id, dorsal, pos };
        document.querySelectorAll(".alineacion-card").forEach(elemento => {
            elemento.classList.toggle("tiene-seleccion", elemento.dataset.lineup === id);
            elemento.querySelectorAll(".jugador-arrastrable").forEach(boton => {
                boton.setAttribute("aria-pressed", String(elemento.dataset.lineup === id && boton.dataset.dorsal === dorsal));
            });
        });
        anunciar(card, pos
            ? "Jugador seleccionado. Toca otra posición para moverlo."
            : "Jugador seleccionado. Toca una posición del campo para colocarlo.");
    }

    function asignar(id, dorsal, posDestino, posOrigen, jugadores, card) {
        if (!dorsal || !card || card.dataset.lineup !== id) return;
        const asignacion = alineaciones[id];
        const dorsalJugador = String(dorsal);
        if (!Object.prototype.hasOwnProperty.call(asignacion, dorsalJugador) && Object.keys(asignacion).length >= 7) {
            jugadorSeleccionado = null;
            pintarAlineacion(card, jugadores);
            anunciar(card, "El campo ya tiene siete jugadores. Quita uno antes de añadir otro.");
            return;
        }
        const coordenadas = typeof posDestino === "object" ? posDestino : { x: 50, y: 50 };
        asignacion[dorsalJugador] = {
            x: Math.max(5, Math.min(95, Number(coordenadas.x) || 50)),
            y: Math.max(4, Math.min(96, Number(coordenadas.y) || 50))
        };
        jugadorSeleccionado = null;
        pintarAlineacion(card, jugadores);
        guardar();
        anunciar(card, "Jugador colocado en el campo.");
    }

    function pintarAlineacion(card, jugadores) {
        const id = card.dataset.lineup;
        const asignacion = alineaciones[id];
        const zona = card._jugadoresColocados;
        zona.replaceChildren();
        Object.entries(asignacion).forEach(([dorsal, coordenadas]) => {
            const jugador = jugadores.find(item => String(item.dorsal) === dorsal);
            if (!jugador) return;
            const ficha = document.createElement("div");
            ficha.className = "jugador-en-campo";
            ficha.draggable = true;
            ficha.tabIndex = 0;
            ficha.style.left = `${coordenadas.x}%`;
            ficha.style.top = `${coordenadas.y}%`;
            ficha.setAttribute("aria-label", `${jugador.alias || jugador.nombre}, arrastra para cambiar su posición`);
            const circulo = document.createElement("div");
            circulo.className = "alineacion-circulo";
            const posicion = detectarPosicion(coordenadas);
            const calidad = String(jugador.posiciones?.[posicion] || "").toLocaleLowerCase("es");
            if (["buena", "regular", "mala"].includes(calidad)) circulo.classList.add(`calidad-${calidad}`);
            const nombrePosicion = nombrePosicionCampo(posicion);
            const nombreCalidad = calidad ? `Valoración ${calidad}` : "Sin valoración para esta posición";
            ficha.title = `${nombrePosicion} · ${nombreCalidad}`;
            ficha.setAttribute("aria-label", `${jugador.alias || jugador.nombre}, ${nombrePosicion}. ${nombreCalidad}. Arrastra para cambiar su posición.`);
            const foto = document.createElement("img");
            foto.src = `img/jugadores/${encodeURIComponent(jugador.dorsal)}.jpg`;
            foto.alt = "";
            foto.addEventListener("error", () => foto.remove(), { once: true });
            circulo.appendChild(foto);
            const textoDorsal = document.createElement("span");
            textoDorsal.className = "alineacion-dorsal";
            textoDorsal.textContent = String(jugador.dorsal);
            circulo.appendChild(textoDorsal);
            const alias = document.createElement("span");
            alias.className = "alineacion-alias";
            alias.textContent = jugador.alias || jugador.nombre;
            const estadistica = estadisticasTemporada[dorsal];
            const golesAsistencias = document.createElement("span");
            golesAsistencias.className = "jugador-estadisticas-temporada";
            golesAsistencias.textContent = estadistica
                ? `${estadistica.goles} G ${estadistica.asistencias} A`
                : "… G … A";
            ficha.append(golesAsistencias, circulo, alias);
            ficha.addEventListener("dragstart", evento => {
                evento.stopPropagation();
                evento.dataTransfer.setData("text/plain", JSON.stringify({ dorsal, pos: null }));
                evento.dataTransfer.effectAllowed = "move";
                ficha.classList.add("arrastrando");
            });
            ficha.addEventListener("dragend", () => ficha.classList.remove("arrastrando"));
            ficha.addEventListener("click", evento => evento.stopPropagation());
            ficha.addEventListener("keydown", evento => {
                if ((evento.key === "Delete" || evento.key === "Backspace") && !evento.repeat) {
                    delete asignacion[dorsal];
                    guardar();
                    pintarAlineacion(card, jugadores);
                    anunciar(card, `${jugador.alias || jugador.nombre} vuelve a la plantilla.`);
                }
            });
            zona.appendChild(ficha);
        });
        card.querySelectorAll(".jugador-arrastrable").forEach(boton => {
            boton.classList.toggle("en-campo", Object.prototype.hasOwnProperty.call(asignacion, boton.dataset.dorsal));
            boton.classList.toggle("seleccionado", Boolean(jugadorSeleccionado && jugadorSeleccionado.id === id && jugadorSeleccionado.dorsal === boton.dataset.dorsal));
        });
    }

    function listadoJugadores(card) {
        return [...card._jugadores.values()];
    }

    function quitarJugador(id, dorsal, jugadores, card) {
        if (!dorsal || !card || card.dataset.lineup !== id || !alineaciones[id][String(dorsal)]) {
            if (card) anunciar(card, "Selecciona o arrastra primero a un jugador que esté en el campo.");
            return;
        }
        delete alineaciones[id][String(dorsal)];
        jugadorSeleccionado = null;
        guardar();
        pintarAlineacion(card, jugadores);
        anunciar(card, "Jugador devuelto a la plantilla.");
    }

    function anunciar(card, mensaje) {
        card._mensaje.textContent = mensaje;
    }

    function detectarPosicion({ x, y }) {
        if (y >= 75) return "por";
        const lado = x < 34 ? "i" : x > 66 ? "d" : "c";
        if (y < 25) return `dc${lado}`;
        if (y < 50) return `mc${lado}`;
        return `df${lado}`;
    }

    function nombrePosicionCampo(posicion) {
        const nombres = {
            por: "Portero",
            dfi: "Defensa izquierdo", dfc: "Defensa central", dfd: "Defensa derecho",
            mci: "Medio izquierdo", mcc: "Medio central", mcd: "Medio derecho",
            dci: "Delantero izquierdo", dcc: "Delantero central", dcd: "Delantero derecho"
        };
        return nombres[posicion] || "Posición sin definir";
    }
})();

