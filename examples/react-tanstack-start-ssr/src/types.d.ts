declare module "virtual:importmap" {
  export const importMap: {
    imports: Record<string, string>;
  };
  export const importMapRaw: string;

  export default importMap;
}
