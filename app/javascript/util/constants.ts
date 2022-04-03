// some things I chose to keep as constants to keep the UI simple

// palette borrowed from http://alumni.media.mit.edu/~wad/color/numbers.html
const COLOR_MAP = {
    red: "rgb(173, 35, 35)",
    ltGreen: "rgb(129, 197, 122)",
    blue: "rgb(42, 75, 215)",
    orange: "rgb(255, 146, 51)",
    green: "rgb(29, 105, 20)",
    black: "rgb(0, 0, 0)",
    purple: "rgb(129, 38, 192)",
    brown: "rgb(129, 74, 25)",
    yellow: "rgb(255, 238, 51)",
    cyan: "rgb(41, 208, 208)",
    pink: "rgb(255, 205, 243)",
    ltBlue: "rgb(157, 175, 255)",
    ltGray: "rgb(160, 160, 160)",
    tan: "rgb(233, 222, 187)",
    dkGray: "rgb(87, 87, 87)",
    white: "rgb(255, 255, 255)",
  } as const
  const REVERSE_COLOR_MAP = Object.fromEntries(
    Object.entries(COLOR_MAP).map(([k, v]) => [v, k])
  )
  export const COLORS = Array.from(Object.values(COLOR_MAP))
  const CONTRASTS = {
    red: "ltGreen",
    ltGreen: "red",
    blue: "orange",
    orange: "blue",
    green: "orange",
    yellow: "green",
    cyan: "brown",
    brown: "cyan",
    tan: "blue",
    black: "red",
    purple: "orange",
    pink: "green",
    ltBlue: "red",
    ltGray: "black",
    dkGray: "orange",
    white: "red",
  } as const
  export const contrasty = (color: string): string =>
    // @ts-ignore
    COLOR_MAP[CONTRASTS[REVERSE_COLOR_MAP[color]]]
  export const WIDTH = 800 as const
  export const HEIGHT = 800 as const
  export const ZOOM = 8 as const
  export const SPLAT_MIN = 5 as const
  export const SPLAT_MAX = 200 as const
  export const PAUSE = 25 as const
  export const MAX_RADIUS = 10 as const