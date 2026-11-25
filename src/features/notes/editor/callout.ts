import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutVariant = "observation" | "concept" | "clinical";

export const CALLOUT_LABELS: Record<CalloutVariant, string> = {
  observation: "Observação",
  concept: "Conceito importante",
  clinical: "Correlação clínica",
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      toggleCallout: (variant: CalloutVariant) => ReturnType;
    };
  }
}

/** A titled block (observação / conceito importante / correlação clínica) that wraps other blocks. */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "observation" as CalloutVariant,
        parseHTML: (element) => {
          const value = element.getAttribute("data-callout");
          return value === "concept" || value === "clinical" ? value : "observation";
        },
        renderHTML: (attributes) => ({ "data-callout": attributes.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const variant = (node.attrs.variant ?? "observation") as CalloutVariant;
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: `atlas-callout atlas-callout-${variant}`, "data-label": CALLOUT_LABELS[variant] }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleCallout:
        (variant) =>
        ({ editor, commands }) => {
          if (editor.isActive(this.name, { variant })) return commands.lift(this.name);
          if (editor.isActive(this.name)) return commands.updateAttributes(this.name, { variant });
          return commands.wrapIn(this.name, { variant });
        },
    };
  },
});
