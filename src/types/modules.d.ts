declare module "utf8" {
  const utf8: {
    decode(input: string): string;
    encode(input: string): string;
  };

  export default utf8;
}

declare module "proj4" {
  function proj4(...args: unknown[]): unknown;

  namespace proj4 {
    function defs(name: string): string | undefined;
    function defs(name: string, definition: string): void;
  }
  
  export = proj4;
}
