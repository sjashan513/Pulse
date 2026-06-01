import { Resource } from "../resource";

/**
 * Contador incremental global que suministra identificadores de identidad reactiva.
 * @internal
 */
let globalObserverId = 0;

/**
 * Genera un identificador numérico único de forma síncrona para registrar un observador.
 * Garantiza que cada observador cuente con una identidad numérica hashable e inmutable.
 * * @returns Un identificador único incremental de tipo `number`.
 * @complexity $O(1)$
 */
export function nextObserverId(): number {
  return ++globalObserverId;
}

/**
 * Contrato de definición para nodos productores dentro del Grafo Acíclico Dirigido (DAG).
 * Representa cualquier entidad reactiva de grano fino que exponga un valor legible y admita suscripciones.
 * * @template T Tipo del valor encapsulado por el nodo reactivo.
 */
export interface Reactive<T> {
  /**
   * Obtiene el valor actual del nodo reactivo, registrando dependencias de forma automática.
   */
  readonly value: T;

  /**
   * Altura topológica del nodo dentro del DAG reactivo.
   * Utilizado por el secuenciador síncrono (`Batcher`) para ordenar las ejecuciones y evitar glitches.
   */
  readonly level: number;

  /**
   * Vincula síncronamente un observador a las actualizaciones de este productor.
   * * @param observer El nodo consumidor (`SignalObserver`) que se va a registrar.
   * @complexity $O(1)$
   */
  subscribe(observer: SignalObserver): void;

  /**
   * Rompe el vínculo de suscripción con un observador, deteniendo la propagación de cambios.
   * * @param observer El nodo consumidor (`SignalObserver`) que se dará de baja.
   * @complexity $O(1)$
   */
  unsubscribe(observer: SignalObserver): void;
}

/**
 * Contrato de definición para nodos consumidores o evaluadores intermedios en el DAG reactivo.
 * Representa entidades secundarias capaces de recalcular su nivel y reaccionar a invalidaciones de estado.
 */
export interface SignalObserver {
  /**
   * Identificador numérico único inmutable del observador asignado en tiempo de construcción.
   * Permite la desuscripción e indexación en tiempo constante $O(1)$ dentro de los mapas de productores.
   */
  readonly id: number;

  /**
   * Nivel de profundidad topológica actual en el grafo.
   * Se evalúa síncronamente como $max(\text{dependencies.level}) + 1$.
   */
  readonly level: number;

  /**
   * Notifica al observador que una de sus dependencias directas ha cambiado de estado.
   * Dependiendo de la primitiva, encola su ejecución en el batcher o propaga una invalidación síncrona.
   */
  notify(): void;

  /**
   * Ejecuta la lógica imperativa interna asociada a este observador.
   * Realiza un aislamiento de contexto dinámico insertando el nodo en la pila global de observadores.
   */
  run(): void;

  /**
   * Declara una dependencia explícita hacia un nodo productor, registrándose en su lista de difusión.
   * * @param reactiveNode El productor reactivo del cual depende este observador.
   */
  trackDependency(reactiveNode: Reactive<unknown>): void;

  /**
   * Desmantela el nodo observador, liberando todas sus dependencias y cancelando su programación.
   */
  dispose(): void;
}

/**
 * Interfaz de control para contenedores de ciclo de vida del grafo (como el contexto Root).
 */
export interface Container {
  /**
   * Añade una primitiva reactiva secundaria al control de ciclo de vida del contenedor.
   * * @param primitive El observador que será recolectado y destruido al liberar el contenedor.
   */
  addPrimitive(primitive: SignalObserver): void;

  /**
   * Destruye recursivamente todas las primitivas y observadores adscritos a este contenedor.
   */
  dispose(): void;
}

/** Firma genérica para closures de efectos reactivos */
export type EffectFn = () => void;

/** Firma genérica para closures de contextos de ejecución */
export type ScopeFn = () => void;

/** Opciones de configuración para solicitudes del cliente HTTP reactivo */
export interface HttpClientOptions extends Omit<RequestInit, 'body'> {
  /** Cuerpo de la solicitud. Si es un objeto, se serializa automáticamente a JSON. */
  body?: any;
}

/** Opciones de configuración específicas para solicitudes HTTP de método GET */
export interface HttpGetOptions extends HttpClientOptions {
  /** Callback reactivo opcional que dispara automáticamente la re-ejecución de la consulta si muta. */
  source?: () => any;
}

/** Contrato de operaciones del cliente HTTP quirúrgico de Pulse */
export interface IHttpClient {
  get<T>(url: string, options?: HttpGetOptions): Resource<T>;
  post<T>(url: string, options?: HttpClientOptions): Promise<T>;
  put<T>(url: string, options?: HttpClientOptions): Promise<T>;
  delete<T>(url: string, options?: HttpClientOptions): Promise<T>;
}

/**
 * Realiza un barrido síncrono y selectivo de referencias muertas dentro de un mapa de observadores.
 * * @remarks
 * Esta función implementa una estrategia de amortización síncrona. No ejecuta ninguna lógica de bucle
 * si el tamaño de la colección es inferior a 16 elementos. Esto evita penalizar la latencia del
 * hilo principal durante ráfagas densas de lectura o escritura en el grafo de grano fino.
 * Cuando se ejecuta, purga las claves cuyos contenedores `WeakRef` apunten a objetos ya
 * recolectados (`.deref() === undefined`) por el Garbage Collector de JavaScript.
 * * @param observersMap El mapa de observadores indexado de un nodo productor.
 * @complexity $O(1)$ amortizado si el mapa es denso; $O(N)$ en el peor de los casos al purgar.
 */
export function amortizedCleanup(observersMap: Map<number, WeakRef<SignalObserver>>): void {
  const totalSize = observersMap.size;
  if (totalSize < 16) return;

  for (const [id, ref] of observersMap.entries()) {
    if (ref.deref() === undefined) {
      observersMap.delete(id);
    }
  }
}