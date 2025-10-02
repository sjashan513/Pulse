import { Stack } from "../../data-structures/stack";
import { SignalObserver } from "./types";
import { Batcher } from "./batch";


export const globalObserversStack = new Stack<SignalObserver>();
export const batcher = new Batcher();