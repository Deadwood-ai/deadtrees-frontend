declare module "utf8" {
  const utf8: {
    decode(input: string): string;
    encode(input: string): string;
  };

  export default utf8;
}

declare module "proj4" {
  const proj4: any;
  export default proj4;
}
