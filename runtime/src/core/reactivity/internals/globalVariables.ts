import { Stack } from "../../data-structures/stack";
import { Container, SignalObserver } from "./types";
import { Batcher } from "./batch";


export const globalObserversStack = new Stack<SignalObserver>();
export const globalContextStack = new Stack<Container>();
export const batcher = new Batcher();