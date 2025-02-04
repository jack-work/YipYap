export type Action = {
  keep: () => Promise<bool>;
  run: (content: string) => Promise<string>;
  shouldrerun: (content: string) => Promise<bool>;
}
export type Order = {
  keybinding: string;
  steps: Action[];
  description: string;
};
export type Menu = { [key: string]: Order; };

