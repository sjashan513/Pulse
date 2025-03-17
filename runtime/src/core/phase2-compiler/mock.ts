import { AstNode, parseHtml, signalGraph } from "../reactivity";
import { SignalObserver } from "../reactivity/internals/types";
import { Effect } from "../reactivity/effect";

const nodeMap: Map<string, HTMLElement | Text> = new Map();

export function defineComponent(config: { render: () => any; [key: string]: any }) {
  const ast = config.render();
  const dom = toDOM(ast, config);
  console.log('DOM:', dom);
  return {
    mount(target: HTMLElement) {
      if (dom) target.appendChild(dom);
    },
  };
}

export function html(strings: TemplateStringsArray, ...values: any[]) {
  const rawHtml = strings.raw[0];
  const ast = parseHtml(rawHtml);
  console.log('AST:', {
    type: ast.type,
    children: (ast as any).children?.map((child: any) => ({
      type: child.type,
      tag: child.tag,
      value: child.value,
      signal: child.signal,
      attributes: child.attributes,
    })),
  });
  return ast;
}

export function css(strings: TemplateStringsArray, ...values: any[]) {
  return strings.raw[0];
} 

function toDOM(ast: AstNode, scope: any): HTMLElement | Text | null {
  if (ast.type === 'fragment') {
    const fragment = document.createDocumentFragment();
    ast.children?.forEach(child => {
      const node = toDOM(child, scope);
      if (node) fragment.appendChild(node);
    });
    return fragment as any;
  }
  if (ast.type === 'text') {
    const textNode = document.createTextNode(ast.value || '');
    if (ast.nodeId) {
      nodeMap.set(ast.nodeId, textNode);
      if (ast.signal) {
        const observer: SignalObserver = {
          notify() {
            const binding = signalGraph.getBindings(ast.signal!).find(b => b.target === ast.nodeId);
            if (binding) {
              textNode.textContent = `${binding.prefix || ''}${scope[ast.signal!].value.toString()}${binding.suffix || ''}`;
            }
          },
          trackDependency(dep) {
            // Not used in this context
          },
        };
        const effect = new Effect(() => {
          observer.notify();
        });
        signalGraph.subscribe(ast.signal, observer);
        effect.run();
      }
    }
    return textNode;
  }
  if (ast.type === 'element') {
    const element = document.createElement(ast.tag || 'div');
    if (ast.nodeId) {
      nodeMap.set(ast.nodeId, element);
      ast.attributes?.forEach(attr => {
        if (attr.signal) {
          const observer: SignalObserver = {
            notify() {
              const binding = signalGraph.getBindings(attr.signal!).find(b => b.target === ast.nodeId);
              if (binding) {
                element.setAttribute(binding.attribute!, scope[attr.signal!].value.toString());
              }
            },
            trackDependency(dep) {
              // Not used in this context
            },
          };
          const effect = new Effect(() => {
            observer.notify();
          });
          signalGraph.subscribe(attr.signal!, observer);
          effect.run();
        } else {
          element.setAttribute(attr.name, attr.value);
        }
      });
    }
    ast.children?.forEach(child => {
      const node = toDOM(child, scope);
      if (node) element.appendChild(node);
    });
    return element;
  }
  return null;
}