import { effect, signal } from './api';
import { createRoot } from './internals/createRoot.api';


// The public interface for what our resource returns.
// Notice these are all read-only functions.
export interface Resource<T> {
    data: () => T | undefined;
    loading: () => boolean;
    error: () => Error | null;
    refetch: () => void;
}

// The type for the developer's data-fetching function.
export type Fetcher<S, T> = (source: S, options: { signal: AbortSignal }) => Promise<T>;

/**
 * Creates a reactive resource that automatically manages the lifecycle of an async operation.
 *
 * @param source A reactive function that returns the source value for the fetcher.
 * @param fetcher An async function that performs the data fetching.
 * @returns A resource object with reactive `data`, `loading`, and `error` states.
 */
export function createResource<S, T>(
    source: () => S,
    fetcher: Fetcher<S, T>
): Resource<T> {

    // 1. THE CONTROL PANEL: Internal signals to hold our state.
    const data = signal<T | undefined>(undefined);
    const loading = signal<boolean>(false);
    const error = signal<Error | null>(null);
    const refetchSignal = signal(0); // A dummy signal to trigger a refetch

    // This effect is our "Mission Director". It's wrapped in createRoot
    // so its entire lifecycle is managed and will be properly disposed of.
    createRoot(dispose => {
        let abortController: AbortController;

        effect(async () => {
            // Read the source value. This creates the subscription.
            const src = source();
            refetchSignal(); // Also subscribe to our refetch trigger

            // 2. MISSION SAFETY: Abort the previous mission before starting a new one.
            if (abortController) {
                abortController.abort();
            }
            // Create a new "kill switch" for the new mission.
            abortController = new AbortController();

            // 3. UPDATE THE STATUS BOARD: Mission has started!
            loading.set(true);
            error.set(null);

            try {
                // 4. LAUNCH THE PROBE: Call the developer's fetcher.
                const result = await fetcher(src, { signal: abortController.signal });

                // Mission Success!
                data.set(result);

            } catch (err: any) {
                // Mission Failure!
                // We must check for AbortError and ignore it.
                if (err.name !== 'AbortError') {
                    error.set(err);
                }
            } finally {
                // Mission is over.
                loading.set(false);
            }
        });
    });

    // 5. THE PUBLIC INTERFACE: Return read-only accessors.
    return {
        data: () => data(),
        loading: () => loading(),
        error: () => error(),
        refetch: () => refetchSignal.set(refetchSignal() + 1),
    };
}
