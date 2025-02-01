export type Action = (content: string) => Promise<string>;
export type Order = {
  keybinding: string;
  steps: Action[];
  description: string;
};
export type Menu = { [key: string]: Order; };

