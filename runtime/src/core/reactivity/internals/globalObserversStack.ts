import { Stack } from "../../data-structures/stack";
import { SignalObserver } from "./types";


export const globalObserversStack = new Stack<SignalObserver>();