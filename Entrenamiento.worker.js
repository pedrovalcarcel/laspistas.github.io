// ============================================================
// WORKER DE ENTRENAMIENTO DE LA IA
// ============================================================
// Este archivo se ejecuta en un hilo aparte al de la página, así
// que entrenar la red neuronal (que puede tardar un momento) no
// bloquea ni congela la interfaz mientras el usuario navega.
//
// Recibe los ejemplos ya preparados (no hace falta volver a
// calcular clasificaciones ni estadísticas aquí, eso es rápido y
// se hace en el hilo principal) y devuelve el modelo entrenado
// en formato JSON, listo para cargar con redIA.fromJSON(...).

importScripts("https://unpkg.com/brain.js");

self.onmessage = function (evento) {

    const { ejemplos, configRed, opcionesEntrenamiento } = evento.data || {};

    try {

        if (typeof brain === "undefined" || !brain.NeuralNetwork) {
            throw new Error("Brain.js no se pudo cargar en el worker.");
        }

        if (!Array.isArray(ejemplos) || ejemplos.length === 0) {
            throw new Error("No hay ejemplos de entrenamiento.");
        }

        const red = new brain.NeuralNetwork(
            configRed || { activation: "sigmoid", hiddenLayers: [8] }
        );

        const resultado = red.train(
            ejemplos,
            opcionesEntrenamiento || {
                iterations: 3000,
                learningRate: 0.03,
                errorThresh: 0.005,
                shuffle: true
            }
        );

        self.postMessage({
            ok: true,
            modelo: red.toJSON(),
            resultado: {
                iterations: resultado.iterations,
                error: resultado.error
            }
        });

    } catch (error) {

        self.postMessage({
            ok: false,
            error: error && error.message ? error.message : String(error)
        });

    }

};