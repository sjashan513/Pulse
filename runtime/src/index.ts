console.log("Hello from the framework!");

export function createElement(tag: string, props: Record<string, unknown>, ...children: unknown[]) {
  return { tag, props, children };
}

// Example usage
const app = createElement("div", { id: "app" }, "Hello, Framework!");
console.log(app);
