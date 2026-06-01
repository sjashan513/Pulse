import { computed, effect, signal, batch } from './core/reactivity/api';



// 1. Nodos Productores (Nivel 0)
const condition = signal(false);
const data = signal(10);

// 2. Grafo Intermedio
// C_Data: Nivel 1 (Depende de data)
const C_Data = computed(() => {
    console.log("  [Re-calculando] C_Data");
    return data() * 2;
});

// C_Dynamic: Nivel 1 (Depende de condition)
// PERO si condition es true, leerá C_Data, mutando su nivel dinámicamente a 2.
const C_Dynamic = computed(() => {
    console.log("  [Re-calculando] C_Dynamic");
    if (condition()) {
        return C_Data() + 1; // Mutación de topología en vuelo
    }
    return 0;
});

// 3. Nodos Consumidores (Efectos)
let runs = 0;
let init = false;
// Efecto A (Depende de C_Dynamic). Inicialmente Nivel 2.
effect(() => {
    console.log(`[Ejecutando Efecto A] Valor = ${C_Dynamic()}`);
    if (!init) {
        init = true;
        runs++;
        return;
    }
});

// Efecto B (Depende de C_Data). Inicialmente Nivel 2.
effect(() => {
    console.log(`[Ejecutando Efecto B] Valor = ${C_Data()}`);
});

console.log("\n--- INICIANDO TRANSACCIÓN (BATCH) ---");
// 4. La Mutación que rompe el planificador
batch(() => {
    condition.set(true); // Ensucia C_Dynamic (encola Efecto A)
    data.set(20);        // Ensucia C_Data (encola Efecto B)
});
console.log("--- FIN DE TRANSACCIÓN ---");
console.log(`Efecto A ejecutado ${runs} veces (Debería ser 1 en un motor Glitch-Free)`);