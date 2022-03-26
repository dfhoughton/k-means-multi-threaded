import * as React from "react"
import { debounce, Slider, Stack, Typography } from "@mui/material"
import { useCallback, useState } from "react"

type SliderProps = {
  label: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (v: number) => void
}

// a slider widget we need several times
export const LabeledSlider: React.FC<SliderProps> = ({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}) => {
  const [n, setN] = useState(value)
  const debouncedChange = useCallback(debounce(onChange, 200), [onChange])
  return (
    <Stack direction="row" spacing={2}>
      <Typography sx={{ fontWeight: "bold" }}>{label}</Typography>
      <Slider
        {...{ min, max, step }}
        value={n}
        marks
        onChange={(_e, n) => {
          const num = n as any as number
          setN(num)
          debouncedChange(num)
        }}
        sx={{ width: "15rem" }}
      />
      <Typography
        sx={{ fontWeight: "bold", minWidth: "2rem", textAlign: "right" }}
      >
        {value}
      </Typography>
    </Stack>
  )
}
